import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { FastifyInstance } from "fastify";
import { buildApp } from "../../src/app";
import { loadEnv } from "../../src/config/env";

let app: FastifyInstance;
beforeAll(async () => {
  const env = loadEnv({ NODE_ENV: "test", PGLITE_DIR: "memory", DATABASE_URL: "", SEED_ON_START: "true", JOBS_ENABLED: "false" });
  ({ app } = await buildApp({ env, logger: false }));
});
afterAll(async () => { await app.close(); });

describe("fresh database (no fixtures)", () => {
  it("has no deals or merchants, only reference data", async () => {
    const deals = await app.inject({ method: "GET", url: "/api/deals" });
    expect(deals.json().deals).toEqual([]);
    const meta = (await app.inject({ method: "GET", url: "/api/meta" })).json();
    expect(meta.cities.map((c: { id: string }) => c.id)).toEqual(["helsinki", "espoo", "vantaa", "kauniainen"]);
    expect(meta.categories.every((c: { dealCount: number }) => c.dealCount === 0)).toBe(true);
    expect(meta.commissionBps).toBe(1500);
  });
});
