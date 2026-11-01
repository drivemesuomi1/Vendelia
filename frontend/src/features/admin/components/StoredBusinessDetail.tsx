"use client";

import Link from "next/link";
import type { AdminMerchantDTO } from "@vendelia/shared";
import { useI18n } from "@/i18n/I18nProvider";
import { formatDate, loc } from "@/lib/format";
import { useAppData } from "@/lib/meta-context";
import { Icon } from "@/components/ui/Icon";

/** Persisted business profile. Login, notes and financial demo data are not shown here. */
export function StoredBusinessDetail({ merchant: b }: { merchant: AdminMerchantDTO }) {
  const { t, locale } = useI18n();
  const { meta } = useAppData();
  const fields = [
    [t("auth.displayName"), b.name],
    [t("auth.companyName"), b.companyName],
    [t("common.businessId"), b.businessId],
    [t("admin.mb.city"), b.cityId ? loc(meta.cities.find(c => c.id === b.cityId)?.name, locale) : null],
    [t("admin.mb.category"), b.categoryId ? loc(meta.categories.find(c => c.id === b.categoryId)?.name, locale) : null],
    [t("auth.contactName"), b.contactName],
    [t("admin.mb.contactEmail"), b.publicEmail],
    [t("admin.mb.phone"), b.phone],
    [t("business.colStatus"), t(`admin.${b.status}`)],
    [t("admin.created"), formatDate(b.createdAt, locale)],
  ];
  return (
    <div className="adm">
      <Link className="back-link" href={`/${locale}/admin/businesses`}><Icon name="left" />{t("admin.bd.back")}</Link>
      <header className="adm-head"><div><h1>{b.name}</h1><p className="muted small">{b.companyName}</p></div></header>
      <section className="panel pad">
        <dl className="stack">
          {fields.map(([label, value]) => <div key={label}><dt className="muted small">{label}</dt><dd>{value || "–"}</dd></div>)}
        </dl>
      </section>
      <section className="adm-kpis" style={{ marginTop: 20 }}>
        <div className="kpi-tile"><p className="kt-label">{t("admin.mb.deals")}</p><p className="kt-value">{b.dealCount}</p></div>
        <div className="kpi-tile"><p className="kt-label">{t("admin.dr.live")}</p><p className="kt-value">{b.liveDealCount}</p></div>
      </section>
    </div>
  );
}
