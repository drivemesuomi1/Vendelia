import type { ReactNode } from "react";
import { PortalShell } from "@/components/layout/PortalShell";
import { Icon } from "@/components/ui/Icon";
import { AdminLogin } from "@/features/admin/components/AdminLogin";
import { getT, resolveLocale } from "@/i18n/server";
import { adminConfigured, getAdminSession } from "@/lib/admin-auth";
import { portalClass } from "@/lib/portal-fonts";
import "@/styles/portal.css";

export const metadata = { title: "Admin", robots: { index: false } };

/**
 * Staff area at /admin: manage businesses (and their sign-in details) and review the deals they submit.
 * Without an active database-backed admin session the sign-in form is shown at the same URL.
 */
export default async function AdminLayout({ children, params }: { children: ReactNode; params: Promise<{ locale: string }> }) {
  const locale = await resolveLocale(params);
  const admin = await getAdminSession();
  if (!admin) {
    return (
      <div className={portalClass}>
        <AdminLogin configured={await adminConfigured()} />
      </div>
    );
  }

  const t = getT(locale);
  return (
    <div className={portalClass}>
      <PortalShell kind="admin" admin={{ name: admin.name, email: admin.email }}>
        <p className="demo-bar"><Icon name="info" />{t("admin.demoHint")}</p>
        {children}
      </PortalShell>
    </div>
  );
}
