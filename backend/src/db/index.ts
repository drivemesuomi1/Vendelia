import { config } from "dotenv";
import { fileURLToPath } from "node:url";
import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";

// Resolve relative to this module so root and workspace commands load the same file.
config({ path: fileURLToPath(new URL("../../.env", import.meta.url)), quiet: true });
const url = process.env.DATABASE_URL;
if (!url) throw new Error("DATABASE_URL is required");

export const sql = postgres(url, {
  ssl: "require", max: 10, connect_timeout: 10, idle_timeout: 20,
  // Also works if the deployment uses Supabase's transaction pooler.
  prepare: false,
});
export const db = drizzle(sql);
