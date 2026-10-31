"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { Icon, type IconName } from "@/components/ui/Icon";
import { Logo } from "@/components/ui/Logo";
import { useI18n } from "@/i18n/I18nProvider";
import { adminLogout } from "@/features/admin/actions";
import { LangSwitch } from "./LangSwitch";

export interface PortalAccount {
  title: string;
  lines: string[];
  onSignOut: () => void;
}

/** Sidebar layout shared by the business portal and the admin area. */
export function PortalShell({ kind, children, adminEmail, account }: { kind: "business" | "admin"; children: ReactNode; adminEmail?: string; account?: PortalAccount }) {
  const { t, locale } = useI18n();
  const pathname = usePathname();
  const base = `/${locale}/${kind}`;
  const items: [string, string, IconName][] =
    kind === "business"
      ? [[base, t("business.myDeals"), "grid"], [`${base}/deals/new`, t("business.createDeal"), "plus"]]
      : [[base, t("admin.overview"), "grid"], [`${base}/businesses`, t("admin.merchants"), "store"], [`${base}/deals`, t("admin.deals"), "doc"]];

  return (
    <div className={`portal portal-${kind} portal-ui`}>
      <aside className="side">
        <div className="row between" style={{ gap: 8 }}>
          <Logo href={base} label={t("nav.homeLabel")} sub={kind === "business" ? t("business.portal") : t("admin.title")} />
          <LangSwitch />
        </div>
        <nav aria-label={kind === "business" ? t("business.portal") : t("admin.title")}>
          {items.map(([href, label, icon]) => (
            <Link key={href} href={href} aria-current={pathname === href || pathname === href.replace(`/${locale}`, "") ? "page" : undefined}><Icon name={icon} />{label}</Link>
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
        {account && (
          <div className="biz">
            <p style={{ fontWeight: 600 }}>{account.title}</p>
            {account.lines.map((l) => <p className="muted small" key={l}>{l}</p>)}
            <button className="btn btn-ghost btn-sm" type="button" style={{ marginTop: 8 }} onClick={account.onSignOut}><Icon name="logout" />{t("auth.logout")}</button>
          </div>
        )}
      </aside>
      <main className="main">{children}</main>
    </div>
  );
}
