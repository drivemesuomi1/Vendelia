import path from "node:path";
import Fastify from "fastify";
import cookie from "@fastify/cookie";
import cors from "@fastify/cors";
import multipart from "@fastify/multipart";
import rateLimit from "@fastify/rate-limit";
import fastifyStatic from "@fastify/static";
import type { Env } from "./config/env";
import type { AppContext } from "./context";
import { connectDb, type DbConnection } from "./db/client";
import { seedDemoAccounts, seedReferenceData } from "./db/seeds/seed";
import { createOutboxMailer } from "./integrations/email/mailer";
import { createPaymentProvider } from "./integrations/payments";
import { createYtjRegistry } from "./integrations/prh/ytj";
import { createLocalStorage } from "./integrations/storage/local-storage";
import { registerSessionLoader } from "./middleware/auth";
import { registerErrorHandler } from "./middleware/error-handler";
import { adminRoutes } from "./modules/admin/admin.routes";
import { authRoutes } from "./modules/auth/auth.routes";
import { cartRoutes } from "./modules/cart/cart.routes";
import { dealsRoutes } from "./modules/deals/deals.routes";
import { merchantsRoutes } from "./modules/merchants/merchants.routes";
import { ordersRoutes } from "./modules/orders/orders.routes";
import { paymentsRoutes } from "./modules/payments/payments.routes";
import { payoutsRoutes } from "./modules/payouts/payouts.routes";
import { refundsRoutes } from "./modules/refunds/refunds.routes";
import { usersRoutes } from "./modules/users/users.routes";
import { vouchersRoutes } from "./modules/vouchers/vouchers.routes";

export interface BuildOptions {
  env: Env;
  /** Override pieces for tests (fixed clock, in-memory DB, fake integrations). */
  overrides?: Partial<Pick<AppContext, "now" | "payments" | "registry" | "mailer" | "storage">>;
  logger?: boolean;
}

/** Creates the Fastify app with all plugins, middleware and modules registered. */
export async function buildApp({ env, overrides = {}, logger = true }: BuildOptions) {
  const app = Fastify({
    logger: logger ? { level: env.NODE_ENV === "production" ? "info" : "debug", transport: undefined } : false,
    trustProxy: true,
    bodyLimit: 1_000_000,
  });

  const conn: DbConnection = await connectDb({ databaseUrl: env.DATABASE_URL, pgliteDir: env.PGLITE_DIR });
  app.log.info(`database: ${conn.driver}`);
  if ((await seedReferenceData(conn.db)).seeded) app.log.info("seeded cities, categories and commission");
  if (env.SEED_ON_START && env.NODE_ENV !== "production") {
    if ((await seedDemoAccounts(conn.db, env.DEMO_PASSWORD)).seeded) app.log.info("seeded demo admin and customer accounts");
  }

  const ctx: AppContext = {
    env,
    db: conn.db,
    log: app.log,
    payments: overrides.payments ?? createPaymentProvider(env),
    mailer: overrides.mailer ?? createOutboxMailer(conn.db, app.log, env.EMAIL_FROM),
    storage: overrides.storage ?? createLocalStorage(path.resolve(env.UPLOAD_DIR), env.PUBLIC_UPLOAD_BASE),
    registry: overrides.registry ?? createYtjRegistry(env.PRH_API_BASE),
    now: overrides.now ?? (() => new Date()),
  };

  await app.register(cookie, { secret: env.SESSION_SECRET });
  await app.register(cors, { origin: env.FRONTEND_URL, credentials: true });
  await app.register(rateLimit, { max: 300, timeWindow: "1 minute" });
  await app.register(multipart, { limits: { fileSize: 5 * 1024 * 1024, files: 1 } });
  await app.register(fastifyStatic, { root: path.resolve(env.UPLOAD_DIR), prefix: "/uploads/", decorateReply: false });

  registerErrorHandler(app);
  registerSessionLoader(app, ctx);

  app.get("/api/health", async () => ({ ok: true, db: conn.driver, payments: ctx.payments.name }));

  for (const register of [
    dealsRoutes,
    cartRoutes,
    ordersRoutes,
    paymentsRoutes,
    vouchersRoutes,
    refundsRoutes,
    merchantsRoutes,
    payoutsRoutes,
    authRoutes,
    usersRoutes,
    adminRoutes,
  ]) {
    register(app, ctx);
  }

  app.addHook("onClose", async () => conn.close());
  return { app, ctx };
}
