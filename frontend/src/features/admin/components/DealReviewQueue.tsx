"use client";

import { useState } from "react";
import Link from "next/link";
import { Icon } from "@/components/ui/Icon";
import { useI18n } from "@/i18n/I18nProvider";
import { formatDate, formatMoney, loc } from "@/lib/format";
import { useAppData } from "@/lib/meta-context";
import { DealChip } from "@/features/portal-demo/DealChip";
import { useDemoStore, useHydrated } from "@/features/portal-demo/store";
import { DealReviewDrawer } from "./DealReviewDrawer";

const TABS = ["pending", "live", "rejected", "all"] as const;
type Tab = (typeof TABS)[number];

/** Admin review queue for deals submitted by businesses: preview, approve, or reject with a reason. */
export function DealReviewQueue() {
  const { t, locale } = useI18n();
  const { meta } = useAppData();
  const { deals, businesses } = useDemoStore();
  const hydrated = useHydrated();
  const [tab, setTab] = useState<Tab>("pending");
  const [openId, setOpenId] = useState<string | null>(null);

  const biz = (id: string) => businesses.find((b) => b.id === id);
  const rows = deals.filter((d) => tab === "all" || d.status === tab).sort((a, b) => (a.status === "pending" ? -1 : 0) - (b.status === "pending" ? -1 : 0) || b.submittedAt.localeCompare(a.submittedAt));
  const count = (s: Tab) => (s === "all" ? deals.length : deals.filter((d) => d.status === s).length);
  const open = deals.find((d) => d.id === openId) ?? null;

  return (
    <>
      <div className="seg seg-tabs" role="group" aria-label={t("admin.mb.statusFilter")}>
        {TABS.map((s) => (
          <button key={s} type="button" aria-pressed={tab === s} onClick={() => setTab(s)}>
            {t(`admin.tab.${s}`)} <small>{hydrated ? count(s) : ""}</small>
          </button>
        ))}
      </div>

      <section className="panel" style={{ marginTop: 16 }}>
        {hydrated && rows.length === 0 ? (
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
                            {d.revision > 1 && ` · ${t("admin.dr.revision", { n: d.revision })}`}
                          </small>
                        </span>
                      </div>
                    </td>
                    <td>{biz(d.businessId) ? <Link className="row-link" href={`/${locale}/admin/businesses/${d.businessId}`}>{biz(d.businessId)!.name}</Link> : "–"}</td>
                    <td className="num">{formatMoney(Math.min(...d.input.options.map((o) => o.priceCents)), locale)}</td>
                    <td>{formatDate(d.submittedAt, locale)}</td>
                    <td><DealChip status={d.status} /></td>
                    <td><div className="mb-actions"><button className={`btn btn-sm ${d.status === "pending" ? "btn-primary" : "btn-secondary"}`} onClick={() => setOpenId(d.id)}>{t(d.status === "pending" ? "admin.dr.review" : "admin.dr.view")}</button></div></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <DealReviewDrawer key={openId ?? "none"} deal={open} onClose={() => setOpenId(null)} />
    </>
  );
}
