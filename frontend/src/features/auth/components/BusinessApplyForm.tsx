"use client";

import Link from "next/link";
import { useState, type FormEvent, type ReactNode } from "react";
import { businessApplicationSchema, COMPANY } from "@vendelia/shared";
import { Icon, type IconName } from "@/components/ui/Icon";
import { LogoSymbol } from "@/components/ui/Logo";
import { useI18n } from "@/i18n/I18nProvider";
import { api, ApiError } from "@/lib/api-client";
import { loc } from "@/lib/format";
import { useAppData } from "@/lib/meta-context";
import { AuthSplit } from "./AuthSplit";

/** Applications go to this address; Vendelia then checks the business and creates its sign-in details. */
export const APPLY_EMAIL = COMPANY.businessEmail;

type Key = "businessId" | "companyName" | "displayName" | "categoryId" | "street" | "zip" | "cityId" | "contactName" | "phone" | "email" | "website" | "message";
type Opts = { optional?: boolean; span?: 1 | 2 | 3 | 4 | 6; placeholder?: string };

/**
 * "Sell on Vendelia": the site emails the application to business support (tuki@vendelia.fi), with the applicant's
 * address as reply-to. No account is created; Vendelia checks the business and sends sign-in details.
 * Laid out to fit one desktop screen: a six-column grid in the form, compact side columns.
 */
export function BusinessApplyForm() {
  const { t, locale } = useI18n();
  const { meta } = useAppData();
  const [f, setF] = useState<Record<Key, string>>({
    businessId: "", companyName: "", displayName: "", categoryId: meta.categories[0]?.id ?? "", cityId: meta.cities[0]?.id ?? "",
    street: "", zip: "", contactName: "", phone: "", email: "", website: "", message: "",
  });
  const [errors, setErrors] = useState<Partial<Record<Key | "_", string>>>({});
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const set = (k: Key, v: string) => { setF((p) => ({ ...p, [k]: v })); if (errors[k]) setErrors((e) => ({ ...e, [k]: undefined })); };
  const err = (k: Key | "_") => (errors[k] ? t(`errors.${errors[k]}`) : undefined);

  const focusFirst = (keys: string[]) => document.getElementById(keys[0]!)?.focus();

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (busy) return;
    const parsed = businessApplicationSchema.safeParse({ ...f, locale });
    if (!parsed.success) {
      const next: Partial<Record<Key, string>> = {};
      for (const issue of parsed.error.issues) next[issue.path[0] as Key] ??= issue.message;
      setErrors(next);
      return focusFirst(Object.keys(next));
    }
    setBusy(true);
    setErrors({});
    try {
      await api("/api/business/apply", { body: parsed.data });
      setSent(true);
    } catch (e2) {
      if (e2 instanceof ApiError && Object.keys(e2.fields).length) {
        setErrors(e2.fields as Partial<Record<Key, string>>);
        focusFirst(Object.keys(e2.fields));
      } else setErrors({ _: e2 instanceof ApiError ? e2.code : "network" });
    } finally {
      setBusy(false);
    }
  }

  const field = (k: Key, label: string, icon: IconName, control: ReactNode, o: Opts = {}) => (
    <label className={`signin-field apply-f s${o.span ?? 3}`} htmlFor={k}>
      <span>{label}{o.optional && <small className="muted"> {t("common.optional")}</small>}</span>
      <span className="signin-box"><Icon name={icon} />{control}</span>
      {err(k) && <span className="signin-field-err" id={`${k}-err`}><Icon name="xc" />{err(k)}</span>}
    </label>
  );
  const input = (k: Key, label: string, icon: IconName, props: Record<string, unknown> = {}, o: Opts = {}) =>
    field(k, label, icon, (
      <input id={k} value={f[k]} onChange={(e) => set(k, e.target.value)} placeholder={o.placeholder}
        aria-invalid={err(k) ? true : undefined} aria-describedby={err(k) ? `${k}-err` : undefined} {...props} />
    ), o);
  const select = (k: Key, label: string, icon: IconName, options: { id: string; name: Parameters<typeof loc>[0] }[], o: Opts = {}) =>
    field(k, label, icon, (
      <select id={k} value={f[k]} onChange={(e) => set(k, e.target.value)}>
        {options.map((x) => <option key={x.id} value={x.id}>{loc(x.name, locale)}</option>)}
      </select>
    ), o);

  const steps: [IconName, string, string][] = [
    ["send", "auth.bizStep1", "auth.bizStep1Text"],
    ["checkc", "auth.bizStep2", "auth.bizStep2Text"],
    ["store", "auth.bizStep3", "auth.bizStep3Text"],
  ];
  const facts: [IconName, string, string][] = [
    ["compass", "auth.bizBenefitReachTitle", "auth.bizBenefitReach"],
    ["store", "auth.bizBenefitShowcaseTitle", "auth.bizBenefitShowcase"],
    ["ticket", "auth.bizBenefitManageTitle", "auth.bizBenefitManage"],
  ];

  return (
    <AuthSplit panel={false}>
      <div className="apply-layout">
        <aside className="apply-side apply-steps" aria-label={t("auth.bizHow")}>
          <h2>{t("auth.bizHow")}</h2>
          <ol>
            {steps.map(([icon, title, text], i) => (
              <li key={title} style={{ animationDelay: `${120 + i * 90}ms` }}>
                <span className="apply-step-ic"><Icon name={icon} /></span>
                <div><b>{t(title)}</b><p>{t(text, { email: APPLY_EMAIL })}</p></div>
              </li>
            ))}
          </ol>
        </aside>

        {sent ? (
          <div className="signin-form apply-form apply-done" role="status">
            <span className="otp-badge ok" aria-hidden="true"><Icon name="check" /></span>
            <div>
              <h1>{t("auth.bizDoneTitle")}</h1>
              <p className="muted">{t("auth.bizDoneText", { email: APPLY_EMAIL })}</p>
            </div>
            <div className="otp-links">
              <Link className="otp-link" href={`/${locale}`}><Icon name="left" />{t("business.backToSite")}</Link>
              <button type="button" className="otp-link" onClick={() => setSent(false)}>{t("auth.bizSendAnother")}</button>
            </div>
          </div>
        ) : (
          <form className="signin-form apply-form" onSubmit={submit} noValidate>
            <div className="signin-mobile-mark"><LogoSymbol height={32} /></div>
            <div className="apply-head">
              <h1>{t("auth.businessTitle")}</h1>
              <p className="muted">{t("auth.bizSub", { email: APPLY_EMAIL })}</p>
            </div>

            {err("_") && <p className="signin-err" role="alert"><Icon name="xc" />{err("_")}</p>}

            <fieldset className="apply-group">
              <legend>{t("auth.bizCompany")}</legend>
              {input("businessId", t("common.businessId"), "doc", { inputMode: "numeric", autoFocus: true }, { span: 2, placeholder: "1234567-8" })}
              {input("companyName", t("auth.companyName"), "bank", { autoComplete: "organization" }, { span: 4 })}
              {input("displayName", t("auth.displayName"), "store", {}, { placeholder: "Cleava" })}
              {select("categoryId", t("business.category"), "grid", meta.categories)}
              {input("street", t("business.street"), "pin", { autoComplete: "street-address" })}
              {input("zip", t("business.zip"), "pin", { inputMode: "numeric", autoComplete: "postal-code", maxLength: 5 }, { span: 1 })}
              {select("cityId", t("business.city"), "compass", meta.cities, { span: 2 })}
            </fieldset>

            <fieldset className="apply-group">
              <legend>{t("auth.bizContact")}</legend>
              {input("contactName", t("auth.contactName"), "user", { autoComplete: "name" })}
              {input("phone", t("checkout.phone"), "phone", { type: "tel", autoComplete: "tel" })}
              {input("email", t("checkout.email"), "mail", { type: "email", autoComplete: "email", inputMode: "email" })}
              {input("website", t("deal.website"), "globe", { type: "url", autoComplete: "url" }, { optional: true, placeholder: "https://" })}
              <label className="signin-field apply-f s6" htmlFor="message">
                <span>{t("auth.bizMessage")}<small className="muted"> {t("common.optional")}</small></span>
                <textarea id="message" className="apply-textarea" rows={2} maxLength={2000} value={f.message} onChange={(e) => set("message", e.target.value)} placeholder={t("auth.bizMessageHint")} />
              </label>
            </fieldset>

            <div className="apply-submit">
              <button className="btn btn-primary signin-submit" type="submit" disabled={busy}>
                {busy ? <><span className="signin-spin" aria-hidden="true" />{t("auth.bizSending")}</> : <><Icon name="send" />{t("auth.bizSend")}</>}
              </button>
              <p className="signin-terms">{t("auth.bizSendNote", { email: APPLY_EMAIL })}<br />{t("auth.bizHaveLogin")} <Link href={`/${locale}/business`}>{t("auth.login")}</Link></p>
            </div>
          </form>
        )}

        <aside className="apply-side apply-facts" aria-label={t("auth.bizWhy")}>
          <h2>{t("auth.bizWhy")}</h2>
          <ul>
            {facts.map(([icon, title, text], i) => (
              <li key={text} style={{ animationDelay: `${160 + i * 90}ms` }}>
                <span className="apply-step-ic"><Icon name={icon} /></span>
                <div><b>{t(title)}</b><p>{t(text)}</p></div>
              </li>
            ))}
          </ul>
          <a className="apply-contact" href={`mailto:${APPLY_EMAIL}`}>
            <span><Icon name="mail" /></span>
            <span><small>{t("auth.bizQuestions")}</small><b>{APPLY_EMAIL}</b></span>
          </a>
        </aside>
      </div>
    </AuthSplit>
  );
}
