import { mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { PGlite } from "@electric-sql/pglite";
import { drizzle as drizzlePglite } from "drizzle-orm/pglite";
import { migrate as migratePglite } from "drizzle-orm/pglite/migrator";
import { drizzle as drizzlePg } from "drizzle-orm/node-postgres";
import { migrate as migratePg } from "drizzle-orm/node-postgres/migrator";
import type { PgDatabase, PgQueryResultHKT } from "drizzle-orm/pg-core";
import pg from "pg";
import * as schema from "./schema";

export type Db = PgDatabase<PgQueryResultHKT, typeof schema>;
/** A db handle or an open transaction — repositories accept either. */
export type DbOrTx = Db | Parameters<Parameters<Db["transaction"]>[0]>[0];

export interface DbConnection {
  db: Db;
  driver: "postgres" | "pglite";
  close: () => Promise<void>;
}

const migrationsFolder = fileURLToPath(new URL("./migrations", import.meta.url));

/**
 * Connects to Postgres when DATABASE_URL is set, otherwise starts an embedded
 * PGlite database (real Postgres compiled to WASM) so local dev needs no install.
 * Migrations are applied on connect.
 */
export async function connectDb(opts: { databaseUrl?: string; pgliteDir?: string }): Promise<DbConnection> {
  if (opts.databaseUrl) {
    const pool = new pg.Pool({ connectionString: opts.databaseUrl });
    const db = drizzlePg(pool, { schema });
    await migratePg(db, { migrationsFolder });
    return { db: db as unknown as Db, driver: "postgres", close: () => pool.end() };
  }

  const dir = opts.pgliteDir ?? "memory";
  let client: PGlite;
  if (dir === "memory") {
    client = new PGlite();
  } else {
    mkdirSync(dir, { recursive: true });
    client = new PGlite(dir);
  }
  const db = drizzlePglite(client, { schema });
  await migratePglite(db, { migrationsFolder });
  return { db: db as unknown as Db, driver: "pglite", close: () => client.close() };
}
