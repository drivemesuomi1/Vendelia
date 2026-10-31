import { readdir, readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { sql } from "../src/db/index.js";

// Applies every file in sql/migrations in name order, each in its own transaction.
// The migrations are idempotent (IF NOT EXISTS), so running this again is safe.
const dir = resolve(dirname(fileURLToPath(import.meta.url)), "../sql/migrations");
try {
  for (const file of (await readdir(dir)).filter((name) => name.endsWith(".sql")).sort()) {
    const text = await readFile(resolve(dir, file), "utf8");
    // Quiet the "already exists, skipping" notices from re-runs.
    await sql.begin((tx) => tx.unsafe(`SET LOCAL client_min_messages = warning;\n${text}`));
    console.log(`applied ${file}`);
  }
} finally {
  await sql.end();
}
