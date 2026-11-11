"use client";

import Link from "next/link";
import { useState, type FormEvent, type ReactNode } from "react";
import { registerMerchantSchema } from "@vendelia/shared";
import { Icon, type IconName } from "@/components/ui/Icon";
import { LogoSymbol } from "@/components/ui/Logo";
import { useI18n } from "@/i18n/I18nProvider";
import { formatPct, loc } from "@/lib/format";
import { useAppData } from "@/lib/meta-context";
import { AuthSplit } from "./AuthSplit";

/** Applications go to this address; Vendelia then checks the business and creates its sign-in details. */
export const APPLY_EMAIL = "info@vendelia.fi";

/** The required business details from sign-up, without a password: no account is created here. */
const applicationSchema = registerMerchantSchema.omit({ password: true });
type Key = keyof typeof applicationSchema.shape | "categoryId" | "website" | "message";

/**
 * "Sell on Vendelia": businesses apply by email. The form checks the details and then opens the visitor's email app
 * with a message to info@vendelia.fi, all details filled in. Nothing is stored or sent by the site itself.
 */
export function BusinessApplyForm() {
  const { t, locale } = useI18n();
  const { meta } = useAppData();
  const [f, setF] = useState<Record<Key, string>>({
    businessId: "", companyName: "", displayName: "", categoryId: meta.categories[0]?.id ?? "", cityId: meta.cities[0]?.id ?? "",
    street: "", zip: "", contactName: "", phone: "", email: "", website: "", message: "",
  });
  const [errors, setErrors] = useState<Partial<Record<Key, string>>>({});
  const [mail, setMail] = useState<{ href: string; text: string } | null>(null);
  const [copied, setCopied] = useState(false);
  const set = (k: Key, v: string) => { setF((p) => ({ ...p, [k]: v })); if (errors[k]) setErrors((e) => ({ ...e, [k]: undefined })); };
  const err = (k: Key) => (errors[k] ? t(`errors.${errors[k]}`) : undefined);

  function submit(e: FormEvent) {
    e.preventDefault();
    const parsed = applicationSchema.safeParse(f);
    if (!parsed.success) {
      const next: Partial<Record<Key, string>> = {};
      for (const issue of parsed.error.issues) next[issue.path[0] as Key] ??= issue.message;
      setErrors(next);
      document.getElementById(Object.keys(next)[0]!)?.focus();
      return;
    }
    const d = { ...parsed.data, categoryId: f.categoryId, website: f.website.trim(), message: f.message.trim() };
    const name = (list: { id: string; name: Parameters<typeof loc>[0] }[], id: string) => loc(list.find((x) => x.id === id)?.name, locale);
    const text = [
      [t("common.businessId"), d.businessId],
      [t("auth.companyName"), d.companyName],
      [t("auth.displayName"), d.displayName],
      [t("business.category"), name(meta.categories, d.categoryId)],
      [t("business.street"), `${d.street}, ${d.zip} ${name(meta.cities, d.cityId)}`],
      [t("auth.contactName"), d.contactName],
      [t("checkout.phone"), d.phone],
      [t("checkout.email"), d.email],
      ...(d.website ? [[t("deal.website"), d.website]] : []),
      ...(d.message ? [["", ""], [t("auth.bizMessage"), d.message]] : []),
    ].map(([label, value]) => (label ? `${label}: ${value}` : "")).join("\n");
    const subject = t("auth.bizSubject", { company: d.companyName, id: d.businessId });
    const href = `mailto:${APPLY_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(text)}`;
    setMail({ href, text });
    window.location.href = href;
  }

  async function copy() {
    if (!mail) return;
    try { await navigator.clipboard.writeText(mail.text); setCopied(true); setTimeout(() => setCopied(false), 2000); } catch { /* clipboard blocked: the text is shown below */ }
  }

  const box = (k: Key, label: string, icon: IconName, control: ReactNode, opts: { optional?: boolean; hint?: string; wide?: boolean } = {}) => (
    <label className={`signin-field${opts.wide ? " is-wide" : ""}`} htmlFor={k}>
      <span>{label}{opts.optional && <small className="muted"> {t("common.optional")}</small>}</span>
      <span className="signin-box"><Icon name={icon} />{control}</span>
      {err(k) ? <span className="signin-field-err"><Icon name="xc" />{err(k)}</span> : opts.hint && <span className="signin-field-hint">{opts.hint}</span>}
    </label>
  );
  const input = (k: Key, label: string, icon: IconName, props: Record<string, unknown> = {}, opts: { optional?: boolean; hint?: string; wide?: boolean } = {}) =>
    box(k, label, icon, <input id={k} value={f[k]} onChange={(e) => set(k, e.target.value)} aria-invalid={err(k) ? true : undefined} {...props} />, opts);
  const select = (k: Key, label: string, icon: IconName, options: { id: string; name: Parameters<typeof loc>[0] }[]) =>
    box(k, label, icon, (
      <select id={k} value={f[k]} onChange={(e) => set(k, e.target.value)}>
        {options.map((o) => <option key={o.id} value={o.id}>{loc(o.name, locale)}</option>)}
      </select>
    ));

  const steps: [IconName, string, string][] = [
    ["send", "auth.bizStep1", "auth.bizStep1Text"],
    ["checkc", "auth.bizStep2", "auth.bizStep2Text"],
    ["store", "auth.bizStep3", "auth.bizStep3Text"],
  ];
  const facts: [IconName, string, string][] = [
    ["card", formatPct(meta.commissionBps, locale), "auth.bizFactCommission"],
    ["bank", t("auth.bizFactPayoutTitle"), "auth.bizFactPayout"],
    ["pin", String(meta.cities.length), "auth.bizFactCities"],
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
      {mail ? (
        <div className="signin-form apply-done" role="status">
          <span className="apply-done-ic"><Icon name="mail" /></span>
          <div>
            <h1>{t("auth.bizDoneTitle")}</h1>
            <p className="muted">{t("auth.bizDoneText", { email: APPLY_EMAIL })}</p>
          </div>
          <div className="apply-done-actions">
            <a className="btn btn-primary" href={mail.href}><Icon name="send" />{t("auth.bizOpenAgain")}</a>
            <button type="button" className="btn btn-secondary" onClick={copy}><Icon name={copied ? "check" : "doc"} />{t(copied ? "auth.bizCopied" : "auth.bizCopy")}</button>
          </div>
          <pre className="apply-done-text">{`${t("auth.bizTo")}: ${APPLY_EMAIL}\n\n${mail.text}`}</pre>
          <button type="button" className="signin-back" onClick={() => setMail(null)}><Icon name="left" />{t("auth.bizEdit")}</button>
        </div>
      ) : (
        <form className="signin-form apply-form" onSubmit={submit} noValidate>
          <div className="signin-mobile-mark"><LogoSymbol height={32} /></div>
          <div>
            <h1>{t("auth.businessTitle")}</h1>
            <p className="muted">{t("auth.bizSub", { email: APPLY_EMAIL })}</p>
          </div>

          <fieldset className="apply-group">
            <legend>{t("auth.bizCompany")}</legend>
            {input("businessId", t("common.businessId"), "doc", { placeholder: "1234567-8", inputMode: "numeric", autoFocus: true })}
            {input("companyName", t("auth.companyName"), "bank", { autoComplete: "organization" })}
            {input("displayName", t("auth.displayName"), "store", {}, { hint: t("auth.bizDisplayHint") })}
            {select("categoryId", t("business.category"), "grid", meta.categories)}
            {input("street", t("business.street"), "pin", { autoComplete: "street-address" }, { wide: true })}
            {input("zip", t("business.zip"), "pin", { inputMode: "numeric", autoComplete: "postal-code", maxLength: 5 })}
            {select("cityId", t("business.city"), "compass", meta.cities)}
          </fieldset>

          <fieldset className="apply-group">
            <legend>{t("auth.bizContact")}</legend>
            {input("contactName", t("auth.contactName"), "user", { autoComplete: "name" })}
            {input("phone", t("checkout.phone"), "phone", { type: "tel", autoComplete: "tel" })}
            {input("email", t("checkout.email"), "mail", { type: "email", autoComplete: "email", inputMode: "email" })}
            {input("website", t("deal.website"), "globe", { type: "url", autoComplete: "url", placeholder: "https://" }, { optional: true })}
            <label className="signin-field is-wide" htmlFor="message">
              <span>{t("auth.bizMessage")}<small className="muted"> {t("common.optional")}</small></span>
              <textarea id="message" className="apply-textarea" rows={3} value={f.message} onChange={(e) => set("message", e.target.value)} placeholder={t("auth.bizMessageHint")} />
            </label>
          </fieldset>

          <button className="btn btn-primary btn-block signin-submit" type="submit"><Icon name="send" />{t("auth.bizSend")}</button>
          <p className="signin-terms">{t("auth.bizSendNote", { email: APPLY_EMAIL })}</p>

          <div className="signin-alt">
            <p>{t("auth.bizHaveLogin")} <Link href={`/${locale}/business`}>{t("auth.login")}</Link></p>
          </div>
        </form>
      )}
      <aside className="apply-side apply-facts" aria-label={t("auth.bizWhy")}>
        <h2>{t("auth.bizWhy")}</h2>
        <ul>
          {facts.map(([icon, value, text], i) => (
            <li key={text} style={{ animationDelay: `${160 + i * 90}ms` }}>
              <span className="apply-step-ic"><Icon name={icon} /></span>
              <div><b>{value}</b><p>{t(text, { cities: meta.cities.map((c) => loc(c.name, locale)).join(", ") })}</p></div>
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
