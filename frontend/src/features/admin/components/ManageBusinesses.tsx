"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { adminMerchantCreateSchema, type AdminMerchantDTO, type MerchantStatus, type BusinessIdMatch } from "@vendelia/shared";
import { ApiError } from "@/lib/api-client";
import { createMerchant, setMerchantStatus } from "../api";
import { useState, type FormEvent, type InputHTMLAttributes, type ReactNode } from "react";
import { Dialog } from "@/components/ui/Dialog";
import { Icon } from "@/components/ui/Icon";
import { Notice } from "@/components/ui/Notice";
import { useI18n } from "@/i18n/I18nProvider";
import { formatDate, loc } from "@/lib/format";
import { useAppData } from "@/lib/meta-context";
import { generatePassword } from "@/features/portal-demo/password";
/** Admin business records come from Supabase; optionally provisions a linked business login through Supabase Auth. */
const EMPTY = { name: "", companyName: "", businessId: "", contactName: "", publicEmail: "", phone: "", cityId: "", categoryId: "", status: "active" as MerchantStatus };
type FormKey = keyof typeof EMPTY;

export function ManageBusinesses({ businesses }: { businesses: AdminMerchantDTO[] }) {
  const { t, locale } = useI18n();
  const { meta } = useAppData();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [duplicates, setDuplicates] = useState<BusinessIdMatch[] | null>(null);
  const [changing, setChanging] = useState<string | null>(null);
  const [form, setForm] = useState(EMPTY);
  // Passwords are sent only for explicit account provisioning; never persist them in browser storage.
  const [createLogin, setCreateLogin] = useState(false);
  const [issued, setIssued] = useState<{ email: string; password: string | null; name: string; emailed: boolean } | null>(null);
  const [signInEmail, setSignInEmail] = useState("");
  const [temporaryPassword, setTemporaryPassword] = useState("");
  const [errors, setErrors] = useState<Partial<Record<FormKey | 'login.email' | 'login.password', string>>>({});
  const [failure, setFailure] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<"" | MerchantStatus>("");
  const shown = businesses.filter(m => {
    const n = q.trim().toLowerCase();
    return (!filter || m.status === filter) && (!n || [m.name, m.companyName, m.businessId, m.publicEmail ?? ""]
      .some(v => v.toLowerCase().includes(n)));
  });
  const count = (status: MerchantStatus) => businesses.filter(m => m.status === status).length;
  const set = (key: FormKey, value: string) => {
    setForm(f => ({ ...f, [key]: value }));
    setDuplicates(null);
    setErrors(e => ({ ...e, [key]: undefined }));
  };
  const openForm = () => {
    setForm(EMPTY); setErrors({}); setFailure(null); setDuplicates(null); setCreateLogin(false); setIssued(null);
    setSignInEmail(""); setTemporaryPassword(generatePassword()); setOpen(true);
  };
  const closeForm = () => {
    if (busy) return;
    setOpen(false); setSignInEmail(""); setTemporaryPassword("");
  };
  const submit = async (event?: FormEvent, confirmed = false) => {
    event?.preventDefault();
    if (busy || (duplicates !== null && !confirmed)) return;
    const parsed = adminMerchantCreateSchema.safeParse({ ...form, ...(createLogin ? { login: { email: signInEmail, password: temporaryPassword } } : {}) });
    if (!parsed.success) {
      const fields: typeof errors = {};
      for (const issue of parsed.error.issues) fields[issue.path.join('.') as keyof typeof errors] ??= t(`errors.${issue.message}`);
      setErrors(fields);
      const first = Object.keys(fields)[0];
      document.getElementById(first === 'login.email' ? 'mb-signInEmail' : first === 'login.password' ? 'mb-temporaryPassword' : `mb-${first}`)?.focus();
      return;
    }
    setBusy(true); setFailure(null); setErrors({});
    try {
      const result = await createMerchant({ ...parsed.data, allowDuplicateBusinessId: confirmed }, locale);
      if (result.login) setIssued({ email: result.login.email, password: result.login.passwordSet ? temporaryPassword : null, name: result.merchant.name, emailed: !!result.login.emailed });
      setDuplicates(null); setOpen(false); setSignInEmail(""); setTemporaryPassword(""); router.refresh();
    } catch (error) {
      if (error instanceof ApiError) {
        if (error.code === 'business_id_confirmation_required') {
          setDuplicates(error.businesses);
          return;
        }
        setDuplicates(null);
        const fields: typeof errors = {};
        for (const [key, value] of Object.entries(error.fields)) fields[key as keyof typeof errors] = t(`errors.${value}`);
        if (error.code === "business_exists") fields.businessId = t("admin.mb.errDuplicateId");
        setErrors(fields);
        setFailure(t(`errors.${error.code}`));
      } else { setDuplicates(null); setFailure(t("errors.network")); }
    } finally { setBusy(false); }
  };
  const changeStatus = async (merchant: AdminMerchantDTO) => {
    setChanging(merchant.id); setFailure(null);
    try {
      await setMerchantStatus(merchant.id, merchant.status === "active" ? "suspended" : "active");
      router.refresh();
    } catch (error) { setFailure(t(`errors.${error instanceof ApiError ? error.code : "network"}`)); }
    finally { setChanging(null); }
  };

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
          <div className="kpi-tile" key={k}><p className="kt-label">{t(k)}</p><p className="kt-value">{v}</p></div>
        ))}
      </section>

      {issued && (
        <section className="panel pad" style={{ marginTop: 20 }} aria-live="polite">
          <div className="row between"><h2>{t("admin.mb.issuedTitle", { name: issued.name })}</h2><button className="btn btn-ghost btn-sm" onClick={() => setIssued(null)} aria-label={t("admin.mb.close")}><Icon name="x" /></button></div>
          {issued.password && issued.emailed
            ? <Notice tone="teal" icon="checkc"><p>{t("admin.mb.issuedEmailed", { email: issued.email })}</p></Notice>
            : issued.password && <Notice tone="warn" icon="info"><p>{t("admin.mb.issuedEmailFailed")}</p></Notice>}
          <p className="muted small">{t(issued.password ? "admin.mb.issuedHint" : "admin.mb.loginAlreadyProvisioned")}</p>
          <dl className="stack" style={{ marginTop: 16 }}>
            <div><dt>{t("admin.mb.loginEmail")}</dt><dd>{issued.email}</dd></div>
            {issued.password && <div><dt>{t("admin.mb.tempPassword")}</dt><dd className="mono">{issued.password}</dd></div>}
          </dl>
          <Link className="btn btn-secondary btn-sm" style={{ marginTop: 16 }} href={`/${locale}/business`}>{t("admin.mb.loginUrl")}</Link>
        </section>
      )}

      {failure && !open && <p className="err-msg" role="alert">{failure}</p>}

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

        {businesses.length === 0 ? (
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
                  <th>{t("admin.mb.contactEmail")}</th>
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
                      <small className="muted block">{m.companyName} · {(m.cityId ? loc(meta.cities.find((c) => c.id === m.cityId)?.name, locale) : "–")}</small>
                    </td>
                    <td className="mono">{m.businessId}</td>
                    <td>{m.publicEmail || "–"}</td>
                    <td>
                      {m.status === "active" ? <span className="chip teal"><Icon name="checkc" />{t("admin.active")}</span>
                        : m.status === "pending" ? <span className="chip warn"><Icon name="clock" />{t("admin.pending")}</span>
                        : <span className="chip danger"><Icon name="xc" />{t("admin.suspended")}</span>}
                    </td>
                    <td className="num">
                      {m.liveDealCount} <span className="muted">/ {m.dealCount}</span>
                    </td>
                    <td>{formatDate(m.createdAt, locale)}</td>
                    <td>
                      <div className="mb-actions">
                        {m.status !== "active"
                          ? <button className="btn btn-secondary btn-sm" disabled={changing !== null} onClick={() => changeStatus(m)}>{t("admin.activate")}</button>
                          : <button className="btn btn-danger btn-sm" disabled={changing !== null} onClick={() => changeStatus(m)}>{t("admin.suspend")}</button>}
                        <Link className="btn btn-secondary btn-sm" href={`/${locale}/admin/businesses/${m.id}`}>{t("admin.bd.open")}</Link>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {shown.length === 0 && <p className="muted empty-row">{t("admin.mb.none")}</p>}
          </div>
        )}
      </section>

      <Dialog open={open} onClose={closeForm} className="drawer" labelledBy="mb-title">
        <form className="mb-form" onSubmit={submit} noValidate>
          <div className="drawer-head">
            <div>
              <h2 id="mb-title" style={{ fontSize: 20 }}>{t("admin.mb.add")}</h2>
              <p className="muted small">{t("admin.mb.addHint")}</p>
            </div>
            <button type="button" disabled={busy} className="btn btn-ghost btn-sm" onClick={closeForm} aria-label={t("admin.mb.close")}><Icon name="x" /></button>
          </div>
          <div className="drawer-body">
            <fieldset disabled={busy || duplicates !== null}>
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

            <fieldset disabled={busy || duplicates !== null}>
              <legend>{t("admin.mb.secContact")}</legend>
              {field("contactName", t("auth.contactName"), text("contactName", { autoComplete: "name" }))}
              {field("publicEmail", t("admin.mb.contactEmail"), text("publicEmail", { type: "email", autoComplete: "email" }), t("admin.mb.contactEmailHint"))}
              {field("phone", t("admin.mb.phone"), text("phone", { type: "tel", autoComplete: "tel", placeholder: "+358 40 123 4567" }), t("admin.mb.optional"))}
            </fieldset>

            <fieldset disabled={busy || duplicates !== null}>
              <legend>{t("admin.mb.secLogin")}</legend>
              <label className="row" style={{ gap: 8 }}><input type="checkbox" checked={createLogin} disabled={busy} onChange={event => setCreateLogin(event.target.checked)} />{t("admin.mb.createLogin")}</label>
              <p className="hint" id="mb-signin-setup">{t("admin.mb.signInSetupHint")}</p>
              <div className="mb-field">
                <label htmlFor="mb-signInEmail">{t("admin.mb.loginEmail")}</label>
                <input id="mb-signInEmail" className="input" type="email" inputMode="email" autoComplete="off" disabled={!createLogin || busy}
                  value={signInEmail} onChange={event => setSignInEmail(event.target.value)} aria-describedby="mb-signin-setup" />
                {errors['login.email'] && <p className="err-msg" role="alert">{errors['login.email']}</p>}
              </div>
              <div className="mb-field">
                <label htmlFor="mb-temporaryPassword">{t("admin.mb.tempPassword")}</label>
                <div className="mb-pw">
                  <input id="mb-temporaryPassword" className="input mono" type="text" autoComplete="off" spellCheck={false} disabled={!createLogin || busy}
                    value={temporaryPassword} onChange={event => setTemporaryPassword(event.target.value)} aria-describedby="mb-signin-setup" />
                  <button type="button" className="btn btn-secondary btn-sm" disabled={!createLogin || busy} onClick={() => setTemporaryPassword(generatePassword())}>
                    <Icon name="refund" />{t("admin.mb.generate")}
                  </button>
                </div>
                {errors['login.password'] && <p className="err-msg" role="alert">{errors['login.password']}</p>}
              </div>
            </fieldset>

            <fieldset disabled={busy || duplicates !== null}>
              <legend>{t("admin.mb.initialStatus")}</legend>
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
            {failure && <p className="err-msg" role="alert">{failure}</p>}
            <button className="btn btn-primary btn-block" type="submit" disabled={busy || duplicates !== null}><Icon name="check" />{t(createLogin ? "admin.mb.createWithLogin" : "admin.mb.create")}</button>
            <button className="btn btn-secondary btn-block" type="button" disabled={busy} onClick={closeForm}>{t("admin.mb.cancel")}</button>
          </div>
        </form>
      </Dialog>
      <Dialog open={open && duplicates !== null} onClose={() => { if (!busy) setDuplicates(null); }}
        className="mb-duplicate" role="alertdialog" labelledBy="mb-duplicate-title" describedBy="mb-duplicate-description" dismissible={!busy}>
        <div className="mb-duplicate-body">
          <span className="mb-duplicate-icon" aria-hidden="true"><Icon name="info" /></span>
          <h2 id="mb-duplicate-title">{t('admin.mb.duplicate.title')}</h2>
          <p id="mb-duplicate-description" className="muted">{t('admin.mb.duplicate.message', { businessId: form.businessId })}</p>
          <ul className="mb-duplicate-list">{duplicates?.map(m => <li key={m.id}><strong>{m.name}</strong><span className="muted small">{m.companyName}</span></li>)}</ul>
          <p className="muted small">{t('admin.mb.duplicate.hint')}</p>
          <div className="mb-duplicate-actions" aria-busy={busy}>
            <button type="button" className="btn btn-secondary" disabled={busy} autoFocus onClick={() => setDuplicates(null)}>{t('admin.mb.cancel')}</button>
            <button type="button" className="btn btn-primary" disabled={busy} onClick={() => { void submit(undefined, true); }}>{t('admin.mb.duplicate.proceed')}</button>
          </div>
        </div>
      </Dialog>
    </>
  );
}
