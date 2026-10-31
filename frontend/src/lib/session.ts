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

/** Redirects to login (and back afterwards) unless the user has one of the roles. Admins pass every check. */
export async function requireSession(locale: Locale, returnTo: string, roles?: Role[]): Promise<SessionUserDTO> {
  const user = await getSession();
  if (!user) redirect(`/${locale}/login?next=${encodeURIComponent(returnTo)}`);
  if (roles && user.role !== "admin" && !roles.includes(user.role)) redirect(`/${locale}`);
  return user;
}
