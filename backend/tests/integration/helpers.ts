import type { FastifyInstance, InjectOptions } from "fastify";
import { buildApp } from "../../src/app";
import { loadEnv } from "../../src/config/env";
import type { AppContext } from "../../src/context";
import { DEMO_ACCOUNTS } from "../../src/db/seeds/seed";
import type { Mailer } from "../../src/integrations/email/mailer";
import { loadFixtures } from "../fixtures/load-fixtures";

export const DEMO_PASSWORD = "test-password-123";

/** Fresh app with an in-memory database, test fixtures (fictional merchants and deals), a controllable clock and a captured mailbox. */
export async function createTestApp() {
  let now = new Date(Date.UTC(2026, 9, 14, 10, 0, 0));
  const sent: { to: string; subject: string; template: string }[] = [];
  const mailer: Mailer = { async send(m) { sent.push(m); } };
  const env = loadEnv({ NODE_ENV: "test", PGLITE_DIR: "memory", DATABASE_URL: "", SEED_ON_START: "true", DEMO_PASSWORD, JOBS_ENABLED: "false" });
  const { app, ctx } = await buildApp({
    env,
    logger: false,
    overrides: { now: () => now, mailer, registry: { lookup: async (id) => ({ businessId: id, name: "Testi Oy" }) } },
  });
  await loadFixtures(ctx.db, { password: DEMO_PASSWORD, customerEmail: DEMO_ACCOUNTS.customer, now });
  return {
    app,
    ctx: ctx as AppContext,
    sent,
    setNow: (d: Date) => { now = d; },
    advanceDays: (n: number) => { now = new Date(now.getTime() + n * 86_400_000); },
  };
}

/** Small cookie-keeping client around app.inject. */
export function client(app: FastifyInstance) {
  let cookie = "";
  async function call(method: InjectOptions["method"], url: string, body?: unknown, headers: Record<string, string> = {}) {
    const res = await app.inject({ method, url, payload: body as InjectOptions["payload"], headers: { ...(cookie ? { cookie } : {}), ...headers } });
    const set = res.headers["set-cookie"];
    if (set) cookie = (Array.isArray(set) ? set : [set]).map((c) => c.split(";")[0]).join("; ");
    return { status: res.statusCode, body: res.body ? JSON.parse(res.body) : null };
  }
  return {
    get: (url: string, headers?: Record<string, string>) => call("GET", url, undefined, headers),
    post: (url: string, body?: unknown, headers?: Record<string, string>) => call("POST", url, body ?? {}, headers),
    put: (url: string, body?: unknown) => call("PUT", url, body),
    login: (email: string, password = DEMO_PASSWORD) => call("POST", "/api/auth/login", { email, password }),
  };
}
