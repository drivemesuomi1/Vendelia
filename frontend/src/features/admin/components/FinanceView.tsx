"use client";

import { useMemo } from "react";
import { useI18n } from "@/i18n/I18nProvider";
import { formatMoney } from "@/lib/format";
import { dayLabel, moneyCompact } from "../format";
import { splitMoney, type AdminDemoData } from "../mock-data";
import { TrendChart } from "./charts";

type Split = ReturnType<typeof splitMoney>;
const zero = (): Split => ({ gross: 0, saleVat: 0, net: 0, commission: 0, commissionVat: 0, payout: 0 });
const add = (a: Split, b: Split) => {
  for (const k of Object.keys(a) as (keyof Split)[]) a[k] += b[k];
};

/** Platform money view: weekly revenue, monthly statement with every ledger component, and payouts. */
export function FinanceView({ data }: { data: AdminDemoData }) {
  const { t, locale } = useI18n();
  const money = (c: number) => formatMoney(c, locale);

  const { weeks, months, last30 } = useMemo(() => {
    const weeks: { label: string; revenue: number }[] = [];
    const months = new Map<string, Split>();
    const last30 = zero();
    const n = data.days.length;
    for (let i = 0; i < n; i++) {
      const day = zero();
      for (const deal of data.deals) {
        const q = data.sales[deal.id]![i] ?? 0;
        if (q) add(day, splitMoney(q * deal.priceCents, deal.vatBps));
      }
      if ((n - 1 - i) % 7 === 6 || i === 0) weeks.push({ label: dayLabel(data.days[i]!, locale), revenue: 0 });
      weeks[weeks.length - 1]!.revenue += day.commission;
      const m = data.days[i]!.slice(0, 7);
      if (!months.has(m)) months.set(m, zero());
      add(months.get(m)!, day);
      if (i >= n - 30) add(last30, day);
    }
    return { weeks: weeks.slice(-26), months: [...months.entries()].reverse().slice(0, 6), last30 };
  }, [data, locale]);

  const monthName = (ym: string) => new Intl.DateTimeFormat(`${locale}-FI`, { month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(`${ym}-01`));
  const name = (id: string) => data.merchants.find((m) => m.id === id)?.name ?? "";
  const cols: (keyof Split)[] = ["gross", "saleVat", "net", "commission", "commissionVat", "payout"];

  return (
    <>
      <section className="adm-kpis four">
        {(
          [
            ["admin.kpi.gross", last30.gross],
            ["admin.kpi.revenue", last30.commission],
            ["admin.split.commissionVatShort", last30.commissionVat],
            ["admin.split.payout", last30.payout],
          ] as const
        ).map(([key, v]) => (
          <div className="kpi-tile" key={key}><p className="kt-label">{t(key, { rate: "25,5 %" })}<span>{t("admin.range", { n: 30 })}</span></p><p className="kt-value">{money(v)}</p></div>
        ))}
      </section>

      <div className="adm-grid" style={{ marginTop: "var(--s3)" }}>
        <section className="panel span-12">
          <div className="panel-h"><div><h2>{t("admin.finance.revenueTrend")}</h2><p className="muted small">{t("admin.kpi.revenueHint")}</p></div></div>
          <TrendChart
            title={t("admin.finance.revenueTrend")}
            labels={weeks.map((w) => w.label)}
            current={weeks.map((w) => w.revenue)}
            format={money}
            axisFormat={(v) => moneyCompact(v, locale)}
            currentLabel={t("admin.kpi.revenue")}
            height={240}
          />
        </section>

        <section className="panel span-12">
          <div className="panel-h"><div><h2>{t("admin.finance.monthly")}</h2><p className="muted small">{t("admin.split.note")}</p></div></div>
          <div className="table-wrap">
            <table className="tbl">
              <thead>
                <tr><th>{t("admin.col.month")}</th>{cols.map((c) => <th key={c} className="num">{t(`admin.split.${c}Short`, { rate: "" })}</th>)}</tr>
              </thead>
              <tbody>
                {months.map(([m, v]) => (
                  <tr key={m}><td><b>{monthName(m)}</b></td>{cols.map((c) => <td key={c} className="num">{money(v[c])}</td>)}</tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="panel span-12">
          <div className="panel-h"><h2>{t("admin.finance.payouts")}</h2></div>
          <div className="table-wrap">
            <table className="tbl">
              <thead>
                <tr><th>{t("admin.merchant")}</th><th>{t("admin.col.period")}</th><th>{t("admin.order.status")}</th><th className="num">{t("admin.col.amount")}</th></tr>
              </thead>
              <tbody>
                {data.payouts.map((p) => (
                  <tr key={p.merchantId}>
                    <td><b>{name(p.merchantId)}</b></td>
                    <td>{dayLabel(data.days[data.days.length - 14]!, locale)} – {dayLabel(data.days[data.days.length - 1]!, locale)}</td>
                    <td><span className={`st st-p-${p.status}`}>{t(`admin.pstatus.${p.status}`)}</span></td>
                    <td className="num"><b>{money(p.amountCents)}</b></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </>
  );
}
