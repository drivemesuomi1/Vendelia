"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { AdminDealDTO } from "@vendelia/shared";
import { Icon } from "@/components/ui/Icon";
import { Notice } from "@/components/ui/Notice";
import { useI18n } from "@/i18n/I18nProvider";
import { api, ApiError } from "@/lib/api-client";
import { formatDate, formatMoney, loc } from "@/lib/format";
import { useAppData } from "@/lib/meta-context";
import { DealChip } from "@/features/portal-demo/DealChip";

const TABS = ["pending", "live", "rejected", "all"] as const;
type Tab = (typeof TABS)[number];

/** Admin review queue for deals submitted by businesses: preview, approve, or reject with a reason. */
export function DealReviewQueue() {
  const { t, locale } = useI18n();
  const { meta } = useAppData();
  const [deals, setDeals] = useState<AdminDealDTO[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>("pending");

  // One list of every deal (pending first); the tabs filter it here so the counts stay right.
  useEffect(() => {
    api<{ deals: AdminDealDTO[] }>("/api/admin/deals?status=all")
      .then((r) => setDeals(r.deals))
      .catch((e) => setError(e instanceof ApiError ? e.code : "network"));
  }, []);

  const all = deals ?? [];
  const rows = all.filter((d) => tab === "all" || d.status === tab);
  const count = (s: Tab) => (s === "all" ? all.length : all.filter((d) => d.status === s).length);

  return (
    <>
      <div className="seg seg-tabs" role="group" aria-label={t("admin.mb.statusFilter")}>
        {TABS.map((s) => (
          <button key={s} type="button" aria-pressed={tab === s} onClick={() => setTab(s)}>
            {t(`admin.tab.${s}`)} <small>{deals ? count(s) : ""}</small>
          </button>
        ))}
      </div>

      {error && <div style={{ marginTop: 16 }}><Notice tone="danger" icon="xc">{t(`errors.${error}`)}</Notice></div>}

      <section className="panel" style={{ marginTop: 16 }}>
        {deals && rows.length === 0 ? (
          <div className="empty-state">
            <span className="attn-ic indigo"><Icon name="doc" /></span>
            <h3>{t(tab === "pending" ? "admin.dr.emptyPending" : "admin.dr.empty")}</h3>
            <p className="muted small">{t("admin.dr.emptyText")}</p>
          </div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>{t("admin.col.deal")}</th>
                  <th>{t("admin.merchant")}</th>
                  <th className="num">{t("admin.dr.from")}</th>
                  <th>{t("admin.dr.submitted")}</th>
                  <th>{t("business.colStatus")}</th>
                  <th><span className="sr-only">{t("admin.actions")}</span></th>
                </tr>
              </thead>
              <tbody>
                {rows.map((d) => (
                  <tr key={d.id}>
                    <td>
                      <div className="cell-deal">
                        {d.input.imageUrl ? <img className="thumb-sm" src={d.input.imageUrl} alt="" /> : <span className="thumb-sm" />}
                        <span>
                          <b>{d.input.title.fi}</b>
                          <small className="muted">
                            {loc(meta.categories.find((c) => c.id === d.input.categoryId)?.name, locale)} · {loc(meta.cities.find((c) => c.id === d.input.cityId)?.name, locale)}
                          </small>
                        </span>
                      </div>
                    </td>
                    <td>
                      <Link className="row-link" href={`/${locale}/admin/businesses/${d.merchantId}`}>{d.merchantName}</Link>
                      {d.merchantStatus !== "active" && <small className="muted"> · {t(`admin.${d.merchantStatus}`)}</small>}
                    </td>
                    <td className="num">{d.input.options.length ? formatMoney(Math.min(...d.input.options.map((o) => o.priceCents)), locale) : "–"}</td>
                    <td>{formatDate(d.submittedAt ?? d.createdAt, locale)}</td>
                    <td><DealChip status={d.status === "draft" ? "pending" : d.status} /></td>
                    <td><div className="mb-actions"><Link className={`btn btn-sm ${d.status === "pending" ? "btn-primary" : "btn-secondary"}`} href={`/${locale}/admin/deals/${d.id}`}>{t(d.status === "pending" ? "admin.dr.review" : "admin.dr.view")}</Link></div></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </>
  );
}
