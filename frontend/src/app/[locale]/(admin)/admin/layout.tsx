import type { ReactNode } from "react";
import { PortalShell } from "@/components/layout/PortalShell";
import { resolveLocale } from "@/i18n/server";
import { requireSession } from "@/lib/session";

export const metadata = { robots: { index: false } };

/** Vendelia staff area. Admin role only; the API checks the role on every request too. */
export default async function AdminLayout({ children, params }: { children: ReactNode; params: Promise<{ locale: string }> }) {
  const locale = await resolveLocale(params);
  await requireSession(locale, `/${locale}/admin`, ["admin"]);
  return <PortalShell kind="admin">{children}</PortalShell>;
}
