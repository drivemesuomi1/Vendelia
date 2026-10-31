import "server-only";
import { cookies } from "next/headers";
import { ADMIN_COOKIE, verifyToken } from "./admin-token";

/**
 * Temporary development login: username "123", password "123". Only active outside production builds
 * (`next dev`); Vercel production and preview builds ignore it and use the environment variables below.
 * Remove when real admin accounts exist.
 */
const DEV_ADMIN = {
  email: "123",
  passwordHash: "scrypt$nKunJhexSWfbOxXmdFnVVA==$ERhOK0kPbAiAB7Jrfy3NRsIPRIRppg0Jxg1Pmcd6cBOtR7IJnCGz3FYIafJRM333Z0bMx/VOTGJgKzJZ46EHyw==",
  secret: "dev-only-admin-session-secret-not-for-production",
};

/** Admin identity configured through environment variables (see frontend/.env.example). Null when not configured. */
export function adminConfig() {
  if (process.env.NODE_ENV !== "production") return DEV_ADMIN;
  const email = (process.env.ADMIN_EMAIL ?? "").trim().toLowerCase();
  const passwordHash = process.env.ADMIN_PASSWORD_HASH ?? "";
  const secret = process.env.ADMIN_SESSION_SECRET ?? "";
  if (!email || !passwordHash || secret.length < 32) return null;
  return { email, passwordHash, secret };
}

/** The signed-in admin's email, or null. */
export async function getAdminSession(): Promise<string | null> {
  const cfg = adminConfig();
  if (!cfg) return null;
  const token = (await cookies()).get(ADMIN_COOKIE)?.value;
  return verifyToken(token, cfg.secret, cfg.email);
}
