"use client";

import type { PayoutStatementDTO } from "@vendelia/shared";
import { Icon } from "@/components/ui/Icon";
import { Notice } from "@/components/ui/Notice";
import { useI18n } from "@/i18n/I18nProvider";
import { formatDate, formatMoney, loc } from "@/lib/format";

/** Settlement statement with every line from the brief shown separately. */
export function PayoutStatement({ data }: { data: PayoutStatementDTO }) {
  const { t, locale } = useI18n();
  const m = (c: number) => formatMoney(c, locale);
  const neg = (c: number) => (c ? `−${m(c)}` : m(0));
  const end = new Date(new Date(data.periodEnd).getTime() - 1);

  function exportCsv() {
    const head = [t("business.colDeal"), t("business.colSales"), t("business.colSaleVat"), t("business.colBase"), t("business.colCommission"), t("business.colCommissionVat"), t("business.colRefunds"), t("business.colPayout")];
    const rows = data.rows.map((r) => [loc(r.title, locale), r.grossCents, r.saleVatCents, r.netCents, r.commissionCents, r.commissionVatCents, r.refundCents, r.payoutCents].map((v) => (typeof v === "number" ? (v / 100).toFixed(2) : `"${v.replace(/"/g, '""')}"`)));
    const csv = [head.join(";"), ...rows.map((r) => r.join(";"))].join("\n");
    const url = URL.createObjectURL(new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8" }));
    const a = Object.assign(document.createElement("a"), { href: url, download: `vendelia-statement-${data.periodStart.slice(0, 10)}.csv` });
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <>
      <div className="row between wrap-row" style={{ gap: 16 }}>
        <div>
          <h1 style={{ fontSize: 28 }}>{t("business.payouts")}</h1>
          <p className="muted">{t("business.period", { from: formatDate(data.periodStart, locale), to: formatDate(end, locale) })}</p>
        </div>
        <button className="btn btn-secondary" onClick={exportCsv}><Icon name="doc" /> {t("business.exportCsv")}</button>
      </div>
      <div className="grid kpis" style={{ marginTop: "var(--s3)" }}>
        <div className="card pad kpi"><p className="muted small">{t("business.pendingPayout")}</p><p className="v">{m(data.pendingPayoutCents)}</p><p className="hint">{t("business.pendingHint")}</p></div>
        <div className="card pad kpi"><p className="muted small">{t("business.periodPayout")}</p><p className="v">{m(data.totals.payoutCents)}</p></div>
        <div className="card pad kpi"><p className="muted small">{t("business.payoutAccount")}</p><p className="v" style={{ fontSize: 18 }}>{data.payoutAccountMasked || "—"}</p></div>
      </div>
      <div className="card" style={{ marginTop: "var(--s3)" }}>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>{t("business.colDeal")}</th><th className="num">{t("business.colSales")}</th><th className="num">{t("business.colSaleVat")}</th>
                <th className="num">{t("business.colBase")}</th><th className="num">{t("business.colCommission")}</th><th className="num">{t("business.colCommissionVat")}</th>
                <th className="num">{t("business.colRefunds")}</th><th className="num">{t("business.colPayout")}</th>
              </tr>
            </thead>
            <tbody>
              {data.rows.map((r) => (
                <tr key={r.dealId}>
                  <td>{loc(r.title, locale)}<div className="hint">{t("business.soldRefunded", { sold: r.sold, refunded: r.refunded })}</div></td>
                  <td className="num">{m(r.grossCents)}</td><td className="num">{m(r.saleVatCents)}</td><td className="num">{m(r.netCents)}</td>
                  <td className="num">{m(r.commissionCents)}</td><td className="num">{m(r.commissionVatCents)}</td><td className="num">{neg(r.refundCents)}</td>
                  <td className="num"><b>{m(r.payoutCents)}</b></td>
                </tr>
              ))}
              {!data.rows.length && <tr><td colSpan={8} className="muted">{t("business.noSales")}</td></tr>}
              <tr className="sum">
                <td>{t("cart.total")}</td>
                <td className="num">{m(data.totals.grossCents)}</td><td className="num">{m(data.totals.saleVatCents)}</td><td className="num">{m(data.totals.netCents)}</td>
                <td className="num">{m(data.totals.commissionCents)}</td><td className="num">{m(data.totals.commissionVatCents)}</td><td className="num">{neg(data.totals.refundCents)}</td>
                <td className="num">{m(data.totals.payoutCents)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
      <Notice className="mt" tone="indigo" icon="info"><p>{t("business.statementNote")}</p></Notice>
      {data.payouts.length > 0 && (
        <div className="card" style={{ marginTop: "var(--s3)" }}>
          <div className="pad"><h2 style={{ fontSize: 18 }}>{t("business.payoutHistory")}</h2></div>
          <div className="table-wrap">
            <table>
              <tbody>
                {data.payouts.map((p) => (
                  <tr key={p.id}><td>{formatDate(p.createdAt, locale)}</td><td>{p.status === "paid" ? t("business.paid") : t("business.scheduled")}</td><td className="num">{m(p.amountCents)}</td></tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </>
  );
}
