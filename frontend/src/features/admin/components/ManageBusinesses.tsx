"use client";

import Link from "next/link";
import { useState, type FormEvent, type InputHTMLAttributes, type ReactNode } from "react";
import { Dialog } from "@/components/ui/Dialog";
import { Icon } from "@/components/ui/Icon";
import { useI18n } from "@/i18n/I18nProvider";
import { formatDate, loc } from "@/lib/format";
import { ago } from "../format";
import { useAppData } from "@/lib/meta-context";
import {
  createBusiness,
  removeBusiness,
  resetBusinessPassword,
  setBusinessStatus,
  useDemoStore,
  useHydrated,
  type BusinessStatus,
  type DemoBusiness,
} from "@/features/portal-demo/store";

/**
 * Admin "Manage businesses": create a business with its sign-in details, search/filter, activate/suspend,
 * reset passwords. Uses the shared demo store until POST /api/admin/merchants exists.
 * Generated passwords are shown once; only their hash is kept.
 */

interface Issued {
  name: string;
  email: string;
  password: string;
  reset?: boolean;
}

/** 14-character password from the browser's secure random source, avoiding look-alike characters. */
export function generatePassword(length = 14) {
  const sets = ["ABCDEFGHJKLMNPQRSTUVWXYZ", "abcdefghijkmnpqrstuvwxyz", "23456789", "!#%+?@"];
  const all = sets.join("");
  const rnd = new Uint32Array(length);
  crypto.getRandomValues(rnd);
  const chars = Array.from(rnd, (n, i) => {
    const pool = i < sets.length ? sets[i]! : all;
    return pool[n % pool.length]!;
  });
  // Shuffle so the guaranteed character types are not always first.
  const order = new Uint32Array(length);
  crypto.getRandomValues(order);
  return chars.map((c, i) => [order[i]!, c] as const).sort((a, b) => a[0] - b[0]).map(([, c]) => c).join("");
}

/** Finnish business ID (Y-tunnus) with its check digit. */
export function validBusinessId(id: string) {
  const m = /^(\d{7})-(\d)$/.exec(id.trim());
  if (!m) return false;
  const w = [7, 9, 10, 5, 8, 4, 2];
  const sum = m[1]!.split("").reduce((a, d, i) => a + Number(d) * w[i]!, 0);
  const r = sum % 11;
  if (r === 1) return false;
  return (r === 0 ? 0 : 11 - r) === Number(m[2]);
}

const EMPTY = { name: "", companyName: "", businessId: "", contactName: "", email: "", phone: "", cityId: "", categoryId: "", status: "active" as BusinessStatus, password: "" };
type FormKey = keyof typeof EMPTY;

export function ManageBusinesses() {
  const { t, locale } = useI18n();
  const { meta } = useAppData();
  const { businesses, deals } = useDemoStore();
  const hydrated = useHydrated();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [errors, setErrors] = useState<Partial<Record<FormKey, string>>>({});
  const [issued, setIssued] = useState<Issued | null>(null);
  const [copied, setCopied] = useState("");
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<"" | BusinessStatus>("");

  const dealCount = (id: string, status?: string) => deals.filter((d) => d.businessId === id && (!status || d.status === status)).length;
  const shown = businesses.filter((m) => {
    const n = q.trim().toLowerCase();
    return (!filter || m.status === filter) && (!n || [m.name, m.companyName, m.businessId, m.email].some((v) => v.toLowerCase().includes(n)));
  });
  const count = (s: BusinessStatus) => businesses.filter((m) => m.status === s).length;

  const set = (k: FormKey, v: string) => {
    setForm((f) => ({ ...f, [k]: v }));
    setErrors((e) => ({ ...e, [k]: undefined }));
  };

  const openForm = () => {
    setForm({ ...EMPTY, password: generatePassword() });
    setErrors({});
    setOpen(true);
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const err: typeof errors = {};
    const email = form.email.trim().toLowerCase();
    if (!form.name.trim()) err.name = t("admin.mb.errRequired");
    if (!form.companyName.trim()) err.companyName = t("admin.mb.errRequired");
    if (!validBusinessId(form.businessId)) err.businessId = t("admin.mb.errBusinessId");
    else if (businesses.some((m) => m.businessId === form.businessId.trim())) err.businessId = t("admin.mb.errDuplicateId");
    if (!form.contactName.trim()) err.contactName = t("admin.mb.errRequired");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) err.email = t("admin.mb.errEmail");
    else if (businesses.some((m) => m.email === email)) err.email = t("admin.mb.errDuplicateEmail");
    if (!form.cityId) err.cityId = t("admin.mb.errRequired");
    if (!form.categoryId) err.categoryId = t("admin.mb.errRequired");
    if (form.password.length < 12) err.password = t("admin.mb.errPassword");
    setErrors(err);
    if (Object.keys(err).length) {
      document.getElementById(`mb-${Object.keys(err)[0]}`)?.focus();
      return;
    }
    setBusy(true);
    const business = await createBusiness(
      {
        name: form.name.trim(),
        companyName: form.companyName.trim(),
        businessId: form.businessId.trim(),
        email,
        contactName: form.contactName.trim(),
        phone: form.phone.trim(),
        cityId: form.cityId,
        categoryId: form.categoryId,
        status: form.status,
      },
      form.password,
    );
    setBusy(false);
    setIssued({ name: business.name, email, password: form.password });
    setOpen(false);
  };

  const resetPassword = async (m: DemoBusiness) => {
    if (!confirm(t("admin.mb.confirmReset", { name: m.name }))) return;
    const password = generatePassword();
    await resetBusinessPassword(m.id, password);
    setIssued({ name: m.name, email: m.email, password, reset: true });
  };

  const remove = (m: DemoBusiness) => {
    if (!confirm(t("admin.mb.confirmRemove", { name: m.name }))) return;
    removeBusiness(m.id);
  };

  const copy = async (text: string, what: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(what);
      setTimeout(() => setCopied(""), 1800);
    } catch {
      /* clipboard blocked: the text stays selectable */
    }
  };

  const loginUrl = typeof window === "undefined" ? "" : `${window.location.origin}/${locale}/business`;

  const field = (k: FormKey, label: string, input: ReactNode, hint?: string) => (
    <div className="mb-field">
      <label htmlFor={`mb-${k}`}>{label}</label>
      {input}
      {errors[k] ? <p className="err-msg" id={`mb-${k}-err`}><Icon name="xc" />{errors[k]}</p> : hint ? <p className="hint">{hint}</p> : null}
    </div>
  );
  const text = (k: FormKey, props: InputHTMLAttributes<HTMLInputElement> = {}) => (
    <input id={`mb-${k}`} className="input" value={form[k]} onChange={(e) => set(k, e.target.value)} aria-invalid={!!errors[k] || undefined} aria-describedby={errors[k] ? `mb-${k}-err` : undefined} {...props} />
  );

  return (
    <>
      <section className="adm-kpis">
        {(
          [
            ["admin.mb.total", businesses.length],
            ["admin.active", count("active")],
            ["admin.pending", count("pending")],
            ["admin.suspended", count("suspended")],
          ] as const
        ).map(([k, v]) => (
          <div className="kpi-tile" key={k}><p className="kt-label">{t(k)}</p><p className="kt-value">{hydrated ? v : "–"}</p></div>
        ))}
      </section>

      {issued && (
        <section className="panel mb-issued" aria-live="polite">
          <div className="panel-h">
            <div className="row" style={{ gap: 12 }}>
              <span className="attn-ic indigo"><Icon name="lock" /></span>
              <div>
                <h2>{t(issued.reset ? "admin.mb.resetTitle" : "admin.mb.issuedTitle", { name: issued.name })}</h2>
                <p className="muted small">{t("admin.mb.issuedHint")}</p>
              </div>
            </div>
            <button className="btn btn-ghost btn-sm" onClick={() => setIssued(null)} aria-label={t("admin.mb.close")}><Icon name="x" /></button>
          </div>
          <dl className="cred">
            <div><dt>{t("admin.mb.loginUrl")}</dt><dd className="mono">{loginUrl}</dd><button className="btn btn-secondary btn-sm" onClick={() => copy(loginUrl, "url")}>{copied === "url" ? t("admin.mb.copied") : t("admin.mb.copy")}</button></div>
            <div><dt>{t("admin.mb.loginEmail")}</dt><dd className="mono">{issued.email}</dd><button className="btn btn-secondary btn-sm" onClick={() => copy(issued.email, "email")}>{copied === "email" ? t("admin.mb.copied") : t("admin.mb.copy")}</button></div>
            <div><dt>{t("admin.mb.tempPassword")}</dt><dd className="mono pw">{issued.password}</dd><button className="btn btn-secondary btn-sm" onClick={() => copy(issued.password, "pw")}>{copied === "pw" ? t("admin.mb.copied") : t("admin.mb.copy")}</button></div>
          </dl>
          <div className="row wrap-row" style={{ marginTop: 12 }}>
            <button className="btn btn-primary btn-sm" onClick={() => copy(`${t("admin.mb.loginUrl")}: ${loginUrl}\n${t("admin.mb.loginEmail")}: ${issued.email}\n${t("admin.mb.tempPassword")}: ${issued.password}`, "all")}>
              <Icon name="doc" />{copied === "all" ? t("admin.mb.copied") : t("admin.mb.copyAll")}
            </button>
            <p className="hint">{t("admin.mb.firstLoginNote")}</p>
          </div>
        </section>
      )}

      <section className="panel" style={{ marginTop: 20 }}>
        <div className="toolbar">
          <label className="search-box">
            <Icon name="search" />
            <span className="sr-only">{t("admin.mb.search")}</span>
            <input className="input" value={q} onChange={(e) => setQ(e.target.value)} placeholder={t("admin.mb.search")} />
          </label>
          <div className="row" style={{ gap: 12 }}>
            <div className="seg" role="group" aria-label={t("admin.mb.statusFilter")}>
              <button type="button" aria-pressed={filter === ""} onClick={() => setFilter("")}>{t("admin.tab.all")}</button>
              {(["active", "pending", "suspended"] as const).map((s) => (
                <button key={s} type="button" aria-pressed={filter === s} onClick={() => setFilter(s)}>{t(`admin.${s}`)} <small>{count(s)}</small></button>
              ))}
            </div>
            <button className="btn btn-primary btn-sm" onClick={openForm}><Icon name="plus" />{t("admin.mb.add")}</button>
          </div>
        </div>

        {hydrated && businesses.length === 0 ? (
          <div className="empty-state">
            <span className="attn-ic indigo"><Icon name="store" /></span>
            <h3>{t("admin.mb.emptyTitle")}</h3>
            <p className="muted small">{t("admin.mb.emptyText")}</p>
            <button className="btn btn-primary btn-sm" onClick={openForm}><Icon name="plus" />{t("admin.mb.add")}</button>
          </div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>{t("admin.merchant")}</th>
                  <th>{t("common.businessId")}</th>
                  <th>{t("admin.mb.loginEmail")}</th>
                  <th>{t("admin.bd.account.lastSignIn")}</th>
                  <th>{t("business.colStatus")}</th>
                  <th className="num">{t("admin.mb.deals")}</th>
                  <th>{t("admin.created")}</th>
                  <th><span className="sr-only">{t("admin.actions")}</span></th>
                </tr>
              </thead>
              <tbody>
                {shown.map((m) => (
                  <tr key={m.id}>
                    <td>
                      <Link className="row-link" href={`/${locale}/admin/businesses/${m.id}`}><b>{m.name}</b></Link>
                      <small className="muted block">{m.companyName} · {loc(meta.cities.find((c) => c.id === m.cityId)?.name, locale)}</small>
                    </td>
                    <td className="mono">{m.businessId}</td>
                    <td>
                      {m.email}
                      {m.mustChangePassword && <small className="muted block">{t("admin.mb.awaitingFirstLogin")}</small>}
                    </td>
                    <td>{m.lastSignInAt ? ago((Date.now() - Date.parse(m.lastSignInAt)) / 6e4, locale) : <span className="muted">{t("admin.bd.never")}</span>}</td>
                    <td>
                      {m.status === "active" ? <span className="chip teal"><Icon name="checkc" />{t("admin.active")}</span>
                        : m.status === "pending" ? <span className="chip warn"><Icon name="clock" />{t("admin.pending")}</span>
                        : <span className="chip danger"><Icon name="xc" />{t("admin.suspended")}</span>}
                    </td>
                    <td className="num">
                      {dealCount(m.id, "live")} <span className="muted">/ {dealCount(m.id)}</span>
                    </td>
                    <td>{formatDate(m.createdAt, locale)}</td>
                    <td>
                      <div className="mb-actions">
                        {m.status !== "active"
                          ? <button className="btn btn-secondary btn-sm" onClick={() => setBusinessStatus(m.id, "active")}>{t("admin.activate")}</button>
                          : <button className="btn btn-danger btn-sm" onClick={() => setBusinessStatus(m.id, "suspended")}>{t("admin.suspend")}</button>}
                        <Link className="btn btn-secondary btn-sm" href={`/${locale}/admin/businesses/${m.id}`}>{t("admin.bd.open")}</Link>
                        <button className="btn btn-ghost btn-sm" onClick={() => resetPassword(m)}><Icon name="lock" />{t("admin.mb.reset")}</button>
                        <button className="btn btn-ghost btn-sm" onClick={() => remove(m)} aria-label={t("admin.mb.remove", { name: m.name })}><Icon name="trash" /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {hydrated && shown.length === 0 && <p className="muted empty-row">{t("admin.mb.none")}</p>}
          </div>
        )}
      </section>

      <Dialog open={open} onClose={() => setOpen(false)} className="drawer" labelledBy="mb-title">
        <form className="mb-form" onSubmit={submit} noValidate>
          <div className="drawer-head">
            <div>
              <h2 id="mb-title" style={{ fontSize: 20 }}>{t("admin.mb.add")}</h2>
              <p className="muted small">{t("admin.mb.addHint")}</p>
            </div>
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => setOpen(false)} aria-label={t("admin.mb.close")}><Icon name="x" /></button>
          </div>
          <div className="drawer-body">
            <fieldset>
              <legend>{t("admin.mb.secCompany")}</legend>
              {field("name", t("auth.displayName"), text("name", { autoComplete: "organization" }))}
              {field("companyName", t("auth.companyName"), text("companyName"))}
              {field("businessId", t("common.businessId"), text("businessId", { placeholder: "1234567-8", inputMode: "numeric" }), t("admin.mb.businessIdHint"))}
              <div className="mb-two">
                {field("cityId", t("admin.mb.city"), (
                  <select id="mb-cityId" className="select" value={form.cityId} onChange={(e) => set("cityId", e.target.value)} aria-invalid={!!errors.cityId || undefined}>
                    <option value="">{t("admin.mb.choose")}</option>
                    {meta.cities.map((c) => <option key={c.id} value={c.id}>{loc(c.name, locale)}</option>)}
                  </select>
                ))}
                {field("categoryId", t("admin.mb.category"), (
                  <select id="mb-categoryId" className="select" value={form.categoryId} onChange={(e) => set("categoryId", e.target.value)} aria-invalid={!!errors.categoryId || undefined}>
                    <option value="">{t("admin.mb.choose")}</option>
                    {meta.categories.map((c) => <option key={c.id} value={c.id}>{loc(c.name, locale)}</option>)}
                  </select>
                ))}
              </div>
            </fieldset>

            <fieldset>
              <legend>{t("admin.mb.secContact")}</legend>
              {field("contactName", t("auth.contactName"), text("contactName", { autoComplete: "name" }))}
              {field("phone", t("admin.mb.phone"), text("phone", { type: "tel", autoComplete: "tel", placeholder: "+358 40 123 4567" }), t("admin.mb.optional"))}
            </fieldset>

            <fieldset>
              <legend>{t("admin.mb.secLogin")}</legend>
              {field("email", t("admin.mb.loginEmail"), text("email", { type: "email", autoComplete: "off" }), t("admin.mb.emailHint"))}
              {field("password", t("admin.mb.tempPassword"), (
                <div className="mb-pw">
                  {text("password", { className: "input mono", autoComplete: "new-password", spellCheck: false })}
                  <button type="button" className="btn btn-secondary btn-sm" onClick={() => set("password", generatePassword())}><Icon name="refund" />{t("admin.mb.generate")}</button>
                </div>
              ), t("admin.mb.passwordHint"))}
              {field("status", t("admin.mb.initialStatus"), (
                <div className="seg" role="radiogroup" id="mb-status">
                  {(["active", "pending"] as const).map((s) => (
                    <button key={s} type="button" role="radio" aria-checked={form.status === s} aria-pressed={form.status === s} onClick={() => set("status", s)}>{t(`admin.${s}`)}</button>
                  ))}
                </div>
              ), t(form.status === "active" ? "admin.mb.activeHint" : "admin.mb.pendingHint"))}
            </fieldset>
          </div>
          <div className="drawer-foot">
            <button className="btn btn-primary btn-block" type="submit" disabled={busy}><Icon name="check" />{t("admin.mb.create")}</button>
            <button className="btn btn-secondary btn-block" type="button" onClick={() => setOpen(false)}>{t("admin.mb.cancel")}</button>
          </div>
        </form>
      </Dialog>
    </>
  );
}
