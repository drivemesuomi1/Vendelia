"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Icon, type IconName } from "@/components/ui/Icon";
import { useI18n } from "@/i18n/I18nProvider";
import { loc } from "@/lib/format";
import { useAppData } from "@/lib/meta-context";
import { useDemoStore, useHydrated } from "@/features/portal-demo/store";
import { ago, dayLabel, int, ratio } from "../format";
import { BarList, Donut, SERIES, StackedBar, TrendChart, type ChartItem } from "./charts";

const RANGES = [7, 30, 90] as const;
type Range = (typeof RANGES)[number];
const DAY = 864e5;
const isoDay = (t: number) => new Date(t).toISOString().slice(0, 10);

/**
 * Admin home for the business -> deal -> review flow: what needs attention, how businesses and deals
 * are progressing, and recent activity. Reads the shared demo store (same data as the other admin screens).
 */
export function AdminOverview() {
  const { t, locale } = useI18n();
  const { meta } = useAppData();
  const { businesses, deals } = useDemoStore();
  const hydrated = useHydrated();
  const [range, setRange] = useState<Range>(30);
  const base = `/${locale}/admin`;

  const s = useMemo(() => {
    const now = Date.now();
    const days = Array.from({ length: range }, (_, i) => isoDay(now - (range - 1 - i) * DAY));
    const perDay = (dates: (string | null)[]) => days.map((d) => dates.filter((x) => x?.slice(0, 10) === d).length);
    const since = now - range * DAY;
    const inRange = (iso: string | null) => !!iso && Date.parse(iso) >= since;
    const reviewed = deals.filter((d) => d.reviewedAt && inRange(d.reviewedAt));
    const approved = reviewed.filter((d) => d.status === "live").length;
    const waitHours = deals.filter((d) => d.status === "pending").map((d) => (now - Date.parse(d.submittedAt)) / 36e5);
    return {
      labels: days.map((d) => dayLabel(d, locale)),
      submitted: perDay(deals.map((d) => d.submittedAt)),
      reviewedPerDay: perDay(deals.map((d) => d.reviewedAt)),
      submittedInRange: deals.filter((d) => inRange(d.submittedAt)).length,
      newBusinesses: businesses.filter((b) => inRange(b.createdAt)).length,
      approvalRate: reviewed.length ? approved / reviewed.length : null,
      oldestWaitHours: waitHours.length ? Math.max(...waitHours) : null,
    };
  }, [deals, businesses, range, locale]);

  const pending = deals.filter((d) => d.status === "pending");
  const live = deals.filter((d) => d.status === "live");
  const rejected = deals.filter((d) => d.status === "rejected");
  const notSignedIn = businesses.filter((b) => b.mustChangePassword);
  const pendingBiz = businesses.filter((b) => b.status === "pending");
  const bizName = (id: string) => businesses.find((b) => b.id === id)?.name ?? "–";
  const dash = (v: string) => (hydrated ? v : "–");

  const tiles: { label: string; hint?: string; value: string }[] = [
    { label: t("admin.ov.businesses"), hint: t("admin.ov.newIn", { n: s.newBusinesses }), value: int(businesses.length, locale) },
    { label: t("admin.active"), value: int(businesses.filter((b) => b.status === "active").length, locale) },
    { label: t("admin.ov.awaitingLogin"), value: int(notSignedIn.length, locale) },
    { label: t("admin.ov.dealsSubmitted"), value: int(s.submittedInRange, locale) },
    { label: t("admin.dr.pending"), value: int(pending.length, locale) },
    { label: t("admin.dr.live"), value: int(live.length, locale) },
    { label: t("admin.ov.approvalRate"), value: s.approvalRate === null ? "–" : ratio(s.approvalRate, locale, 0) },
    { label: t("admin.ov.oldestWait"), value: s.oldestWaitHours === null ? "–" : s.oldestWaitHours < 24 ? t("admin.ov.hours", { n: Math.max(1, Math.round(s.oldestWaitHours)) }) : t("admin.ov.days", { n: Math.round(s.oldestWaitHours / 24) }) },
  ];

  const byCategory: ChartItem[] = meta.categories.map((c, i) => {
    const n = deals.filter((d) => d.input.categoryId === c.id).length;
    return { key: c.id, label: loc(c.name, locale), value: n, color: SERIES[i % SERIES.length]!, display: int(n, locale) };
  });
  const byCity: ChartItem[] = meta.cities.map((c, i) => {
    const n = businesses.filter((b) => b.cityId === c.id).length;
    return { key: c.id, label: loc(c.name, locale), value: n, color: SERIES[i % SERIES.length]!, display: int(n, locale) };
  });
  const dealStatus: ChartItem[] = [
    { key: "live", label: t("admin.dr.live"), value: live.length, color: SERIES[2], display: int(live.length, locale) },
    { key: "pending", label: t("admin.dr.pending"), value: pending.length, color: SERIES[3], display: int(pending.length, locale) },
    { key: "rejected", label: t("admin.dr.rejected"), value: rejected.length, color: SERIES[1], display: int(rejected.length, locale) },
  ];

  const attention: { n: number; label: string; href: string; icon: IconName; tone: "warn" | "danger" | "indigo" }[] = [
    { n: pending.length, label: t("admin.attn.deals"), href: `${base}/deals`, icon: "doc", tone: "warn" },
    { n: pendingBiz.length, label: t("admin.attn.merchants"), href: `${base}/businesses`, icon: "store", tone: "warn" },
    { n: notSignedIn.length, label: t("admin.ov.attnLogin"), href: `${base}/businesses`, icon: "lock", tone: "indigo" },
  ];

  type Event = { at: string; text: string; icon: IconName };
  const activity: Event[] = [
    ...businesses.map((b) => ({ at: b.createdAt, text: t("admin.ov.evBusiness", { name: b.name }), icon: "store" as IconName })),
    ...deals.map((d) => ({ at: d.submittedAt, text: t(d.revision > 1 ? "admin.ov.evResubmitted" : "admin.ov.evSubmitted", { name: bizName(d.businessId), deal: d.input.title.fi }), icon: "doc" as IconName })),
    ...deals.filter((d) => d.reviewedAt).map((d) => ({ at: d.reviewedAt!, text: t(d.status === "live" ? "admin.ov.evApproved" : "admin.ov.evRejected", { deal: d.input.title.fi }), icon: (d.status === "live" ? "checkc" : "xc") as IconName })),
  ].sort((a, b) => b.at.localeCompare(a.at)).slice(0, 8);

  const queue = [...pending].sort((a, b) => a.submittedAt.localeCompare(b.submittedAt)).slice(0, 5);
  const empty = hydrated && businesses.length === 0;

  return (
    <div className="adm">
      <header className="adm-head">
        <div>
          <h1>{t("admin.overview")}</h1>
          <p className="muted small">{t("admin.ov.sub")}</p>
        </div>
        <div className="seg" role="group" aria-label={t("admin.rangeLabel")}>
          {RANGES.map((r) => (
            <button key={r} type="button" aria-pressed={range === r} onClick={() => setRange(r)}>{t("admin.range", { n: r })}</button>
          ))}
        </div>
      </header>

      {empty && (
        <section className="panel empty-state" style={{ marginBottom: 20 }}>
          <span className="attn-ic indigo"><Icon name="store" /></span>
          <h3>{t("admin.ov.startTitle")}</h3>
          <p className="muted small">{t("admin.ov.startText")}</p>
          <Link className="btn btn-primary btn-sm" href={`${base}/businesses`}><Icon name="plus" />{t("admin.mb.add")}</Link>
        </section>
      )}

      <section className="adm-kpis" aria-label={t("admin.kpiTitle")}>
        {tiles.map((tile) => (
          <div className="kpi-tile" key={tile.label}>
            <p className="kt-label">{tile.label}{tile.hint && <span>{tile.hint}</span>}</p>
            <p className="kt-value">{dash(tile.value)}</p>
          </div>
        ))}
      </section>

      <div className="adm-grid" style={{ marginTop: 20 }}>
        <section className="panel span-8">
          <div className="panel-h">
            <div>
              <h2>{t("admin.ov.activityChart")}</h2>
              <p className="muted small">{t("admin.ov.activityChartSub")}</p>
            </div>
          </div>
          <TrendChart
            title={t("admin.ov.activityChart")}
            labels={s.labels}
            current={s.submitted}
            previous={s.reviewedPerDay}
            format={(v) => int(v, locale)}
            axisFormat={(v) => (Number.isInteger(v) ? int(v, locale) : "")}
            currentLabel={t("admin.ov.submitted")}
            previousLabel={t("admin.ov.reviewed")}
            height={240}
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
                  <b className="attn-n">{dash(String(a.n))}</b>
                  <Icon name="right" />
                </Link>
              </li>
            ))}
          </ul>
        </section>

        <section className="panel span-4">
          <div className="panel-h"><div><h2>{t("admin.ov.dealStatus")}</h2><p className="muted small">{t("admin.ov.allDeals", { n: deals.length })}</p></div></div>
          <StackedBar title={t("admin.ov.dealStatus")} items={dealStatus} />
        </section>

        <section className="panel span-4">
          <div className="panel-h"><div><h2>{t("admin.ov.byCategory")}</h2><p className="muted small">{t("admin.ov.byCategorySub")}</p></div></div>
          <BarList title={t("admin.ov.byCategory")} items={byCategory} />
        </section>

        <section className="panel span-4">
          <div className="panel-h"><div><h2>{t("admin.ov.byCity")}</h2><p className="muted small">{t("admin.ov.byCitySub")}</p></div></div>
          <Donut title={t("admin.ov.byCity")} items={byCity} totalLabel={t("admin.ov.businesses")} totalDisplay={dash(int(businesses.length, locale))} />
        </section>

        <section className="panel span-7">
          <div className="panel-h">
            <h2>{t("admin.ov.queue")}</h2>
            <Link className="link-sm" href={`${base}/deals`}>{t("admin.viewAll")}<Icon name="right" /></Link>
          </div>
          {queue.length === 0 ? (
            <p className="muted small empty-row">{t("admin.dr.emptyPending")}</p>
          ) : (
            <ul className="feed">
              {queue.map((d) => (
                <li key={d.id}>
                  {d.input.imageUrl ? <img className="thumb-sm" src={d.input.imageUrl} alt="" /> : <span className="feed-ic"><Icon name="doc" /></span>}
                  <span className="feed-t">
                    <b>{d.input.title.fi}</b>
                    <small className="muted">{bizName(d.businessId)} · {ago((Date.now() - Date.parse(d.submittedAt)) / 6e4, locale)}{d.revision > 1 ? ` · ${t("admin.dr.revision", { n: d.revision })}` : ""}</small>
                  </span>
                  <Link className="btn btn-secondary btn-sm" href={`${base}/deals`}>{t("admin.dr.review")}</Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="panel span-5">
          <div className="panel-h"><h2>{t("admin.activity")}</h2></div>
          {activity.length === 0 ? (
            <p className="muted small empty-row">{t("admin.ov.noActivity")}</p>
          ) : (
            <ol className="timeline">
              {activity.map((a, i) => (
                <li key={i}>
                  <p>{a.text}</p>
                  <small className="muted">{ago((Date.now() - Date.parse(a.at)) / 6e4, locale)}</small>
                </li>
              ))}
            </ol>
          )}
        </section>
      </div>
    </div>
  );
}
