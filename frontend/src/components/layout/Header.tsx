"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Icon } from "@/components/ui/Icon";
import { Logo } from "@/components/ui/Logo";
import { useI18n } from "@/i18n/I18nProvider";
import { useAppData } from "@/lib/meta-context";
import { useCart } from "@/features/cart/store";
import { CityPicker } from "./CityPicker";
import { LangSwitch } from "./LangSwitch";

export function Header({ home }: { home?: boolean }) {
  const { t, locale } = useI18n();
  const { user } = useAppData();
  const cart = useCart();
  const router = useRouter();
  const [q, setQ] = useState("");
  const search = (e: FormEvent) => {
    e.preventDefault();
    router.push(`/${locale}/deals${q.trim() ? `?q=${encodeURIComponent(q.trim())}` : ""}`);
  };
  const count = cart.count;
  const cartLabel = t(count === 1 ? "nav.cartOne" : "nav.cartMany", { n: count });
  const portal = user?.role === "admin" ? { href: `/${locale}/admin`, label: t("nav.admin"), icon: "grid" as const } : { href: `/${locale}/business`, label: t("nav.forBusinesses"), icon: "store" as const };

  const searchForm = (id: string, placeholder: string, cls = "") => (
    <form className={`search ${cls}`} role="search" onSubmit={search}>
      <label className="sr-only" htmlFor={id}>{t("nav.search")}</label>
      <Icon name="search" />
      <input className="input" id={id} name="q" placeholder={placeholder} value={q} onChange={(e) => setQ(e.target.value)} autoComplete="off" />
    </form>
  );

  return (
    <header className={`site ${home ? "is-home" : ""}`}>
      <div className="wrap">
        <div className="hdr">
          <Logo href={`/${locale}`} label={t("nav.homeLabel")} />
          <CityPicker />
          {searchForm("q1", t("nav.searchPlaceholder"), "hdr-search")}
          <nav className="nav" aria-label={t("nav.main")}>
            <Link href={`/${locale}/account/vouchers`} title={t("nav.myVouchers")} aria-label={t("nav.myVouchers")}>
              <Icon name="ticket" /><span className="lbl">{t("nav.myVouchers")}</span>
            </Link>
            <Link href={portal.href} title={portal.label} aria-label={portal.label}>
              <Icon name={portal.icon} /><span className="lbl">{portal.label}</span>
            </Link>
            <span className="nav-sep" aria-hidden="true" />
            <LangSwitch />
            <button className="navbtn cart" onClick={() => cart.openDrawer()} aria-haspopup="dialog" aria-label={cartLabel}>
              <Icon name="cart" /><span className="lbl">{t("cart.title")}</span>
              <span className="badge" hidden={!count}>{count}</span>
            </button>
          </nav>
        </div>
        <div className="hdr-row2">
          <CityPicker />
          {searchForm("q2", t("nav.search"))}
        </div>
      </div>
    </header>
  );
}
