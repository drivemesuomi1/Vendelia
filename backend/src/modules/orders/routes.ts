import type { FastifyInstance, FastifyReply } from "fastify";
import { checkoutSchema, demoAccountEnabled, localeSchema, redeemLookupSchema } from "@vendelia/shared";
import type { OrderService } from "./service";
import type { AuthService } from "../auth/service";
import { sessionToken } from "../auth/config";
import { HttpProblem } from "../../errors";

/** Checkout, order/voucher retrieval and voucher verification. Business rules live in the service. */
export async function orderRoutes(app: FastifyInstance, { service, auth, origins }: { service: OrderService; auth: AuthService; origins: string[] }) {
  app.post("/api/orders", async (request, reply) => {
    if (request.headers.origin && !origins.includes(request.headers.origin)) throw new HttpProblem(403, 'forbidden');
    const parsed = checkoutSchema.safeParse(request.body);
    if (!parsed.success) {
      const fields: Record<string, string> = {};
      for (const issue of parsed.error.issues) fields[issue.path.join(".")] ??= issue.message;
      return reply.code(400).send({ error: "invalid_request", message: "Invalid checkout details", fields });
    }
    const locale = localeSchema.catch("fi").parse(request.headers["x-locale"]);
    const user = await auth.current(sessionToken(request.headers.cookie));
    return reply.code(201).send(await service.create(parsed.data, locale, user?.id ?? null));
  });

  app.get<{ Params: { id: string } }>("/api/orders/:id", async (request, reply) => {
    const order = await service.get(request.params.id, header(request.headers["x-order-token"]));
    return order ?? reply.code(404).send({ error: "not_found", message: "Order not found" });
  });

  app.get<{ Params: { id: string } }>("/api/orders/:id/pdf", async (request, reply) => {
    const pdf = await service.pdf(request.params.id, header(request.headers["x-order-token"]));
    if (!pdf) return reply.code(404).send({ error: "not_found", message: "Order not found" });
    return reply.type("application/pdf")
      .header("content-disposition", `attachment; filename="${pdf.filename}"`)
      .send(Buffer.from(pdf.bytes));
  });

  // One voucher's PDF for the signed-in customer who bought it.
  app.get<{ Params: { code: string } }>("/api/me/vouchers/:code/pdf", async (request, reply) => {
    const user = await auth.current(sessionToken(request.headers.cookie));
    if (!user) throw new HttpProblem(401, "invalidLogin");
    const pdf = await service.customerVoucherPdf(user, request.params.code);
    if (!pdf) throw new HttpProblem(404, "voucher_not_found");
    return sendPdf(reply, pdf);
  });

  // Sample vouchers for the demo account page; only when the demo account is switched on.
  if (demoAccountEnabled(process.env)) {
    app.get<{ Params: { code: string }; Querystring: { locale?: string } }>("/api/demo/vouchers/:code/pdf", async (request, reply) => {
      const pdf = await service.demoVoucherPdf(request.params.code, localeSchema.catch("fi").parse(request.query.locale));
      if (!pdf) throw new HttpProblem(404, "voucher_not_found");
      return sendPdf(reply, pdf);
    });
  }

  // Public check behind the voucher's QR code: validity only, no customer details.
  app.get<{ Params: { code: string } }>("/api/vouchers/:code", async (request) => service.lookup(request.params.code));

  app.post("/api/merchant/vouchers/lookup", async (request, reply) => {
    const user = await auth.current(sessionToken(request.headers.cookie));
    if (!user) throw new HttpProblem(401, 'invalidLogin');
    if (user.role !== 'merchant' || !user.merchant) throw new HttpProblem(403, 'forbidden');
    const parsed = redeemLookupSchema.safeParse(request.body);
    if (!parsed.success) return reply.code(400).send({ error: "invalidVoucherCode", message: "Invalid voucher code" });
    return service.lookupForMerchant(parsed.data.code, user.merchant.id);
  });

  app.get('/api/merchant/payouts', async request => {
    const user = await auth.current(sessionToken(request.headers.cookie));
    if (!user) throw new HttpProblem(401, 'invalidLogin');
    if (user.role !== 'merchant' || !user.merchant) throw new HttpProblem(403, 'forbidden');
    return service.merchantPayoutPreview(user.merchant.id);
  });

  // Admin order, refund and voucher views; /api/admin/* is guarded by the app-wide admin hook.
  app.get("/api/admin/orders", async () => ({ orders: await service.adminOrders() }));
  app.get('/api/admin/refunds', async () => service.adminRefunds());
  app.get<{ Querystring: { test?: string } }>('/api/admin/finance', async (request) => service.adminFinance(request.query.test === '1'));
  app.post('/api/admin/refunds', async (request, reply) => {
    const parsed = redeemLookupSchema.safeParse(request.body);
    if (!parsed.success) return reply.code(400).send({ error: 'invalidVoucherCode', message: 'Invalid voucher code' });
    return { voucher: await service.refundForAdmin(parsed.data.code) };
  });

  app.get<{ Querystring: { view?: string } }>("/api/admin/vouchers", async (request) => {
    const view = request.query.view === "used" || request.query.view === "refunded" ? request.query.view : "bought";
    return { vouchers: await service.adminVouchers(view) };
  });
  app.get<{ Params: { code: string } }>("/api/admin/vouchers/:code", async (request) => {
    const voucher = await service.adminVoucher(request.params.code);
    if (!voucher) throw new HttpProblem(404, "voucher_not_found");
    return { voucher };
  });

  app.post('/api/admin/vouchers/redeem', async (request, reply) => {
    // Also guarded by the app-wide admin/origin hook; derive attribution from the session.
    const user = await auth.current(sessionToken(request.headers.cookie));
    if (!user) throw new HttpProblem(401, 'invalidLogin');
    if (user.role !== 'admin') throw new HttpProblem(403, 'forbidden');
    const parsed = redeemLookupSchema.safeParse(request.body);
    if (!parsed.success) return reply.code(400).send({ error: 'invalidVoucherCode', message: 'Invalid voucher code' });
    return { voucher: await service.redeemForAdmin(parsed.data.code, user.id) };
  });

  // Changes a voucher, so a request from another site is refused even with a valid session cookie.
  app.post("/api/merchant/vouchers/redeem", async (request, reply) => {
    if (request.headers.origin && !origins.includes(request.headers.origin)) throw new HttpProblem(403, 'forbidden');
    const user = await auth.current(sessionToken(request.headers.cookie));
    if (!user) throw new HttpProblem(401, 'invalidLogin');
    if (user.role !== 'merchant' || !user.merchant) throw new HttpProblem(403, 'forbidden');
    const parsed = redeemLookupSchema.safeParse(request.body);
    if (!parsed.success) return reply.code(400).send({ error: "invalidVoucherCode", message: "Invalid voucher code" });
    const { redeemed, voucher } = await service.redeemForMerchant(parsed.data.code, user.merchant.id, user.id);
    if (!redeemed) return reply.code(409).send({ error: `redeem_${voucher.result}`, message: "Voucher cannot be redeemed", voucher });
    return voucher;
  });
}

const header = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value);

function sendPdf(reply: FastifyReply, pdf: { bytes: Uint8Array; filename: string }) {
  return reply.type("application/pdf")
    .header("content-disposition", `attachment; filename="${pdf.filename}"`)
    .send(Buffer.from(pdf.bytes));
}
