import type { FastifyInstance } from "fastify";
import { checkoutSchema, localeSchema, redeemLookupSchema } from "@vendelia/shared";
import type { OrderService } from "./service";

/** Checkout, order/voucher retrieval and voucher verification. Business rules live in the service. */
export async function orderRoutes(app: FastifyInstance, { service }: { service: OrderService }) {
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
    const parsed = redeemLookupSchema.safeParse(request.body);
    if (!parsed.success) return reply.code(400).send({ error: "invalidVoucherCode", message: "Invalid voucher code" });
    return service.lookup(parsed.data.code);
  });

  // Marking a voucher used must be limited to the voucher's own merchant, which needs merchant sign-in.
  app.post("/api/merchant/vouchers/redeem", async (_request, reply) =>
    reply.code(501).send({ error: "redeemUnavailable", message: "Redemption requires merchant sign-in" }));
}

const header = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value);
