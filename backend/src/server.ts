import { sql } from "./db/index.js";
import { buildApp } from "./app.js";
import { isIP } from "node:net";

const app = buildApp(sql, { logger: true });
for (const signal of ["SIGINT", "SIGTERM"] as const) {
  process.once(signal, () => { void app.close(); });
}
try {
  // Some shells export HOST as the machine name. Do not let that change the bind address.
  const host = process.env.API_HOST ?? (isIP(process.env.HOST ?? "") ? process.env.HOST! : "127.0.0.1");
  await app.listen({ host, port: Number(process.env.PORT ?? 4000) });
} catch (error) {
  app.log.error(error);
  await app.close();
  process.exitCode = 1;
}
