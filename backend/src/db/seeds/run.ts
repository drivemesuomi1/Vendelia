import { loadEnv } from "../../config/env";
import { connectDb } from "../client";
import { seedDatabase } from "./seed";

/** CLI: npm run db:seed — applies migrations and loads demo data into an empty database. */
const env = loadEnv();
const conn = await connectDb({ databaseUrl: env.DATABASE_URL, pgliteDir: env.PGLITE_DIR });
const result = await seedDatabase(conn.db, { demoPassword: env.DEMO_PASSWORD });
console.log(result.seeded ? "Seeded demo data." : "Database already has data; nothing to do.");
await conn.close();
