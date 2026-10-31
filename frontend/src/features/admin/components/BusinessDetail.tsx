"use client";

import Link from "next/link";
import { useMemo, useState, type FormEvent, type ReactNode } from "react";
import { Dialog } from "@/components/ui/Dialog";
import { Icon, type IconName } from "@/components/ui/Icon";
import { useI18n } from "@/i18n/I18nProvider";
import { formatMoney, loc } from "@/lib/format";
import { useAppData } from "@/lib/meta-context";
import { DealChip } from "@/features/portal-demo/DealChip";
import { splitPrice } from "@/features/portal-demo/money";
import {
  addBusinessNote,
  removeBusinessNote,
  resetBusinessPassword,
  setBusinessStatus,
  updateBusiness,
  useDemoStore,
  useHydrated,
  type BusinessDetails,
  type BusinessEvent,
  type BusinessStatus,
  type DemoBusiness,
} from "@/features/portal-demo/store";
import { ago, dateTime, dayLabel, int, ratio } from "../format";
import { DealReviewDrawer } from "./DealReviewDrawer";
import { TrendChart } from "./charts";
import { generatePassword } from "./ManageBusinesses";

const RANGES = [30, 90] as const;
const DAY = 864e5;
const EVENT_ICON: Record<BusinessEvent["type"], IconName> = {
  created: "store",
  status: "lock",
  passwordIssued: "lock",
  passwordSet: "check",
  signIn: "logout",
  dealSubmitted: "doc",
  dealResubmitted: "doc",
  dealApproved: "checkc",
  dealRejected: "xc",
  dealWithdrawn: "trash",
  noteAdded: "mail",
  detailsEdited: "doc",
};

/** Everything the admin knows about one business: profile, account, deals, activity and private notes. */
export function BusinessDetail({ id }: { id: string }) {
  const { t, locale } = useI18n();
  const { meta } = useAppData();
  const { businesses, deals, events } = useDemoStore();
  const hydrated = useHydrated();
  const [range, setRange] = useState<(typeof RANGES)[number]>(30);
  const [reviewId, setReviewId] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [issued, setIssued] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [noteText, setNoteText] = useState("");

  const b = businesses.find((x) => x.id === id);
  const mine = useMemo(() => deals.filter((d) => d.businessId === id).sort((a, c) => c.submittedAt.localeCompare(a.submittedAt)), [deals, id]);
  const log = useMemo(() => events.filter((e) => e.businessId === id), [events, id]);

  const stats = useMemo(() => {
    const reviewed = mine.filter((d) => d.reviewedAt);
    const approved = reviewed.filter((d) => d.status === "live").length;
    const hours = reviewed.map((d) => (Date.parse(d.reviewedAt!) - Date.parse(d.submittedAt)) / 36e5);
    return { reviewed: reviewed.length, approvalRate: reviewed.length ? approved / reviewed.length : null, avgReviewHours: hours.length ? hours.reduce((a, c) => a + c, 0) / hours.length : null };
  }, [mine]);

  const chart = useMemo(() => {
    const now = Date.now();
    const days = Array.from({ length: range }, (_, i) => new Date(now - (range - 1 - i) * DAY).toISOString().slice(0, 10));
    const per = (dates: (string | null)[]) => days.map((d) => dates.filter((x) => x?.slice(0, 10) === d).length);
    return {
      labels: days.map((d) => dayLabel(d, locale)),
      submitted: per(log.filter((e) => e.type === "dealSubmitted" || e.type === "dealResubmitted").map((e) => e.at)),
      decided: per(log.filter((e) => e.type === "dealApproved" || e.type === "dealRejected").map((e) => e.at)),
    };
  }, [log, range, locale]);

  if (!hydrated) return <div className="adm" aria-busy="true" />;
  if (!b) {
    return (
      <div className="adm">
        <Link className="back-link" href={`/${locale}/admin/businesses`}><Icon name="left" />{t("admin.bd.back")}</Link>
        <div className="panel empty-state">
          <span className="attn-ic danger"><Icon name="xc" /></span>
          <h3>{t("admin.bd.notFoundTitle")}</h3>
          <p className="muted small">{t("admin.bd.notFoundText")}</p>
        </div>
      </div>
    );
  }

  const city = loc(meta.cities.find((c) => c.id === b.cityId)?.name, locale);
  const category = loc(meta.categories.find((c) => c.id === b.categoryId)?.name, locale);
  const count = (s: "live" | "pending" | "rejected") => mine.filter((d) => d.status === s).length;
  const reviewDeal = mine.find((d) => d.id === reviewId) ?? null;
  const duration = (h: number | null) => (h === null ? "–" : h < 24 ? t("admin.ov.hours", { n: Math.max(1, Math.round(h)) }) : t("admin.ov.days", { n: Math.round(h / 24) }));
  const when = (iso: string | null) => (iso ? ago((Date.now() - Date.parse(iso)) / 6e4, locale) : t("admin.bd.never"));

  const statusChip = (s: BusinessStatus) =>
    s === "active" ? <span className="chip teal"><Icon name="checkc" />{t("admin.active")}</span>
      : s === "pending" ? <span className="chip warn"><Icon name="clock" />{t("admin.pending")}</span>
      : <span className="chip danger"><Icon name="xc" />{t("admin.suspended")}</span>;

  const resetPassword = async () => {
    if (!confirm(t("admin.mb.confirmReset", { name: b.name }))) return;
    const password = generatePassword();
    await resetBusinessPassword(b.id, password);
    setIssued(password);
  };

  const copyAll = async () => {
    try {
      await navigator.clipboard.writeText(`${window.location.origin}/${locale}/business\n${b.email}\n${issued}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      /* clipboard blocked */
    }
  };

  const eventText = (e: BusinessEvent) =>
    t(`admin.bd.ev.${e.type}`, { detail: e.type === "status" ? t(`admin.${e.detail}`) : e.detail ?? "" });

  const addNote = (e: FormEvent) => {
    e.preventDefault();
    if (!noteText.trim()) return;
    addBusinessNote(b.id, noteText);
    setNoteText("");
  };

  const kpis: [string, string][] = [
    [t("admin.bd.kpi.deals"), int(mine.length, locale)],
    [t("admin.dr.live"), int(count("live"), locale)],
    [t("admin.dr.pending"), int(count("pending"), locale)],
    [t("admin.dr.rejected"), int(count("rejected"), locale)],
    [t("admin.ov.approvalRate"), stats.approvalRate === null ? "–" : ratio(stats.approvalRate, locale, 0)],
    [t("admin.bd.kpi.avgReview"), duration(stats.avgReviewHours)],
    [t("admin.bd.account.lastSignIn"), when(b.lastSignInAt)],
    [t("admin.bd.account.signIns"), int(b.signInCount, locale)],
  ];

  const row = (label: string, value: ReactNode) => (
    <div><dt>{label}</dt><dd>{value || "–"}</dd></div>
  );

  return (
    <div className="adm">
      <Link className="back-link" href={`/${locale}/admin/businesses`}><Icon name="left" />{t("admin.bd.back")}</Link>

      <header className="adm-head">
        <div className="bd-title">
          <span className="bd-avatar" aria-hidden="true">{b.name.slice(0, 1).toUpperCase()}</span>
          <div>
            <h1>{b.name} {statusChip(b.status)}</h1>
            <p className="muted small">{b.companyName} · {b.businessId} · {city} · {category}</p>
          </div>
        </div>
        <div className="row wrap-row" style={{ gap: 8 }}>
          <button className="btn btn-secondary btn-sm" onClick={() => setEditing(true)}><Icon name="doc" />{t("admin.bd.edit")}</button>
          <button className="btn btn-secondary btn-sm" onClick={resetPassword}><Icon name="lock" />{t("admin.mb.reset")}</button>
          {b.status !== "active"
            ? <button className="btn btn-primary btn-sm" onClick={() => setBusinessStatus(b.id, "active")}>{t("admin.activate")}</button>
            : <button className="btn btn-danger btn-sm" onClick={() => setBusinessStatus(b.id, "suspended")}>{t("admin.suspend")}</button>}
        </div>
      </header>

      {issued && (
        <section className="panel mb-issued" aria-live="polite" style={{ marginBottom: 20 }}>
          <div className="panel-h">
            <div className="row" style={{ gap: 12 }}>
              <span className="attn-ic indigo"><Icon name="lock" /></span>
              <div>
                <h2>{t("admin.mb.resetTitle", { name: b.name })}</h2>
                <p className="muted small">{t("admin.mb.issuedHint")}</p>
              </div>
            </div>
            <button className="btn btn-ghost btn-sm" onClick={() => setIssued(null)} aria-label={t("admin.mb.close")}><Icon name="x" /></button>
          </div>
          <dl className="cred">
            <div><dt>{t("admin.mb.loginEmail")}</dt><dd className="mono">{b.email}</dd><span /></div>
            <div><dt>{t("admin.mb.tempPassword")}</dt><dd className="mono pw">{issued}</dd><button className="btn btn-secondary btn-sm" onClick={copyAll}>{copied ? t("admin.mb.copied") : t("admin.mb.copyAll")}</button></div>
          </dl>
          <p className="hint" style={{ marginTop: 10 }}>{t("admin.mb.firstLoginNote")}</p>
        </section>
      )}

      <section className="adm-kpis" aria-label={t("admin.kpiTitle")}>
        {kpis.map(([label, value]) => (
          <div className="kpi-tile" key={label}><p className="kt-label">{label}</p><p className="kt-value">{value}</p></div>
        ))}
      </section>

      <div className="adm-grid" style={{ marginTop: 20 }}>
        <section className="panel span-8">
          <div className="panel-h">
            <div><h2>{t("admin.bd.chart.title")}</h2><p className="muted small">{t("admin.bd.chart.sub")}</p></div>
            <div className="seg" role="group" aria-label={t("admin.rangeLabel")}>
              {RANGES.map((r) => <button key={r} type="button" aria-pressed={range === r} onClick={() => setRange(r)}>{t("admin.range", { n: r })}</button>)}
            </div>
          </div>
          <TrendChart
            title={t("admin.bd.chart.title")}
            labels={chart.labels}
            current={chart.submitted}
            previous={chart.decided}
            format={(v) => int(v, locale)}
            axisFormat={(v) => (Number.isInteger(v) ? int(v, locale) : "")}
            currentLabel={t("admin.ov.submitted")}
            previousLabel={t("admin.ov.reviewed")}
            height={220}
          />
        </section>

        <section className="panel span-4">
          <div className="panel-h"><h2>{t("admin.bd.account.title")}</h2>{statusChip(b.status)}</div>
          <dl className="facts">
            {row(t("admin.mb.loginEmail"), <span className="mono">{b.email}</span>)}
            {row(t("admin.bd.account.password"), b.mustChangePassword
              ? <span className="chip warn"><Icon name="clock" />{t("admin.bd.account.pwTemp")}</span>
              : <span className="chip teal"><Icon name="checkc" />{t("admin.bd.account.pwSetOn", { date: b.passwordChangedAt ? dateTime(b.passwordChangedAt, locale) : "–" })}</span>)}
            {row(t("admin.bd.account.lastSignIn"), b.lastSignInAt ? `${dateTime(b.lastSignInAt, locale)} (${when(b.lastSignInAt)})` : t("admin.bd.never"))}
            {row(t("admin.bd.account.signIns"), int(b.signInCount, locale))}
            {row(t("admin.bd.account.created"), dateTime(b.createdAt, locale))}
          </dl>
        </section>

        <section className="panel span-8">
          <div className="panel-h"><h2>{t("admin.bd.deals.title")}</h2></div>
          {mine.length === 0 ? (
            <p className="muted small empty-row">{t("admin.bd.deals.empty")}</p>
          ) : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>{t("admin.col.deal")}</th>
                    <th>{t("business.colStatus")}</th>
                    <th className="num">{t("admin.dr.from")}</th>
                    <th className="num">{t("business.yourPayout")}</th>
                    <th>{t("admin.dr.submitted")}</th>
                    <th><span className="sr-only">{t("admin.actions")}</span></th>
                  </tr>
                </thead>
                <tbody>
                  {mine.map((d) => {
                    const from = Math.min(...d.input.options.map((o) => o.priceCents));
                    return (
                      <tr key={d.id}>
                        <td>
                          <div className="cell-deal">
                            {d.input.imageUrl ? <img className="thumb-sm" src={d.input.imageUrl} alt="" /> : <span className="thumb-sm" />}
                            <span>
                              <b>{d.input.title.fi}</b>
                              <small className="muted">{t("admin.bd.deals.options", { n: d.input.options.length })}{d.revision > 1 && ` · ${t("admin.dr.revision", { n: d.revision })}`}</small>
                            </span>
                          </div>
                        </td>
                        <td>
                          <DealChip status={d.status} />
                          {d.reviewedAt && <small className="muted block">{dateTime(d.reviewedAt, locale)}</small>}
                        </td>
                        <td className="num">{formatMoney(from, locale)}</td>
                        <td className="num">{formatMoney(splitPrice(from, d.input.vatBps, meta.commissionBps, meta.commissionVatBps).payoutCents, locale)}</td>
                        <td>{dateTime(d.submittedAt, locale)}</td>
                        <td><div className="mb-actions"><button className={`btn btn-sm ${d.status === "pending" ? "btn-primary" : "btn-secondary"}`} onClick={() => setReviewId(d.id)}>{t(d.status === "pending" ? "admin.dr.review" : "admin.dr.view")}</button></div></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section className="panel span-4">
          <div className="panel-h"><h2>{t("admin.bd.details.title")}</h2><button className="btn btn-ghost btn-sm" onClick={() => setEditing(true)}>{t("admin.bd.edit")}</button></div>
          <dl className="facts">
            {row(t("auth.displayName"), b.name)}
            {row(t("auth.companyName"), b.companyName)}
            {row(t("common.businessId"), <span className="mono">{b.businessId}</span>)}
            {row(t("admin.mb.city"), city)}
            {row(t("admin.mb.category"), category)}
            {row(t("auth.contactName"), b.contactName)}
            {row(t("admin.mb.phone"), b.phone)}
          </dl>
        </section>

        <section className="panel span-7">
          <div className="panel-h"><div><h2>{t("admin.bd.activity.title")}</h2><p className="muted small">{t("admin.bd.activity.sub", { n: log.length })}</p></div></div>
          {log.length === 0 ? (
            <p className="muted small empty-row">{t("admin.bd.activity.empty")}</p>
          ) : (
            <ol className="timeline timeline-icons">
              {log.slice(0, 30).map((e) => (
                <li key={e.id}>
                  <span className="tl-ic"><Icon name={EVENT_ICON[e.type]} /></span>
                  <p>{eventText(e)}</p>
                  {e.note && <p className="tl-note">{e.note}</p>}
                  <small className="muted">{dateTime(e.at, locale)} · {ago((Date.now() - Date.parse(e.at)) / 6e4, locale)}</small>
                </li>
              ))}
            </ol>
          )}
        </section>

        <section className="panel span-5">
          <div className="panel-h"><div><h2>{t("admin.bd.notes.title")}</h2><p className="muted small">{t("admin.bd.notes.hint")}</p></div></div>
          <form className="note-form" onSubmit={addNote}>
            <label className="sr-only" htmlFor="bd-note">{t("admin.bd.notes.title")}</label>
            <textarea id="bd-note" className="input" rows={3} value={noteText} placeholder={t("admin.bd.notes.placeholder")} onChange={(e) => setNoteText(e.target.value)} />
            <button className="btn btn-primary btn-sm" type="submit" disabled={!noteText.trim()}><Icon name="plus" />{t("admin.bd.notes.add")}</button>
          </form>
          {b.notes.length === 0 ? (
            <p className="muted small empty-row">{t("admin.bd.notes.empty")}</p>
          ) : (
            <ul className="notes">
              {b.notes.map((n) => (
                <li key={n.id}>
                  <p>{n.text}</p>
                  <div className="row between">
                    <small className="muted">{dateTime(n.at, locale)}</small>
                    <button className="btn btn-ghost btn-sm" type="button" onClick={() => confirm(t("admin.bd.notes.confirmDelete")) && removeBusinessNote(b.id, n.id)} aria-label={t("admin.bd.notes.delete")}><Icon name="trash" /></button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <DealReviewDrawer key={reviewId ?? "none"} deal={reviewDeal} onClose={() => setReviewId(null)} />
      <EditDrawer key={editing ? b.id : "closed"} business={b} open={editing} onClose={() => setEditing(false)} />
    </div>
  );
}

function EditDrawer({ business, open, onClose }: { business: DemoBusiness; open: boolean; onClose: () => void }) {
  const { t, locale } = useI18n();
  const { meta } = useAppData();
  const [f, setF] = useState<BusinessDetails>({ name: business.name, companyName: business.companyName, contactName: business.contactName, phone: business.phone, cityId: business.cityId, categoryId: business.categoryId });
  const [error, setError] = useState(false);
  const set = (k: keyof BusinessDetails, v: string) => {
    setF((p) => ({ ...p, [k]: v }));
    setError(false);
  };

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!f.name.trim() || !f.companyName.trim() || !f.contactName.trim()) return setError(true);
    updateBusiness(business.id, { ...f, name: f.name.trim(), companyName: f.companyName.trim(), contactName: f.contactName.trim(), phone: f.phone.trim() });
    onClose();
  };

  const field = (k: keyof BusinessDetails, label: string, required = false) => (
    <div className="mb-field">
      <label htmlFor={`ed-${k}`}>{label}</label>
      <input id={`ed-${k}`} className="input" value={f[k]} onChange={(e) => set(k, e.target.value)} aria-invalid={(required && error && !f[k].trim()) || undefined} />
    </div>
  );

  return (
    <Dialog open={open} onClose={onClose} className="drawer" labelledBy="ed-title">
      <form className="mb-form" onSubmit={submit} noValidate>
        <div className="drawer-head">
          <div>
            <h2 id="ed-title" style={{ fontSize: 20 }}>{t("admin.bd.edit")}</h2>
            <p className="muted small">{t("admin.bd.editHint")}</p>
          </div>
          <button type="button" className="btn btn-ghost btn-sm" onClick={onClose} aria-label={t("admin.mb.close")}><Icon name="x" /></button>
        </div>
        <div className="drawer-body">
          <fieldset>
            <legend>{t("admin.mb.secCompany")}</legend>
            {field("name", t("auth.displayName"), true)}
            {field("companyName", t("auth.companyName"), true)}
            <div className="mb-two">
              <div className="mb-field">
                <label htmlFor="ed-city">{t("admin.mb.city")}</label>
                <select id="ed-city" className="select" value={f.cityId} onChange={(e) => set("cityId", e.target.value)}>
                  {meta.cities.map((c) => <option key={c.id} value={c.id}>{loc(c.name, locale)}</option>)}
                </select>
              </div>
              <div className="mb-field">
                <label htmlFor="ed-cat">{t("admin.mb.category")}</label>
                <select id="ed-cat" className="select" value={f.categoryId} onChange={(e) => set("categoryId", e.target.value)}>
                  {meta.categories.map((c) => <option key={c.id} value={c.id}>{loc(c.name, locale)}</option>)}
                </select>
              </div>
            </div>
          </fieldset>
          <fieldset>
            <legend>{t("admin.mb.secContact")}</legend>
            {field("contactName", t("auth.contactName"), true)}
            {field("phone", t("admin.mb.phone"))}
          </fieldset>
          {error && <p className="err-msg"><Icon name="xc" />{t("admin.mb.errRequired")}</p>}
          <p className="hint">{t("admin.bd.lockedHint")}</p>
        </div>
        <div className="drawer-foot">
          <button className="btn btn-primary btn-block" type="submit"><Icon name="check" />{t("admin.bd.saveChanges")}</button>
          <button className="btn btn-secondary btn-block" type="button" onClick={onClose}>{t("admin.mb.cancel")}</button>
        </div>
      </form>
    </Dialog>
  );
}
