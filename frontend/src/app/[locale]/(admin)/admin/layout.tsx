import type { ReactNode } from "react";
import { Geist, Geist_Mono } from "next/font/google";
import { PortalShell } from "@/components/layout/PortalShell";
import { Icon } from "@/components/ui/Icon";
import { AdminLogin } from "@/features/admin/components/AdminLogin";
import { getT, resolveLocale } from "@/i18n/server";
import { adminConfig, getAdminSession } from "@/lib/admin-auth";
import "@/styles/admin.css";

export const metadata = { title: "Admin", robots: { index: false } };

// Admin-only typeface: Geist reads well at small sizes and has even-width figures for tables and charts.
// The customer site keeps the brand font (Inter).
const geist = Geist({ subsets: ["latin", "latin-ext"], variable: "--font-admin", display: "swap" });
const geistMono = Geist_Mono({ subsets: ["latin"], variable: "--font-admin-mono", display: "swap" });

/**
 * Staff area at /admin. Without an admin session the sign-in form is shown at the same URL.
 * Sign-in is a stop-gap (env-configured admin + signed cookie) until the backend provides real sessions.
 * Screens show demo data until the /api/admin/* endpoints exist.
 */
export default async function AdminLayout({ children, params }: { children: ReactNode; params: Promise<{ locale: string }> }) {
  const locale = await resolveLocale(params);
  const adminEmail = await getAdminSession();
  const fonts = `admin-font ${geist.variable} ${geistMono.variable}`;
  if (!adminEmail) {
    return (
      <div className={fonts}>
        <AdminLogin configured={!!adminConfig()} devHint={process.env.NODE_ENV !== "production"} />
      </div>
    );
  }

  const t = getT(locale);
  return (
    <div className={fonts}>
      <PortalShell kind="admin" adminEmail={adminEmail}>
        <p className="demo-bar"><Icon name="info" />{t("admin.demoHint")}</p>
        {children}
      </PortalShell>
    </div>
  );
}
