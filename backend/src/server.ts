import cors from "@fastify/cors";
import Fastify from "fastify";

/**
 * Minimal API placeholder. The real backend (modules, database, payments…) is being written by the team.
 * Contract to implement: docs/api/endpoints.md. A complete reference implementation lives on the
 * `backend-reference` git branch.
 */
const app = Fastify({ logger: true });
await app.register(cors, { origin: process.env.FRONTEND_URL ?? "http://localhost:3000", credentials: true });

app.get("/api/health", async () => ({ ok: true }));

await app.listen({ host: process.env.HOST ?? "127.0.0.1", port: Number(process.env.PORT ?? 4000) });
