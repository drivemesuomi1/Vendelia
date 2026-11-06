"use client";

import { useEffect, useMemo, useState } from "react";
import type { AdminFinanceDTO, SplitDTO } from "@vendelia/shared";
import { Notice } from "@/components/ui/Notice";
import { useI18n } from "@/i18n/I18nProvider";
import { api, ApiError } from "@/lib/api-client";
import { formatMoney, formatPct } from "@/lib/format";
import { dateTime, dayLabel, int, moneyCompact } from "../format";
import { TrendChart } from "./charts";

type Totals = Omit<SplitDTO, "feeCents"> & { vouchers: number };
const zero = (): Totals => ({ vouchers: 0, grossCents: 0, saleVatCents: 0, netCents: 0, commissionCents: 0, commissionVatCents: 0, payoutCents: 0 });
const add = (a: Totals, b: Totals) => {
  for (const k of Object.keys(a) as (keyof Totals)[]) a[k] += b[k];
};

const WEEKS = 26;
const MONTHS = 12;
const DAY = 864e5;

/** Today's calendar date in Helsinki, as the backend groups sales. */
const helsinkiToday = () => new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Helsinki" }).format(new Date());
const utc = (ymd: string) => Date.parse(`${ymd}T00:00:00Z`);
const ymd = (ms: number) => new Date(ms).toISOString().slice(0, 10);

/** Platform money from the database: weekly revenue, monthly statement and what each business has earned. */
export function FinanceView() {
  const { t, locale } = useI18n();
  const money = (c: number) => formatMoney(c, locale);
  const [includeTest, setIncludeTest] = useState(false);
  const [data, setData] = useState<AdminFinanceDTO | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let live = true;
    setData(null);
    setError(null);
    api<AdminFinanceDTO>(`/api/admin/finance${includeTest ? "?test=1" : ""}`)
      .then((r) => { if (live) setData(r); })
      .catch((e) => { if (live) setError(e instanceof ApiError ? e.code : "network"); });
    return () => { live = false; };
  }, [includeTest]);

  const { weeks, months, last30 } = useMemo(() => {
    const today = utc(helsinkiToday());
    const weeks = Array.from({ length: WEEKS }, (_, i) => ({ label: dayLabel(ymd(today - ((WEEKS - i) * 7 - 1) * DAY), locale), revenue: 0 }));
    const thisMonth = ymd(today).slice(0, 7);
    const months = new Map<string, Totals>();
    const last30 = zero();
    for (const d of data?.days ?? []) {
      const ago = Math.round((today - utc(d.date)) / DAY);
      const row: Totals = { vouchers: d.vouchers, grossCents: d.grossCents, saleVatCents: d.saleVatCents, netCents: d.netCents,
        commissionCents: d.commissionCents, commissionVatCents: d.commissionVatCents, payoutCents: d.payoutCents };
      if (ago >= 0 && ago < WEEKS * 7) weeks[WEEKS - 1 - Math.floor(ago / 7)]!.revenue += d.commissionCents;
      if (ago >= 0 && ago < 30) add(last30, row);
      const m = d.date.slice(0, 7);
      if (!months.has(m)) months.set(m, zero());
      add(months.get(m)!, row);
    }
    if (!months.has(thisMonth)) months.set(thisMonth, zero());
    return { weeks, months: [...months.entries()].sort(([a], [b]) => b.localeCompare(a)).slice(0, MONTHS), last30 };
  }, [data, locale]);

  const monthName = (ym: string) => new Intl.DateTimeFormat(`${locale}-FI`, { month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(`${ym}-01`));
  const cols: [keyof Totals, string][] = [
    ["grossCents", "gross"], ["saleVatCents", "saleVat"], ["netCents", "net"],
    ["commissionCents", "commission"], ["commissionVatCents", "commissionVat"], ["payoutCents", "payout"],
  ];
  const vatRate = data ? formatPct(data.commissionVatBps, locale) : "";
  const shown = (v: string) => (data ? v : "–");

  return (
    <>
      <div className="row wrap-row" style={{ justifyContent: "space-between", gap: 12, marginBottom: "var(--s3)" }}>
        <label className="row" style={{ gap: 8 }}>
          <input type="checkbox" checked={includeTest} onChange={(e) => setIncludeTest(e.target.checked)} />
          {t("admin.finance.includeTest")}
        </label>
        {data && <span className="muted small">{t("admin.finance.rates", { commission: formatPct(data.commissionBps, locale), vat: vatRate })}</span>}
      </div>

      {error && <Notice tone="danger" icon="xc">{t(`errors.${error}`)}</Notice>}
      {data && !data.includesTest && !data.days.length && !data.merchants.length && (
        <Notice tone="indigo" icon="info">{t("admin.finance.onlyTest")}</Notice>
      )}

      <section className="adm-kpis four">
        {(
          [
            ["admin.kpi.gross", last30.grossCents],
            ["admin.kpi.revenue", last30.commissionCents],
            ["admin.split.commissionVatShort", last30.commissionVatCents],
            ["admin.split.payout", last30.payoutCents],
          ] as const
        ).map(([key, v]) => (
          <div className="kpi-tile" key={key}>
            <p className="kt-label">{t(key, { rate: vatRate })}<span>{t("admin.range", { n: 30 })}</span></p>
            <p className="kt-value">{shown(money(v))}</p>
          </div>
        ))}
      </section>

      <div className="adm-grid" style={{ marginTop: "var(--s3)" }}>
        <section className="panel span-12">
          <div className="panel-h"><div><h2>{t("admin.finance.revenueTrend")}</h2><p className="muted small">{t("admin.kpi.revenueHint")}</p></div></div>
          {data ? (
            <TrendChart
              title={t("admin.finance.revenueTrend")}
              labels={weeks.map((w) => w.label)}
              current={weeks.map((w) => w.revenue)}
              format={money}
              axisFormat={(v) => moneyCompact(v, locale)}
              currentLabel={t("admin.kpi.revenue")}
              height={240}
            />
          ) : !error && <p className="muted small">{t("admin.vo.loading")}</p>}
        </section>

        <section className="panel span-12">
          <div className="panel-h">
            <div>
              <h2>{t("admin.finance.monthly")}</h2>
              <p className="muted small">{t("admin.split.note")} {t("admin.finance.salesRule")}</p>
              {data && data.refunded.vouchers > 0 && (
                <p className="muted small">{t("admin.finance.refundedNote", { n: int(data.refunded.vouchers, locale), amount: money(data.refunded.grossCents) })}</p>
              )}
            </div>
          </div>
          <div className="table-wrap">
            <table className="tbl">
              <thead>
                <tr>
                  <th>{t("admin.col.month")}</th>
                  <th className="num">{t("admin.finance.vouchers")}</th>
                  {cols.map(([, c]) => <th key={c} className="num">{t(`admin.split.${c}Short`, { rate: "" })}</th>)}
                </tr>
              </thead>
              {data && (
                <tbody>
                  {months.map(([m, v]) => (
                    <tr key={m}>
                      <td><b>{monthName(m)}</b></td>
                      <td className="num">{int(v.vouchers, locale)}</td>
                      {cols.map(([k]) => <td key={k} className="num">{money(v[k])}</td>)}
                    </tr>
                  ))}
                </tbody>
              )}
            </table>
            {!data && !error && <p className="muted empty-row">{t("admin.vo.loading")}</p>}
          </div>
        </section>

        <section className="panel span-12">
          <div className="panel-h"><div><h2>{t("admin.finance.payouts")}</h2><p className="muted small">{t("admin.finance.payoutsHint")}</p></div></div>
          <div className="table-wrap">
            <table className="tbl">
              <thead>
                <tr>
                  <th>{t("admin.merchant")}</th>
                  <th className="num">{t("admin.finance.redeemed")}</th>
                  <th className="num">{t("admin.finance.owed")}</th>
                  <th className="num">{t("admin.finance.open")}</th>
                  <th className="num">{t("admin.finance.openOwed")}</th>
                  <th>{t("admin.finance.lastRedeemed")}</th>
                </tr>
              </thead>
              {data && (
                <tbody>
                  {data.merchants.map((m) => (
                    <tr key={m.merchantId}>
                      <td><b>{m.name}</b></td>
                      <td className="num">{int(m.redeemedVouchers, locale)}</td>
                      <td className="num"><b>{money(m.redeemedPayoutCents)}</b></td>
                      <td className="num">{int(m.openVouchers, locale)}</td>
                      <td className="num">{money(m.openPayoutCents)}</td>
                      <td>{m.lastRedeemedAt ? dateTime(m.lastRedeemedAt, locale) : "–"}</td>
                    </tr>
                  ))}
                </tbody>
              )}
            </table>
            {!data && !error && <p className="muted empty-row">{t("admin.vo.loading")}</p>}
            {data && !data.merchants.length && <p className="muted empty-row">{t("admin.finance.noPayouts")}</p>}
          </div>
        </section>
      </div>
    </>
  );
}
