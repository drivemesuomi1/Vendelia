"use client";

import Link from "next/link";
import { Icon } from "@/components/ui/Icon";
import { useI18n } from "@/i18n/I18nProvider";
import { useAppData } from "@/lib/meta-context";
import { loc } from "@/lib/format";

/** City and category filter chips. Filters live in the URL so results are shareable and indexable. */
export function DealFilters({ city, category, q }: { city?: string; category?: string; q?: string }) {
  const { t, locale } = useI18n();
  const { meta } = useAppData();
  const href = (next: { city?: string; category?: string }) => {
    const p = new URLSearchParams();
    const c = "city" in next ? next.city : city;
    const cat = "category" in next ? next.category : category;
    if (c) p.set("city", c);
    if (cat) p.set("category", cat);
    if (q) p.set("q", q);
    const s = p.toString();
    return `/${locale}/deals${s ? `?${s}` : ""}`;
  };
  const chip = (active: boolean, label: string, to: string) => (
    <Link key={to + label} className="cat" style={{ minHeight: 44 }} aria-current={active ? "true" : undefined} aria-pressed={active} href={to} scroll={false}>
      {active && <Icon name="check" />}
      {label}
    </Link>
  );
  return (
    <>
      <div className="filters" role="group" aria-label={t("browse.filterCity")}>
        {chip(!city, t("common.allCities"), href({ city: undefined }))}
        {meta.cities.map((c) => chip(city === c.id, loc(c.name, locale), href({ city: c.id })))}
      </div>
      <div className="filters" role="group" aria-label={t("browse.filterCategory")} style={{ marginBottom: "var(--s3)" }}>
        {chip(!category, t("browse.allCategories"), href({ category: undefined }))}
        {meta.categories.map((c) => chip(category === c.id, loc(c.name, locale), href({ category: c.id })))}
      </div>
    </>
  );
}
