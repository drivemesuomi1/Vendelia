"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { adminMerchantSchema, type AdminMerchantDTO, type MerchantStatus } from "@vendelia/shared";
import { ApiError } from "@/lib/api-client";
import { createMerchant, setMerchantStatus } from "../api";
import { useState, type FormEvent, type InputHTMLAttributes, type ReactNode } from "react";
import { Dialog } from "@/components/ui/Dialog";
import { Icon } from "@/components/ui/Icon";
import { useI18n } from "@/i18n/I18nProvider";
import { formatDate, loc } from "@/lib/format";
import { useAppData } from "@/lib/meta-context";
import { generatePassword } from "@/features/portal-demo/password";
/** Admin business records come from Supabase; this screen does not provision login accounts. */
const EMPTY = { name: "", companyName: "", businessId: "", contactName: "", publicEmail: "", phone: "", cityId: "", categoryId: "", status: "active" as MerchantStatus };
type FormKey = keyof typeof EMPTY;

export function ManageBusinesses({ businesses }: { businesses: AdminMerchantDTO[] }) {
  const { t, locale } = useI18n();
  const { meta } = useAppData();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [changing, setChanging] = useState<string | null>(null);
  const [form, setForm] = useState(EMPTY);
  // Presentation only: never include these values in validation, API payloads or storage.
  const [signInEmail, setSignInEmail] = useState("");
  const [temporaryPassword, setTemporaryPassword] = useState("");
  const [errors, setErrors] = useState<Partial<Record<FormKey, string>>>({});
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
    setErrors(e => ({ ...e, [key]: undefined }));
  };
  const openForm = () => {
    setForm(EMPTY); setErrors({}); setFailure(null);
    setSignInEmail(""); setTemporaryPassword(generatePassword()); setOpen(true);
  };
  const closeForm = () => {
    if (busy) return;
    setOpen(false); setSignInEmail(""); setTemporaryPassword("");
  };
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const parsed = adminMerchantSchema.safeParse(form);
    if (!parsed.success) {
      const fields: typeof errors = {};
      for (const issue of parsed.error.issues) fields[issue.path[0] as FormKey] ??= t(`errors.${issue.message}`);
      setErrors(fields);
      document.getElementById(`mb-${Object.keys(fields)[0]}`)?.focus();
      return;
    }
    setBusy(true); setFailure(null); setErrors({});
    try {
      await createMerchant(parsed.data);
      setOpen(false); setSignInEmail(""); setTemporaryPassword(""); router.refresh();
    } catch (error) {
      if (error instanceof ApiError) {
        const fields: typeof errors = {};
        for (const [key, value] of Object.entries(error.fields)) fields[key as FormKey] = t(`errors.${value}`);
        if (error.code === "business_exists") fields.businessId = t("admin.mb.errDuplicateId");
        setErrors(fields);
        setFailure(t(`errors.${error.code}`));
      } else setFailure(t("errors.network"));
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
              {field("publicEmail", t("admin.mb.contactEmail"), text("publicEmail", { type: "email", autoComplete: "email" }), t("admin.mb.contactEmailHint"))}
              {field("phone", t("admin.mb.phone"), text("phone", { type: "tel", autoComplete: "tel", placeholder: "+358 40 123 4567" }), t("admin.mb.optional"))}
            </fieldset>

            <fieldset>
              <legend>{t("admin.mb.secLogin")}</legend>
              <p className="hint" id="mb-signin-preview">{t("admin.mb.signInPreviewHint")}</p>
              <div className="mb-field">
                <label htmlFor="mb-signInEmail">{t("admin.mb.loginEmail")}</label>
                <input id="mb-signInEmail" className="input" type="text" inputMode="email" autoComplete="off"
                  value={signInEmail} onChange={event => setSignInEmail(event.target.value)} aria-describedby="mb-signin-preview" />
              </div>
              <div className="mb-field">
                <label htmlFor="mb-temporaryPassword">{t("admin.mb.tempPassword")}</label>
                <div className="mb-pw">
                  <input id="mb-temporaryPassword" className="input mono" type="text" autoComplete="off" spellCheck={false}
                    value={temporaryPassword} onChange={event => setTemporaryPassword(event.target.value)} aria-describedby="mb-signin-preview" />
                  <button type="button" className="btn btn-secondary btn-sm" onClick={() => setTemporaryPassword(generatePassword())}>
                    <Icon name="refund" />{t("admin.mb.generate")}
                  </button>
                </div>
              </div>
            </fieldset>

            <fieldset>
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
            <button className="btn btn-primary btn-block" type="submit" disabled={busy}><Icon name="check" />{t("admin.mb.create")}</button>
            <button className="btn btn-secondary btn-block" type="button" disabled={busy} onClick={closeForm}>{t("admin.mb.cancel")}</button>
          </div>
        </form>
      </Dialog>
    </>
  );
}
