"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { Icon, type IconName } from "@/components/ui/Icon";
import { Logo } from "@/components/ui/Logo";
import { useI18n } from "@/i18n/I18nProvider";
import { useAppData } from "@/lib/meta-context";
import { adminLogout } from "@/features/admin/actions";
import { LogoutButton } from "@/features/auth/components/LogoutButton";
import { LangSwitch } from "./LangSwitch";

/** Sidebar layout shared by the business portal and the admin area. */
export function PortalShell({ kind, children, adminEmail }: { kind: "business" | "admin"; children: ReactNode; adminEmail?: string }) {
  const { t, locale } = useI18n();
  const { user } = useAppData();
  const pathname = usePathname();
  const base = `/${locale}/${kind}`;
  const items: [string, string, IconName][] =
    kind === "business"
      ? [[base, t("business.overview"), "grid"], [`${base}/deals/new`, t("business.createDeal"), "plus"], [`${base}/redeem`, t("business.redeem"), "scan"], [`${base}/payouts`, t("business.payouts"), "bank"]]
      : [
          [base, t("admin.overview"), "grid"],
          [`${base}/deals`, t("admin.deals"), "doc"],
          [`${base}/merchants`, t("admin.merchants"), "store"],
          [`${base}/orders`, t("admin.orders"), "cart"],
          [`${base}/finance`, t("admin.finance.title"), "bank"],
          [`${base}/refunds`, t("admin.refunds"), "refund"],
          [`${base}/commission`, t("admin.commission"), "card"],
          [`${base}/support`, t("admin.support"), "help"],
        ];

  return (
    <div className={`portal portal-${kind}`}>
      <aside className="side">
        <div className="row between" style={{ gap: 8 }}>
          <Logo href={base} label={t("nav.homeLabel")} sub={kind === "business" ? t("business.portal") : t("admin.title")} />
          <LangSwitch />
        </div>
        <nav aria-label={kind === "business" ? t("business.portal") : t("admin.title")}>
          {items.map(([href, label, icon]) => (
            <Link key={href} href={href} aria-current={pathname === href ? "page" : undefined}><Icon name={icon} />{label}</Link>
          ))}
          <Link href={`/${locale}`}><Icon name="left" />{t("business.backToSite")}</Link>
        </nav>
        {kind === "admin" && adminEmail && (
          <div className="biz">
            <p style={{ fontWeight: 600 }}>{t("admin.title")}</p>
            <p className="muted small">{adminEmail}</p>
            <form action={adminLogout} style={{ marginTop: 8 }}>
              <button className="btn btn-ghost btn-sm" type="submit"><Icon name="logout" />{t("auth.logout")}</button>
            </form>
          </div>
        )}
        {kind === "business" && user && (
          <div className="biz">
            <p style={{ fontWeight: 600 }}>{user.merchant?.companyName ?? user.name}</p>
            {user.merchant && <p className="muted">{t("common.businessId")} {user.merchant.businessId}</p>}
            <p className="muted small">{user.email}</p>
            <div style={{ marginTop: 8 }}><LogoutButton /></div>
          </div>
        )}
      </aside>
      <main className="main">{children}</main>
    </div>
  );
}
