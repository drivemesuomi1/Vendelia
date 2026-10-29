import { loadEnv } from "../../config/env";
import { connectDb } from "../client";
import { seedDemoAccounts, seedReferenceData } from "./seed";

/** CLI: npm run db:seed — applies migrations, reference data and (outside production) the demo accounts. */
const env = loadEnv();
const conn = await connectDb({ databaseUrl: env.DATABASE_URL, pgliteDir: env.PGLITE_DIR });
const ref = await seedReferenceData(conn.db);
const demo = env.NODE_ENV === "production" ? { seeded: false } : await seedDemoAccounts(conn.db, env.DEMO_PASSWORD);
console.log(`Reference data: ${ref.seeded ? "added" : "already present"}. Demo accounts: ${demo.seeded ? "added" : "skipped"}.`);
await conn.close();
