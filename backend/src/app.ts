import cors from "@fastify/cors";
import Fastify, { type FastifyError } from "fastify";
import type { Sql } from "postgres";
import { cartQuoteSchema, dealQuerySchema } from "@vendelia/shared";
import { CatalogueRepository } from "./modules/catalogue.js";
import { platformConfig, type PlatformConfig } from "./config.js";

export function buildApp(database: Sql, options: { config?: PlatformConfig; logger?: boolean } = {}) {
  const app = Fastify({ logger: options.logger ?? false });
  const repository = new CatalogueRepository(database);
  const config = options.config ?? platformConfig();
  app.register(cors, { origin: process.env.FRONTEND_URL ?? "http://localhost:3000", credentials: true });
  app.addHook("onSend", async (_request, reply) => { reply.header("cache-control", "no-store"); });
  app.addHook("onClose", async () => { await database.end({ timeout: 5 }); });
  app.setErrorHandler<FastifyError>((error, request, reply) => {
    request.log.error({ err: error }, "API request failed");
    const databaseFailure = typeof error.code === "string" && (
      /^(08|22|23|28|3D|3F|42|53|54|55|57|58|XX)/.test(error.code)
      || /^(CONNECTION_|CONNECT_|ECONN|EHOST|ENET|ENOTFOUND|EAI_|ETIMEDOUT)/.test(error.code)
    );
    const status = error.statusCode && error.statusCode >= 400 && error.statusCode < 500
      ? error.statusCode : databaseFailure ? 503 : 500;
    reply.code(status).send({ error: status < 500 ? "invalid_request" : "service_unavailable", message: "Request could not be completed" });
  });
  app.setNotFoundHandler((_request, reply) => reply.code(404).send({ error: "not_found", message: "Not found" }));

  app.get("/api/health", async () => {
    await database`SELECT 1`;
    return { ok: true, database: "connected" };
  });

  app.get("/api/meta", async () => ({ ...await repository.meta(), ...config }));

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
  return app;
}
