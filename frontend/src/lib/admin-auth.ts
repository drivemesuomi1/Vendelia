import "server-only";
import { getSession } from "./session";
import { serverApi } from "./server-api";

export async function adminConfigured(): Promise<boolean> {
  try { return (await serverApi<{ configured: boolean }>("/api/auth/config")).configured; }
  catch { return false; }
}

/** Rechecks the database-backed session and active admin profile on every call. */
export async function getAdminSession(): Promise<string | null> {
  const user = await getSession();
  return user?.role === "admin" ? user.email : null;
}
