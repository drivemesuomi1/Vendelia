import "dotenv/config";
import { z } from "zod";

const bool = z
  .enum(["true", "false", "1", "0"])
  .transform((v) => v === "true" || v === "1");

const envSchema = z
  .object({
    NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
    HOST: z.string().default("127.0.0.1"),
    PORT: z.coerce.number().int().default(4000),
    /** Postgres connection string. Leave empty to use the embedded PGlite database (local dev). */
    DATABASE_URL: z.string().optional().default(""),
    /** Folder for the embedded database. "memory" keeps it in RAM (tests). */
    PGLITE_DIR: z.string().default(".data/pglite"),
    FRONTEND_URL: z.string().url().default("http://localhost:3000"),
    /** Public base URL used when building links to uploaded files. */
    PUBLIC_UPLOAD_BASE: z.string().default("/uploads"),
    UPLOAD_DIR: z.string().default("uploads"),
    SESSION_SECRET: z.string().min(16).default("dev-only-insecure-session-secret"),
    SESSION_DAYS: z.coerce.number().int().positive().default(30),
    PAYMENT_PROVIDER: z.enum(["mock", "stripe"]).default("mock"),
    STRIPE_SECRET_KEY: z.string().optional().default(""),
    EMAIL_FROM: z.string().default("Vendelia <noreply@vendelia.fi>"),
    JOBS_ENABLED: bool.default("true"),
    SEED_ON_START: bool.default("true"),
    /** Password for the seeded demo accounts (local/dev only). */
    DEMO_PASSWORD: z.string().min(8).default("vendelia-demo"),
    PRH_API_BASE: z.string().url().default("https://avoindata.prh.fi/opendata-ytj-api/v3"),
  })
  .superRefine((env, ctx) => {
    if (env.NODE_ENV === "production" && env.SESSION_SECRET.startsWith("dev-only")) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["SESSION_SECRET"], message: "Set a real SESSION_SECRET in production" });
    }
    if (env.PAYMENT_PROVIDER === "stripe" && !env.STRIPE_SECRET_KEY) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["STRIPE_SECRET_KEY"], message: "Required when PAYMENT_PROVIDER=stripe" });
    }
  });

export type Env = z.infer<typeof envSchema>;

export function loadEnv(overrides: Partial<Record<keyof Env, string>> = {}): Env {
  const parsed = envSchema.safeParse({ ...process.env, ...overrides });
  if (!parsed.success) {
    const issues = parsed.error.issues.map((i) => `  ${i.path.join(".")}: ${i.message}`).join("\n");
    throw new Error(`Invalid environment configuration:\n${issues}`);
  }
  return parsed.data;
}
