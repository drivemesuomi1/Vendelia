"use client";

import { useEffect, useMemo, useState } from "react";
import type { AdminOrderDTO, AdminOrderStatus } from "@vendelia/shared";
import { Icon } from "@/components/ui/Icon";
import { Notice } from "@/components/ui/Notice";
import { useI18n } from "@/i18n/I18nProvider";
import { api, ApiError } from "@/lib/api-client";
import { formatMoney, loc } from "@/lib/format";
import { ago, int } from "../format";

const STATUSES: AdminOrderStatus[] = ["paid", "pending", "failed", "refunded", "test"];

/** Searchable list of orders from the database, with status filter and per-status counts. */
export function OrdersTable() {
  const { t, locale } = useI18n();
  const [orders, setOrders] = useState<AdminOrderDTO[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState<"" | AdminOrderStatus>("");

  useEffect(() => {
    api<{ orders: AdminOrderDTO[] }>("/api/admin/orders")
      .then((r) => setOrders(r.orders))
      .catch((e) => setError(e instanceof ApiError ? e.code : "network"));
  }, []);

  const all = useMemo(() => orders ?? [], [orders]);
  const rows = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return all.filter((o) => (!status || o.status === status) && (!needle
      || o.number.toLowerCase().includes(needle)
      || o.email.toLowerCase().includes(needle)
      || o.items.some((i) => loc(i.title, locale).toLowerCase().includes(needle) || i.merchantName.toLowerCase().includes(needle))));
  }, [all, q, status, locale]);

  const paid = all.filter((o) => o.status === "paid");
  const paidCents = paid.reduce((a, o) => a + o.totalCents, 0);
  const tiles = [
    [t("admin.kpi.orders"), int(all.length, locale)],
    [t("admin.ostatus.paid"), formatMoney(paidCents, locale)],
    [t("admin.kpi.aov"), formatMoney(Math.round(paidCents / Math.max(paid.length, 1)), locale)],
    [t("admin.ostatus.failed"), int(all.filter((o) => o.status === "failed").length, locale)],
  ];
  const method = (m: string) =>
    m === "mobilepay" ? "MobilePay" : m === "card" ? t("checkout.card") : m === "bank" ? t("checkout.bank") : m === "test" ? t("admin.ostatus.test") : m;

  return (
    <>
      {error && <Notice tone="warn" icon="info">{t(`errors.${error}`)}</Notice>}
      <section className="adm-kpis four">
        {tiles.map(([l, v]) => (
          <div className="kpi-tile" key={l}><p className="kt-label">{l}</p><p className="kt-value">{orders ? v : "–"}</p></div>
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
                {t(`admin.ostatus.${s}`)} <small>{all.filter((o) => o.status === s).length}</small>
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
              {rows.map((o) => (
                <tr key={o.id}>
                  <td><b className="mono">{o.number}</b><small className="muted block">{ago((Date.now() - Date.parse(o.createdAt)) / 60000, locale)}</small></td>
                  <td>
                    {o.items.map((i, n) => (
                      <div key={n}>
                        {i.qty} × {loc(i.title, locale)}{i.optionLabel ? ` – ${loc(i.optionLabel, locale)}` : ""}
                        <small className="muted block">{i.merchantName}</small>
                      </div>
                    ))}
                  </td>
                  <td>{o.email}</td>
                  <td>{method(o.paymentMethod)}</td>
                  <td><span className={`st st-${o.status}`}>{t(`admin.ostatus.${o.status}`)}</span></td>
                  <td className="num"><b>{formatMoney(o.totalCents, locale)}</b></td>
                </tr>
              ))}
            </tbody>
          </table>
          {!orders && !error && <p className="muted empty-row">{t("admin.vo.loading")}</p>}
          {orders && rows.length === 0 && <p className="muted empty-row">{t("admin.noResults")}</p>}
        </div>
      </section>
    </>
  );
}
