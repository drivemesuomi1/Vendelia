"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Icon, type IconName } from "@/components/ui/Icon";
import { useI18n } from "@/i18n/I18nProvider";
import { formatMoney, loc } from "@/lib/format";
import { useAppData } from "@/lib/meta-context";
import { ago, dayLabel, int, moneyCompact, ratio } from "../format";
import { DEMO_DAYS, splitMoney, type AdminDemoData } from "../mock-data";
import { BarList, Donut, SERIES, Sparkline, StackedBar, TrendChart, type ChartItem } from "./charts";

const RANGES = [7, 30, 90] as const;
type Range = (typeof RANGES)[number];

/** Share of a day's vouchers that are redeemed / refunded / expired, by age. Demo approximation. */
function voucherFate(age: number, i: number) {
  const refunded = 0.012 + ((i * 37) % 10) / 1000;
  const expired = age > 90 ? 0.06 : 0;
  const redeemed = Math.min(0.82, (age / 50) * 0.82) * (1 - refunded - expired);
  return { redeemed, refunded, expired, active: Math.max(0, 1 - redeemed - refunded - expired) };
}

function sum(a: number[]) {
  return a.reduce((x, y) => x + y, 0);
}

/** Buckets a long daily series into at most `n` points for sparklines. */
function bucket(values: number[], n = 24) {
  const size = Math.ceil(values.length / n);
  const out: number[] = [];
  for (let i = 0; i < values.length; i += size) out.push(sum(values.slice(i, i + size)));
  return out;
}

export function AdminDashboard({ data, today }: { data: AdminDemoData; today: string }) {
  const { t, locale } = useI18n();
  const { meta } = useAppData();
  const [range, setRange] = useState<Range>(30);
  const base = `/${locale}/admin`;
  const money = (c: number) => formatMoney(c, locale);

  const s = useMemo(() => {
    const N = DEMO_DAYS;
    const cur = [N - range, N] as const;
    const prev = [N - 2 * range, N - range] as const;
    const empty = () => Array.from({ length: range }, () => 0);
    const gross = { cur: empty(), prev: empty() };
    const vouchers = { cur: empty(), prev: empty() };
    const revenue = { cur: empty(), prev: empty() };
    const fate = { cur: { redeemed: 0, refunded: 0, expired: 0, active: 0 }, prev: { redeemed: 0, refunded: 0, expired: 0, active: 0 } };
    const split = { gross: 0, saleVat: 0, net: 0, commission: 0, commissionVat: 0, payout: 0 };
    const byCat: Record<string, number> = {};
    const byCity: Record<string, number> = {};
    const byDeal: Record<string, { sold: number; gross: number; redeemed: number }> = {};

    for (const deal of data.deals) {
      const daily = data.sales[deal.id]!;
      for (const [key, [from, to]] of [["cur", cur], ["prev", prev]] as const) {
        for (let i = from; i < to; i++) {
          const q = daily[i] ?? 0;
          if (!q) continue;
          const g = q * deal.priceCents;
          const sp = splitMoney(g, deal.vatBps);
          gross[key][i - from]! += g;
          vouchers[key][i - from]! += q;
          revenue[key][i - from]! += sp.commission;
          // Age as of the end of its own period, so both periods are compared on equal terms.
          const f = voucherFate(N - 1 - i - (key === "prev" ? range : 0), i);
          for (const k of ["redeemed", "refunded", "expired", "active"] as const) fate[key][k] += q * f[k];
          if (key === "cur") {
            for (const k of Object.keys(split) as (keyof typeof split)[]) split[k] += sp[k];
            byCat[deal.categoryId] = (byCat[deal.categoryId] ?? 0) + g;
            byCity[deal.cityId] = (byCity[deal.cityId] ?? 0) + g;
            const d = (byDeal[deal.id] ??= { sold: 0, gross: 0, redeemed: 0 });
            d.sold += q;
            d.gross += g;
            d.redeemed += q * f.redeemed;
          }
        }
      }
    }
    const v = { cur: sum(vouchers.cur), prev: sum(vouchers.prev) };
    const orders = { cur: Math.round(v.cur / 1.27), prev: Math.round(v.prev / 1.27) };
    const g = { cur: sum(gross.cur), prev: sum(gross.prev) };
    return {
      labels: data.days.slice(cur[0]).map((d) => dayLabel(d, locale)),
      gross,
      vouchers,
      revenue,
      split,
      byCat,
      byCity,
      byDeal,
      kpi: {
        gross: g,
        revenue: { cur: sum(revenue.cur), prev: sum(revenue.prev) },
        vouchers: v,
        orders,
        aov: { cur: g.cur / Math.max(orders.cur, 1), prev: g.prev / Math.max(orders.prev, 1) },
        redemption: { cur: fate.cur.redeemed / Math.max(v.cur, 1), prev: fate.prev.redeemed / Math.max(v.prev, 1) },
        refundRate: { cur: fate.cur.refunded / Math.max(v.cur, 1), prev: fate.prev.refunded / Math.max(v.prev, 1) },
      },
      fate: fate.cur,
    };
  }, [data, range, locale]);

  const k = s.kpi;
  const activeMerchants = data.merchants.filter((m) => m.status === "active").length;
  const liveDeals = data.deals.filter((d) => d.status === "live").length;
  const tiles: { label: string; hint?: string; value: string; delta: number | null; spark?: number[]; invert?: boolean }[] = [
    { label: t("admin.kpi.gross"), hint: t("admin.kpi.grossHint"), value: money(k.gross.cur), delta: k.gross.cur / k.gross.prev - 1, spark: s.gross.cur },
    { label: t("admin.kpi.revenue"), hint: t("admin.kpi.revenueHint"), value: money(k.revenue.cur), delta: k.revenue.cur / k.revenue.prev - 1, spark: s.revenue.cur },
    { label: t("admin.kpi.vouchers"), value: int(k.vouchers.cur, locale), delta: k.vouchers.cur / k.vouchers.prev - 1, spark: s.vouchers.cur },
    { label: t("admin.kpi.orders"), value: int(k.orders.cur, locale), delta: k.orders.cur / k.orders.prev - 1 },
    { label: t("admin.kpi.aov"), value: money(Math.round(k.aov.cur)), delta: k.aov.cur / k.aov.prev - 1 },
    { label: t("admin.kpi.redemption"), value: ratio(k.redemption.cur, locale), delta: k.redemption.cur - k.redemption.prev },
    { label: t("admin.kpi.refundRate"), value: ratio(k.refundRate.cur, locale), delta: k.refundRate.cur - k.refundRate.prev, invert: true },
    { label: t("admin.kpi.merchants"), hint: t("admin.kpi.liveDealsHint", { n: liveDeals }), value: int(activeMerchants, locale), delta: null },
  ];

  const catItems: ChartItem[] = meta.categories.map((c, i) => ({
    key: c.id,
    label: loc(c.name, locale),
    value: s.byCat[c.id] ?? 0,
    color: SERIES[i % SERIES.length]!,
    display: money(s.byCat[c.id] ?? 0),
  }));
  const cityItems: ChartItem[] = meta.cities.map((c, i) => ({
    key: c.id,
    label: loc(c.name, locale),
    value: s.byCity[c.id] ?? 0,
    color: SERIES[i % SERIES.length]!,
    display: money(s.byCity[c.id] ?? 0),
  }));
  const fateItems: ChartItem[] = (
    [
      ["redeemed", SERIES[2]],
      ["active", SERIES[0]],
      ["expired", "#9AA0AE"],
      ["refunded", SERIES[1]],
    ] as const
  ).map(([key, color]) => ({ key, label: t(`admin.vstatus.${key}`), value: s.fate[key], color, display: int(Math.round(s.fate[key]), locale) }));

  const topDeals = Object.entries(s.byDeal)
    .sort((a, b) => b[1].gross - a[1].gross)
    .slice(0, 6)
    .map(([id, v]) => ({ deal: data.deals.find((d) => d.id === id)!, ...v }));
  const merchantName = (id: string) => data.merchants.find((m) => m.id === id)?.name ?? "";

  const attention: { n: number; label: string; href: string; icon: IconName; tone: "warn" | "danger" | "indigo" }[] = [
    { n: data.deals.filter((d) => d.status === "pending").length, label: t("admin.attn.deals"), href: `${base}/deals?status=pending`, icon: "doc", tone: "warn" },
    { n: data.merchants.filter((m) => m.status === "pending").length, label: t("admin.attn.merchants"), href: `${base}/merchants`, icon: "store", tone: "warn" },
    { n: data.payouts.filter((p) => p.status === "failed").length, label: t("admin.attn.payouts"), href: `${base}/finance`, icon: "bank", tone: "danger" },
    { n: data.openTickets, label: t("admin.attn.tickets"), href: `${base}/support`, icon: "help", tone: "indigo" },
  ];

  const splitRows: [string, number, boolean?][] = [
    [t("admin.split.gross"), s.split.gross, true],
    [t("admin.split.saleVat"), -s.split.saleVat],
    [t("admin.split.net"), s.split.net, true],
    [t("admin.split.commission", { rate: "15 %" }), -s.split.commission],
    [t("admin.split.commissionVat", { rate: "25,5 %" }), -s.split.commissionVat],
    [t("admin.split.payout"), s.split.payout, true],
  ];

  return (
    <div className="adm">
      <header className="adm-head">
        <div>
          <h1>{t("admin.overview")}</h1>
          <p className="muted small">{today} · <span className="demo-pill" title={t("admin.demoHint")}><Icon name="info" />{t("admin.demo")}</span></p>
        </div>
        <div className="seg" role="group" aria-label={t("admin.rangeLabel")}>
          {RANGES.map((r) => (
            <button key={r} type="button" aria-pressed={range === r} onClick={() => setRange(r)}>{t("admin.range", { n: r })}</button>
          ))}
        </div>
      </header>

      <section className="adm-kpis" aria-label={t("admin.kpiTitle")}>
        {tiles.map((tile) => {
          const up = (tile.delta ?? 0) >= 0;
          const flat = Math.abs(tile.delta ?? 0) < 0.0005;
          const good = tile.invert ? !up : up;
          // Rates change in percentage points, amounts in percent.
          const pts = tile === tiles[5] || tile === tiles[6];
          const abs = Math.abs(tile.delta ?? 0);
          const deltaText = pts ? `${ratio(abs, locale).replace(/\s?%$/, "")} ${t("admin.pts")}` : ratio(abs, locale);
          return (
            <div className="kpi-tile" key={tile.label}>
              <p className="kt-label">{tile.label}{tile.hint && <span>{tile.hint}</span>}</p>
              <p className="kt-value">{tile.value}</p>
              <div className="kt-foot">
                {tile.delta !== null && Number.isFinite(tile.delta) ? (
                  <span className={`delta ${flat ? "flat" : good ? "good" : "bad"}`} aria-label={t(up ? "admin.deltaUp" : "admin.deltaDown", { v: deltaText, days: range })}>
                    {flat ? "±" : up ? "▲" : "▼"} {deltaText}
                  </span>
                ) : <span />}
                {tile.spark && <Sparkline values={bucket(tile.spark)} />}
              </div>
            </div>
          );
        })}
      </section>
      <p className="muted small vs">{t("admin.vsPrev", { days: range })}</p>

      <div className="adm-grid">
        <section className="panel span-8">
          <div className="panel-h">
            <div>
              <h2>{t("admin.chart.sales")}</h2>
              <p className="muted small">{t("admin.chart.salesSub")}</p>
            </div>
            <p className="panel-big">{money(k.gross.cur)}</p>
          </div>
          <TrendChart
            title={t("admin.chart.sales")}
            labels={s.labels}
            current={s.gross.cur}
            previous={s.gross.prev}
            format={money}
            axisFormat={(v) => moneyCompact(v, locale)}
            currentLabel={t("admin.chart.thisPeriod")}
            previousLabel={t("admin.chart.prevPeriod")}
          />
        </section>

        <section className="panel span-4">
          <div className="panel-h"><h2>{t("admin.attention")}</h2></div>
          <ul className="attn">
            {attention.map((a) => (
              <li key={a.label}>
                <Link href={a.href}>
                  <span className={`attn-ic ${a.tone}`}><Icon name={a.icon} /></span>
                  <span className="attn-t">{a.label}</span>
                  <b className="attn-n">{a.n}</b>
                  <Icon name="right" />
                </Link>
              </li>
            ))}
          </ul>
          <div className="mini-stat">
            <p className="muted small">{t("admin.nextPayout")}</p>
            <p><b>{money(sum(data.payouts.filter((p) => p.status === "scheduled").map((p) => p.amountCents)))}</b> · {t("admin.toMerchants", { n: data.payouts.filter((p) => p.status === "scheduled").length })}</p>
          </div>
        </section>

        <section className="panel span-4">
          <div className="panel-h"><div><h2>{t("admin.chart.byCategory")}</h2><p className="muted small">{t("admin.kpi.grossHint")}</p></div></div>
          <BarList title={t("admin.chart.byCategory")} items={catItems} />
        </section>

        <section className="panel span-4">
          <div className="panel-h"><div><h2>{t("admin.chart.byCity")}</h2><p className="muted small">{t("admin.kpi.grossHint")}</p></div></div>
          <Donut title={t("admin.chart.byCity")} items={cityItems} totalLabel={t("admin.total")} totalDisplay={moneyCompact(k.gross.cur, locale)} />
        </section>

        <section className="panel span-4">
          <div className="panel-h"><div><h2>{t("admin.chart.voucherStatus")}</h2><p className="muted small">{t("admin.chart.voucherStatusSub")}</p></div></div>
          <p className="panel-big">{ratio(k.redemption.cur, locale)} <span className="muted small">{t("admin.kpi.redemption").toLowerCase()}</span></p>
          <StackedBar title={t("admin.chart.voucherStatus")} items={fateItems} />
        </section>

        <section className="panel span-7">
          <div className="panel-h">
            <h2>{t("admin.topDeals")}</h2>
            <Link className="link-sm" href={`${base}/deals?status=live`}>{t("admin.viewAll")}<Icon name="right" /></Link>
          </div>
          <div className="table-wrap">
            <table className="tbl">
              <thead>
                <tr><th>{t("admin.col.deal")}</th><th className="num">{t("admin.col.sold")}</th><th className="num">{t("admin.col.gross")}</th><th className="num">{t("admin.col.redeemed")}</th></tr>
              </thead>
              <tbody>
                {topDeals.map((d, i) => (
                  <tr key={d.deal.id}>
                    <td>
                      <div className="cell-deal">
                        <span className="rank">{i + 1}</span>
                        <span><b>{loc(d.deal.title, locale)}</b><small className="muted">{merchantName(d.deal.merchantId)}</small></span>
                      </div>
                    </td>
                    <td className="num">{int(d.sold, locale)}</td>
                    <td className="num">{money(d.gross)}</td>
                    <td className="num">
                      <span className="meter" aria-hidden="true"><span style={{ width: `${(d.redeemed / Math.max(d.sold, 1)) * 100}%` }} /></span>
                      {ratio(d.redeemed / Math.max(d.sold, 1), locale, 0)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="panel span-5">
          <div className="panel-h"><div><h2>{t("admin.chart.split")}</h2><p className="muted small">{t("admin.chart.splitSub")}</p></div></div>
          <ul className="split-list">
            {splitRows.map(([label, value, strong]) => (
              <li key={label} className={strong ? "strong" : ""}>
                <div className="bl-row"><span>{label}</span><span className="num">{value < 0 ? "− " : ""}{money(Math.abs(value))}</span></div>
                <div className="bl-track"><div className="bl-bar" style={{ width: `${(Math.abs(value) / Math.max(s.split.gross, 1)) * 100}%`, background: strong ? SERIES[0] : "#C9CDDA" }} /></div>
              </li>
            ))}
          </ul>
          <p className="muted small" style={{ marginTop: 12 }}>{t("admin.split.note")}</p>
        </section>

        <section className="panel span-7">
          <div className="panel-h">
            <h2>{t("admin.recentOrders")}</h2>
            <Link className="link-sm" href={`${base}/orders`}>{t("admin.viewAll")}<Icon name="right" /></Link>
          </div>
          <ul className="feed">
            {data.orders.slice(0, 6).map((o) => {
              const deal = data.deals.find((d) => d.id === o.dealId)!;
              return (
                <li key={o.number}>
                  <span className="feed-ic"><Icon name="cart" /></span>
                  <span className="feed-t">
                    <b>{o.qty} × {loc(deal.title, locale)}</b>
                    <small className="muted">{o.number} · {o.email} · {ago(o.minutesAgo, locale)}</small>
                  </span>
                  <span className="feed-r">
                    <b className="num">{money(o.totalCents)}</b>
                    <span className={`st st-${o.status}`}>{t(`admin.ostatus.${o.status}`)}</span>
                  </span>
                </li>
              );
            })}
          </ul>
        </section>

        <section className="panel span-5">
          <div className="panel-h"><h2>{t("admin.activity")}</h2></div>
          <ol className="timeline">
            {data.activity.map((a, i) => (
              <li key={i}>
                <p>{t(`admin.act.${a.action}`, { target: a.target })}</p>
                <small className="muted">{a.actor} · {ago(a.minutesAgo, locale)}</small>
              </li>
            ))}
          </ol>
        </section>
      </div>
    </div>
  );
}
