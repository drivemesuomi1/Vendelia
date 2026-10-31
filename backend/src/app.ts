import cors from "@fastify/cors";
import Fastify, { type FastifyError } from "fastify";
import type { Sql } from "postgres";
import { cartQuoteSchema, checkoutSchema, dealQuerySchema, localeSchema, redeemLookupSchema } from "@vendelia/shared";
import { CatalogueRepository } from "./modules/catalogue";
import { HttpProblem, OrderService } from "./modules/orders";
import { createMailer, type Mailer } from "./modules/vouchers/mailer";
import { orderConfig, platformConfig, type OrderConfig, type PlatformConfig } from "./config";

export function buildApp(database: Sql, options: {
  config?: PlatformConfig; orders?: OrderConfig; mailer?: Mailer; logger?: boolean;
} = {}) {
  const app = Fastify({ logger: options.logger ?? false });
  const repository = new CatalogueRepository(database);
  const config = options.config ?? platformConfig();
  const ordersConfig = options.orders ?? orderConfig();
  const orders = new OrderService(database, repository, config, ordersConfig, options.mailer ?? createMailer(ordersConfig.mail));
  app.register(cors, { origin: process.env.FRONTEND_URL ?? "http://localhost:3000", credentials: true });
  app.addHook("onSend", async (_request, reply) => { reply.header("cache-control", "no-store"); });
  app.addHook("onClose", async () => { await database.end({ timeout: 5 }); });
  app.setErrorHandler<FastifyError>((error, request, reply) => {
    if (error instanceof HttpProblem) {
      return reply.code(error.statusCode).send({ error: error.code, message: "Request could not be completed" });
    }
    request.log.error({ err: error }, "API request failed");
    const databaseFailure = typeof error.code === "string" && (
      /^(08|22|23|28|3D|3F|42|53|54|55|57|58|XX)/.test(error.code)
      || /^(CONNECTION_|CONNECT_|ECONN|EHOST|ENET|ENOTFOUND|EAI_|ETIMEDOUT)/.test(error.code)
    );
    const status = error.statusCode && error.statusCode >= 400 && error.statusCode < 500
      ? error.statusCode : databaseFailure ? 503 : 500;
    // The Fastify logger is off inside Next.js, so server errors are written to the function log here.
    if (status >= 500 && !options.logger) console.error(`API ${request.method} ${request.url} failed:`, error.code ?? "", error.message);
    reply.code(status).send({ error: status < 500 ? "invalid_request" : "service_unavailable", message: "Request could not be completed" });
  });
  app.setNotFoundHandler((_request, reply) => reply.code(404).send({ error: "not_found", message: "Not found" }));

  app.get("/api/health", async () => {
    await database`SELECT 1`;
    return { ok: true, database: "connected" };
  });

  app.get("/api/meta", async () => ({ ...await repository.meta(), ...config, paymentBypass: ordersConfig.paymentBypass }));

  app.get("/api/deals", async (request, reply) => {
    const parsed = dealQuerySchema.safeParse(request.query);
    if (!parsed.success) return reply.code(400).send({ error: "invalid_request", message: "Invalid deal filters" });
    return { deals: await repository.list(parsed.data) };
  });

  app.get<{ Params: { slug: string } }>("/api/deals/:slug", async (request, reply) => {
    const deal = await repository.detail(request.params.slug);
    return deal ?? reply.code(404).send({ error: "not_found", message: "Deal not found" });
  });

  app.post("/api/cart/quote", async (request, reply) => {
    const parsed = cartQuoteSchema.safeParse(request.body);
    if (!parsed.success) return reply.code(400).send({ error: "invalid_request", message: "Invalid cart items" });
    return repository.quote(parsed.data.items);
  });

  app.post("/api/orders", async (request, reply) => {
    const parsed = checkoutSchema.safeParse(request.body);
    if (!parsed.success) {
      const fields: Record<string, string> = {};
      for (const issue of parsed.error.issues) fields[issue.path.join(".")] ??= issue.message;
      return reply.code(400).send({ error: "invalid_request", message: "Invalid checkout details", fields });
    }
    const locale = localeSchema.catch("fi").parse(request.headers["x-locale"]);
    return reply.code(201).send(await orders.create(parsed.data, locale));
  });

  app.get<{ Params: { id: string } }>("/api/orders/:id", async (request, reply) => {
    const order = await orders.get(request.params.id, header(request.headers["x-order-token"]));
    return order ?? reply.code(404).send({ error: "not_found", message: "Order not found" });
  });

  app.get<{ Params: { id: string } }>("/api/orders/:id/pdf", async (request, reply) => {
    const pdf = await orders.pdf(request.params.id, header(request.headers["x-order-token"]));
    if (!pdf) return reply.code(404).send({ error: "not_found", message: "Order not found" });
    return reply.type("application/pdf")
      .header("content-disposition", `attachment; filename="${pdf.filename}"`)
      .send(Buffer.from(pdf.bytes));
  });

  // Public check behind the voucher's QR code: validity only, no customer details.
  app.get<{ Params: { code: string } }>("/api/vouchers/:code", async (request) => orders.lookup(request.params.code));

  app.post("/api/merchant/vouchers/lookup", async (request, reply) => {
    const parsed = redeemLookupSchema.safeParse(request.body);
    if (!parsed.success) return reply.code(400).send({ error: "invalidVoucherCode", message: "Invalid voucher code" });
    return orders.lookup(parsed.data.code);
  });

  // Marking a voucher used must be limited to the voucher's own merchant, which needs merchant sign-in.
  app.post("/api/merchant/vouchers/redeem", async (_request, reply) =>
    reply.code(501).send({ error: "redeemUnavailable", message: "Redemption requires merchant sign-in" }));
  return app;
}

const header = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value);
