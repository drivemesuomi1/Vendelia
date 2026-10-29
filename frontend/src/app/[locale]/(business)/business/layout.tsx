import type { ReactNode } from "react";
import { PortalShell } from "@/components/layout/PortalShell";
import { resolveLocale } from "@/i18n/server";
import { requireSession } from "@/lib/session";

export const metadata = { robots: { index: false } };

/** Business portal: merchants only (admins can look too). The API enforces the same rule. */
export default async function BusinessLayout({ children, params }: { children: ReactNode; params: Promise<{ locale: string }> }) {
  const locale = await resolveLocale(params);
  await requireSession(locale, `/${locale}/business`, ["merchant"]);
  return <PortalShell kind="business">{children}</PortalShell>;
}
