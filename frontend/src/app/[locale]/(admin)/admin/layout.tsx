import type { ReactNode } from "react";
import { PortalShell } from "@/components/layout/PortalShell";
import { Notice } from "@/components/ui/Notice";
import { AdminLogin } from "@/features/admin/components/AdminLogin";
import { getT, resolveLocale } from "@/i18n/server";
import { isApiUp } from "@/lib/admin-api";
import { adminConfig, getAdminSession } from "@/lib/admin-auth";

export const metadata = { title: "Admin", robots: { index: false } };

/**
 * Staff area at /admin. Without an admin session the sign-in form is shown at the same URL.
 * Sign-in is a stop-gap (env-configured admin + signed cookie) until the backend provides real sessions.
 */
export default async function AdminLayout({ children, params }: { children: ReactNode; params: Promise<{ locale: string }> }) {
  const locale = await resolveLocale(params);
  const adminEmail = await getAdminSession();
  if (!adminEmail) return <AdminLogin configured={!!adminConfig()} />;

  const t = getT(locale);
  const apiUp = await isApiUp();
  return (
    <PortalShell kind="admin" adminEmail={adminEmail}>
      {!apiUp && (
        <Notice className="mb" tone="warn" icon="info">
          <p>{t("admin.offline")}</p>
        </Notice>
      )}
      {children}
    </PortalShell>
  );
}
