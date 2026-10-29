import { mkdirSync } from "node:fs";
import { buildApp } from "./app";
import { loadEnv } from "./config/env";
import { startScheduler } from "./jobs/scheduler";

const env = loadEnv();
mkdirSync(env.UPLOAD_DIR, { recursive: true });

const { app, ctx } = await buildApp({ env });
const stopJobs = env.JOBS_ENABLED ? startScheduler(ctx) : () => {};

for (const signal of ["SIGINT", "SIGTERM"] as const) {
  process.on(signal, async () => {
    stopJobs();
    await app.close();
    process.exit(0);
  });
}

await app.listen({ host: env.HOST, port: env.PORT });
