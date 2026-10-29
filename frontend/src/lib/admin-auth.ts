import "server-only";
import { cookies } from "next/headers";
import { ADMIN_COOKIE, verifyToken } from "./admin-token";

/** Admin identity configured through environment variables (see frontend/.env.example). Null when not configured. */
export function adminConfig() {
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
