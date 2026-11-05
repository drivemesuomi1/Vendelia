import type { FastifyInstance } from "fastify";
import { checkoutSchema, localeSchema, redeemLookupSchema } from "@vendelia/shared";
import type { OrderService } from "./service";
import type { AuthService } from "../auth/service";
import { sessionToken } from "../auth/config";
import { HttpProblem } from "../../errors";

/** Checkout, order/voucher retrieval and voucher verification. Business rules live in the service. */
export async function orderRoutes(app: FastifyInstance, { service, auth, origins }: { service: OrderService; auth: AuthService; origins: string[] }) {
  app.post("/api/orders", async (request, reply) => {
    const parsed = checkoutSchema.safeParse(request.body);
    if (!parsed.success) {
      const fields: Record<string, string> = {};
      for (const issue of parsed.error.issues) fields[issue.path.join(".")] ??= issue.message;
      return reply.code(400).send({ error: "invalid_request", message: "Invalid checkout details", fields });
    }
    const locale = localeSchema.catch("fi").parse(request.headers["x-locale"]);
    return reply.code(201).send(await service.create(parsed.data, locale));
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

  // Changes a voucher, so a request from another site is refused even with a valid session cookie.
  app.post("/api/merchant/vouchers/redeem", async (request, reply) => {
    if (request.headers.origin && !origins.includes(request.headers.origin)) throw new HttpProblem(403, 'forbidden');
    const user = await auth.current(sessionToken(request.headers.cookie));
    if (!user) throw new HttpProblem(401, 'invalidLogin');
    if (user.role !== 'merchant' || !user.merchant) throw new HttpProblem(403, 'forbidden');
    const parsed = redeemLookupSchema.safeParse(request.body);
    if (!parsed.success) return reply.code(400).send({ error: "invalidVoucherCode", message: "Invalid voucher code" });
    const { redeemed, voucher } = await service.redeemForMerchant(parsed.data.code, user.merchant.id);
    if (!redeemed) return reply.code(409).send({ error: `redeem_${voucher.result}`, message: "Voucher cannot be redeemed", voucher });
    return voucher;
  });
}

const header = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value);
