import type { ReactNode } from "react";
import { PortalShell } from "@/components/layout/PortalShell";
import { Icon } from "@/components/ui/Icon";
import { AdminLogin } from "@/features/admin/components/AdminLogin";
import { getT, resolveLocale } from "@/i18n/server";
import { adminConfig, getAdminSession } from "@/lib/admin-auth";
import "@/styles/admin.css";

export const metadata = { title: "Admin", robots: { index: false } };

/**
 * Staff area at /admin. Without an admin session the sign-in form is shown at the same URL.
 * Sign-in is a stop-gap (env-configured admin + signed cookie) until the backend provides real sessions.
 * Screens show demo data until the /api/admin/* endpoints exist.
 */
export default async function AdminLayout({ children, params }: { children: ReactNode; params: Promise<{ locale: string }> }) {
  const locale = await resolveLocale(params);
  const adminEmail = await getAdminSession();
  if (!adminEmail) return <AdminLogin configured={!!adminConfig()} devHint={process.env.NODE_ENV !== "production"} />;

  const t = getT(locale);
  return (
    <PortalShell kind="admin" adminEmail={adminEmail}>
      <p className="demo-bar"><Icon name="info" />{t("admin.demoHint")}</p>
      {children}
    </PortalShell>
  );
}
