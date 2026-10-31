import cors from "@fastify/cors";
import Fastify, { type FastifyError } from "fastify";
import type { Sql } from "postgres";
import { CatalogueRepository } from "./modules/catalogue/repository";
import { CatalogueService } from "./modules/catalogue/service";
import { catalogueRoutes } from "./modules/catalogue/routes";
import { healthRoutes } from "./modules/health/routes";
import { platformConfig, type PlatformConfig } from "./config";

export function buildApp(database: Sql, options: { config?: PlatformConfig; logger?: boolean } = {}) {
  const app = Fastify({ logger: options.logger ?? false });
  const repository = new CatalogueRepository(database);
  const config = options.config ?? platformConfig();
  const service = new CatalogueService(repository, config);
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

  app.register(healthRoutes, { database });
  app.register(catalogueRoutes, { service });
  return app;
}
