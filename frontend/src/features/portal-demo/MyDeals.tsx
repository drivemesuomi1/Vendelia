"use client";

import Link from "next/link";
import { useState } from "react";
import { Dialog } from "@/components/ui/Dialog";
import { Icon } from "@/components/ui/Icon";
import { useI18n } from "@/i18n/I18nProvider";
import { formatDate, formatMoney } from "@/lib/format";
import { useAppData } from "@/lib/meta-context";
import { DealPreview } from "./DealPreview";
import { splitPrice } from "./money";
import { useBusinessSession, useDemoStore, withdrawDeal, type DemoDealStatus } from "./store";

/** Business home: its deals with review status, the admin's rejection reason, and edit/preview. */
export function MyDeals() {
  const { t, locale } = useI18n();
  const { meta } = useAppData();
  const business = useBusinessSession();
  const { deals } = useDemoStore();
  const [previewId, setPreviewId] = useState<string | null>(null);
  if (!business) return null;

  const mine = deals.filter((d) => d.businessId === business.id);
  const count = (s: DemoDealStatus) => mine.filter((d) => d.status === s).length;
  const preview = mine.find((d) => d.id === previewId);
  const base = `/${locale}/business`;

  const chip = (s: DemoDealStatus) =>
    s === "live" ? <span className="chip teal"><Icon name="checkc" />{t("admin.dr.live")}</span>
      : s === "pending" ? <span className="chip warn"><Icon name="clock" />{t("business.inReview")}</span>
      : <span className="chip danger"><Icon name="xc" />{t("admin.dr.rejected")}</span>;

  return (
    <div className="adm">
      <header className="adm-head">
        <div>
          <h1>{t("business.hello", { name: business.name })}</h1>
          <p className="muted small">{t("business.myDealsSub")}</p>
        </div>
        <Link className="btn btn-primary btn-sm" href={`${base}/deals/new`}><Icon name="plus" />{t("business.createDeal")}</Link>
      </header>

      {business.status === "pending" && (
        <p className="review-note warn" role="status"><Icon name="clock" />{t("business.pendingAccount")}</p>
      )}

      <section className="adm-kpis">
        {(
          [
            ["business.statAll", mine.length],
            ["business.inReview", count("pending")],
            ["admin.dr.live", count("live")],
            ["admin.dr.rejected", count("rejected")],
          ] as const
        ).map(([k, v]) => (
          <div className="kpi-tile" key={k}><p className="kt-label">{t(k)}</p><p className="kt-value">{v}</p></div>
        ))}
      </section>

      <section className="panel" style={{ marginTop: 20 }}>
        {mine.length === 0 ? (
          <div className="empty-state">
            <span className="attn-ic indigo"><Icon name="plus" /></span>
            <h3>{t("business.emptyTitle")}</h3>
            <p className="muted small">{t("business.emptyText")}</p>
            <Link className="btn btn-primary btn-sm" href={`${base}/deals/new`}><Icon name="plus" />{t("business.createDeal")}</Link>
          </div>
        ) : (
          <ul className="deal-rows">
            {mine.map((d) => {
              const from = Math.min(...d.input.options.map((o) => o.priceCents));
              const option = d.input.options.find((o) => o.priceCents === from)!;
              const payout = splitPrice(option.priceCents, d.input.vatBps, meta.commissionBps, meta.commissionVatBps).payoutCents;
              return (
                <li key={d.id}>
                  <div className="deal-row">
                    {d.input.imageUrl ? <img className="thumb-md" src={d.input.imageUrl} alt="" /> : <span className="thumb-md" />}
                    <div className="deal-row-main">
                      <div className="row" style={{ gap: 8, flexWrap: "wrap" }}>
                        <b>{d.input.title.fi}</b>
                        {chip(d.status)}
                      </div>
                      <small className="muted">
                        {t("business.fromPrice", { price: formatMoney(from, locale) })} · {t("business.youGet", { amount: formatMoney(payout, locale) })} · {t("business.submittedOn", { date: formatDate(d.submittedAt, locale) })}
                      </small>
                      {d.status === "rejected" && (
                        <p className="review-note"><b>{t("business.rejectedReason")}:</b> {d.reviewNote ?? "–"}</p>
                      )}
                    </div>
                    <div className="mb-actions">
                      <button className="btn btn-ghost btn-sm" type="button" onClick={() => setPreviewId(d.id)}>{t("admin.dr.view")}</button>
                      <Link className="btn btn-secondary btn-sm" href={`${base}/deals/${d.id}/edit`}>{t(d.status === "rejected" ? "business.fixResubmit" : "business.edit")}</Link>
                      {d.status !== "live" && (
                        <button className="btn btn-ghost btn-sm" type="button" aria-label={t("business.withdraw")} onClick={() => confirm(t("business.confirmWithdraw")) && withdrawDeal(d.id)}><Icon name="trash" /></button>
                      )}
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <Dialog open={!!preview} onClose={() => setPreviewId(null)} className="drawer drawer-wide" labelledBy="pv-title">
        {preview && (
          <div className="mb-form">
            <div className="drawer-head">
              <h2 id="pv-title" style={{ fontSize: 20 }}>{t("business.previewTitle")}</h2>
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => setPreviewId(null)} aria-label={t("admin.mb.close")}><Icon name="x" /></button>
            </div>
            <div className="drawer-body"><DealPreview input={preview.input} businessName={business.name} /></div>
          </div>
        )}
      </Dialog>
    </div>
  );
}
