"use client";

import Link from "next/link";
import type { AdminDealDTO, AdminMerchantDTO } from "@vendelia/shared";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";
import { Icon } from "@/components/ui/Icon";
import { useI18n } from "@/i18n/I18nProvider";
import { formatDate, formatMoney, loc } from "@/lib/format";
import { useAppData } from "@/lib/meta-context";
import { DealChip } from "@/features/portal-demo/DealChip";

/** Persisted business profile with its deals. Each deal opens its own review page. */
export function StoredBusinessDetail({ merchant: b, deals }: { merchant: AdminMerchantDTO; deals: AdminDealDTO[] }) {
  const { t, locale } = useI18n();
  const { meta } = useAppData();
  const base = `/${locale}/admin`;
  const city = b.cityId ? loc(meta.cities.find((c) => c.id === b.cityId)?.name, locale) : null;
  const category = b.categoryId ? loc(meta.categories.find((c) => c.id === b.categoryId)?.name, locale) : null;
  const count = (s: AdminDealDTO["status"]) => deals.filter((d) => d.status === s).length;

  const statusChip = b.status === "active" ? <span className="chip teal"><Icon name="checkc" />{t("admin.active")}</span>
    : b.status === "pending" ? <span className="chip warn"><Icon name="clock" />{t("admin.pending")}</span>
    : <span className="chip danger"><Icon name="xc" />{t("admin.suspended")}</span>;

  const details: [string, React.ReactNode][] = [
    [t("auth.companyName"), b.companyName],
    [t("common.businessId"), b.businessId],
    [t("admin.mb.city"), city],
    [t("admin.mb.category"), category],
    [t("admin.created"), formatDate(b.createdAt, locale)],
  ];
  const contact: [string, React.ReactNode][] = [
    [t("auth.contactName"), b.contactName],
    [t("admin.mb.contactEmail"), b.publicEmail ? <a className="row-link" href={`mailto:${b.publicEmail}`}>{b.publicEmail}</a> : null],
    [t("admin.mb.phone"), b.phone ? <a className="row-link" href={`tel:${b.phone.replace(/\s/g, "")}`}>{b.phone}</a> : null],
    [t("deal.website"), b.website ? <a className="row-link" href={b.website} target="_blank" rel="noopener noreferrer">{b.website.replace(/^https?:\/\//, "")}</a> : null],
  ];

  return (
    <div className="adm">
      <Breadcrumbs items={[{ label: t("admin.overview"), href: base }, { label: t("admin.merchants"), href: `${base}/businesses` }, { label: b.name }]} />

      <header className="adm-head">
        <div className="bd-title">
          <span className="bd-avatar" aria-hidden="true">{b.name.slice(0, 1).toUpperCase()}</span>
          <div>
            <h1>{b.name} {statusChip}</h1>
            <p className="muted small">{[b.companyName, b.businessId, city, category].filter(Boolean).join(" · ")}</p>
          </div>
        </div>
      </header>

      <section className="adm-kpis">
        {([["admin.bd.kpi.deals", deals.length], ["admin.dr.live", count("live")], ["admin.dr.pending", count("pending")], ["admin.dr.rejected", count("rejected")]] as const).map(([label, value]) => (
          <div className="kpi-tile" key={label}><p className="kt-label">{t(label)}</p><p className="kt-value">{value}</p></div>
        ))}
      </section>

      <div className="bd-layout">
        <section className="panel">
          <div className="panel-h"><div><h2>{t("admin.bd.deals.title")}</h2><p className="muted">{t("admin.bd.dealsHint")}</p></div></div>
          {deals.length === 0 ? (
            <div className="empty-state">
              <span className="attn-ic indigo"><Icon name="doc" /></span>
              <p className="muted small">{t("admin.bd.deals.empty")}</p>
            </div>
          ) : (
            <ul className="bd-deals">
              {deals.map((d) => {
                const from = d.input.options.length ? Math.min(...d.input.options.map((o) => o.priceCents)) : null;
                return (
                  <li key={d.id}>
                    <Link className="bd-deal" href={`${base}/deals/${d.id}?from=business`}>
                      {d.input.imageUrl ? <img className="thumb-md" src={d.input.imageUrl} alt="" /> : <span className="thumb-md" />}
                      <span className="bd-deal-main">
                        <b>{d.input.title.fi}</b>
                        <small className="muted">
                          {[loc(meta.categories.find((c) => c.id === d.input.categoryId)?.name, locale), from !== null ? t("business.fromPrice", { price: formatMoney(from, locale) }) : null, formatDate(d.submittedAt ?? d.createdAt, locale)].filter(Boolean).join(" · ")}
                        </small>
                        {d.reviewNote && <small className="bd-deal-note">{d.reviewNote}</small>}
                      </span>
                      <DealChip status={d.status === "draft" ? "pending" : d.status} />
                      <Icon name="right" />
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <aside className="stack">
          {[[t("admin.bd.details.title"), details], [t("admin.bd.contact"), contact]].map(([title, rows]) => (
            <section className="panel" key={String(title)}>
              <div className="panel-h"><h2>{String(title)}</h2></div>
              <dl className="facts">
                {(rows as [string, React.ReactNode][]).map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value || "–"}</dd></div>)}
              </dl>
            </section>
          ))}
        </aside>
      </div>
    </div>
  );
}
