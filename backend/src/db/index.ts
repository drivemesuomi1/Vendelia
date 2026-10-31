import { config } from "dotenv";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";

// Resolve relative to this module so root and workspace commands load the same file.
// Resolve a filesystem path, rather than a new URL that a web bundler may treat as an asset.
config({ path: resolve(dirname(fileURLToPath(import.meta.url)), "../../.env"), quiet: true });
const url = process.env.DATABASE_URL;
if (!url) throw new Error("DATABASE_URL is required");

export const sql = postgres(url, {
  // Supabase requires TLS; DATABASE_SSL=disable is only for a local Postgres during development.
  ssl: process.env.DATABASE_SSL === "disable" ? false : "require", max: 3, connect_timeout: 10, idle_timeout: 10,
  // Also works if the deployment uses Supabase's transaction pooler.
  prepare: false,
});
export const db = drizzle(sql);
