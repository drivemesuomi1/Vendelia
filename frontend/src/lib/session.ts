import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import type { Locale, Role, SessionUserDTO } from "@vendelia/shared";
import { serverApi } from "./server-api";

/** The signed-in user, or null. Reads the session cookie through the backend. */
export const getSession = cache(async (): Promise<SessionUserDTO | null> => {
  try {
    const { user } = await serverApi<{ user: SessionUserDTO | null }>("/api/auth/me");
    return user;
  } catch {
    return null;
  }
});

/** General signed-in check; checkout allows every active role, and admin bypasses optional role filters. */
export async function requireSession(locale: Locale, returnTo: string, roles?: Role[]): Promise<SessionUserDTO> {
  const user = await getSession();
  if (!user) redirect(`/${locale}/login?next=${encodeURIComponent(returnTo)}`);
  if (roles && user.role !== "admin" && !roles.includes(user.role)) redirect(`/${locale}`);
  return user;
}

/** Protects customer-only pages and sends authenticated staff to their own portal. */
export async function requireCustomerSession(locale: Locale, returnTo: string): Promise<SessionUserDTO> {
  const user = await getSession();
  if (!user) redirect(`/${locale}/login?next=${encodeURIComponent(returnTo)}`);
  if (user.role === "admin") redirect(`/${locale}/admin`);
  if (user.role === "merchant") redirect(`/${locale}/business`);
  return user;
}
