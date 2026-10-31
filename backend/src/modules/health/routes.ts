import type { FastifyInstance } from "fastify";
import type { Sql } from "postgres";

export async function healthRoutes(app: FastifyInstance, { database }: { database: Sql }) {
  app.get("/api/health", async () => {
    await database`SELECT 1`;
    return { ok: true, database: "connected" };
  });
}
