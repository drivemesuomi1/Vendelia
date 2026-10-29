"use client";

import Link from "next/link";
import { Icon, type IconName } from "@/components/ui/Icon";
import { useI18n } from "@/i18n/I18nProvider";
import { useAppData } from "@/lib/meta-context";
import { loc } from "@/lib/format";

export function CategoryBar() {
  const { t, locale } = useI18n();
  const { meta } = useAppData();
  const total = meta.categories.reduce((a, c) => a + c.dealCount, 0);
  return (
    <nav className="catbar" aria-label={t("home.categories")}>
      <Link className="pill" href={`/${locale}/deals`}>
        <Icon name="grid" />
        {t("home.allDeals")} <small>{total}</small>
      </Link>
      {meta.categories.map((c) => (
        <Link key={c.id} className="pill" href={`/${locale}/deals?category=${c.id}`}>
          <Icon name={c.icon as IconName} />
          {loc(c.name, locale)} <small>{c.dealCount}</small>
        </Link>
      ))}
    </nav>
  );
}
