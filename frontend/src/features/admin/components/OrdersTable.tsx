"use client";

import { useMemo, useState } from "react";
import { Icon } from "@/components/ui/Icon";
import { useI18n } from "@/i18n/I18nProvider";
import { formatMoney, loc } from "@/lib/format";
import { ago, int } from "../format";
import type { AdminDemoData, DemoOrder } from "../mock-data";

const STATUSES: DemoOrder["status"][] = ["paid", "pending", "failed", "refunded"];

/** Searchable order list with status filter and per-status counts. */
export function OrdersTable({ data }: { data: AdminDemoData }) {
  const { t, locale } = useI18n();
  const [q, setQ] = useState("");
  const [status, setStatus] = useState<"" | DemoOrder["status"]>("");
  const deal = (id: string) => data.deals.find((d) => d.id === id)!;

  const rows = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return data.orders.filter(
      (o) => (!status || o.status === status) && (!needle || o.number.toLowerCase().includes(needle) || o.email.toLowerCase().includes(needle) || loc(deal(o.dealId).title, locale).toLowerCase().includes(needle)),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, status, data, locale]);

  const paid = data.orders.filter((o) => o.status === "paid");
  const tiles = [
    [t("admin.kpi.orders"), int(data.orders.length, locale)],
    [t("admin.ostatus.paid"), formatMoney(paid.reduce((a, o) => a + o.totalCents, 0), locale)],
    [t("admin.kpi.aov"), formatMoney(Math.round(paid.reduce((a, o) => a + o.totalCents, 0) / Math.max(paid.length, 1)), locale)],
    [t("admin.ostatus.failed"), int(data.orders.filter((o) => o.status === "failed").length, locale)],
  ];

  return (
    <>
      <section className="adm-kpis four">
        {tiles.map(([l, v]) => (
          <div className="kpi-tile" key={l}><p className="kt-label">{l}</p><p className="kt-value">{v}</p></div>
        ))}
      </section>
      <section className="panel" style={{ marginTop: "var(--s3)" }}>
        <div className="toolbar">
          <label className="search-box">
            <Icon name="search" />
            <span className="sr-only">{t("admin.ordersSearch")}</span>
            <input className="input" value={q} onChange={(e) => setQ(e.target.value)} placeholder={t("admin.ordersSearch")} />
          </label>
          <div className="seg" role="group" aria-label={t("admin.order.status")}>
            <button type="button" aria-pressed={status === ""} onClick={() => setStatus("")}>{t("admin.tab.all")}</button>
            {STATUSES.map((s) => (
              <button key={s} type="button" aria-pressed={status === s} onClick={() => setStatus(s)}>
                {t(`admin.ostatus.${s}`)} <small>{data.orders.filter((o) => o.status === s).length}</small>
              </button>
            ))}
          </div>
        </div>
        <div className="table-wrap">
          <table className="tbl">
            <thead>
              <tr>
                <th>{t("admin.order.number")}</th>
                <th>{t("admin.col.deal")}</th>
                <th>{t("admin.order.customer")}</th>
                <th>{t("admin.order.method")}</th>
                <th>{t("admin.order.status")}</th>
                <th className="num">{t("admin.order.total")}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((o) => {
                const d = deal(o.dealId);
                return (
                  <tr key={o.number}>
                    <td><b className="mono">{o.number}</b><small className="muted block">{ago(o.minutesAgo, locale)}</small></td>
                    <td>{o.qty} × {loc(d.title, locale)}<small className="muted block">{data.merchants.find((m) => m.id === d.merchantId)?.name}</small></td>
                    <td>{o.email}</td>
                    <td>{o.method === "mobilepay" ? "MobilePay" : t(o.method === "card" ? "checkout.card" : "checkout.bank")}</td>
                    <td><span className={`st st-${o.status}`}>{t(`admin.ostatus.${o.status}`)}</span></td>
                    <td className="num"><b>{formatMoney(o.totalCents, locale)}</b></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {rows.length === 0 && <p className="muted empty-row">{t("admin.noResults")}</p>}
        </div>
      </section>
    </>
  );
}
