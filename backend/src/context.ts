import type { FastifyBaseLogger } from "fastify";
import type { Env } from "./config/env";
import type { Db } from "./db/client";
import type { Mailer } from "./integrations/email/mailer";
import type { PaymentProvider } from "./integrations/payments";
import type { CompanyRegistry } from "./integrations/prh/ytj";
import type { FileStorage } from "./integrations/storage/local-storage";

/**
 * Everything a service needs, passed explicitly (no globals).
 * Tests build their own context with an in-memory DB and a fixed clock.
 */
export interface AppContext {
  env: Env;
  db: Db;
  log: FastifyBaseLogger;
  payments: PaymentProvider;
  mailer: Mailer;
  storage: FileStorage;
  registry: CompanyRegistry;
  now: () => Date;
}
