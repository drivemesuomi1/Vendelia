"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { registerCustomerSchema } from "@vendelia/shared";
import { Icon, type IconName } from "@/components/ui/Icon";
import { LogoSymbol } from "@/components/ui/Logo";
import { useI18n } from "@/i18n/I18nProvider";
import { ApiError } from "@/lib/api-client";
import { registerCustomer, resendSignupCode, verifySignup } from "../api";
import { AuthSplit, CartReason } from "./AuthSplit";
import { GoogleButton } from "./GoogleButton";
import { OtpStep } from "./OtpStep";
import { authQuery, safeNext } from "./LoginForm";

type FieldName = "email" | "password";
/** Sign-up asks only for email and password (same rules as the shared schema). */
const accountSchema = registerCustomerSchema.pick({ email: true, password: true });

/** Customer registration with email and password, in the same full-screen split as sign-in. */
export function RegisterForm({ next, reason }: { next?: string; reason?: string }) {
  const { t, locale } = useI18n();
  const router = useRouter();
  const [f, setF] = useState<Record<FieldName, string>>({ email: "", password: "" });
  const [show, setShow] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [step, setStep] = useState<"details" | "code">("details");
  const err = (k: FieldName | "_") => (errors[k] ? t(`errors.${errors[k]}`) : undefined);
  const problem = (e2: unknown): Record<string, string> =>
    e2 instanceof ApiError ? (Object.keys(e2.fields).length ? e2.fields : { _: e2.code }) : { _: "network" };

  async function submit(e: FormEvent) {
    e.preventDefault();
    const parsed = accountSchema.safeParse(f);
    if (!parsed.success) {
      const n: Record<string, string> = {};
      for (const i of parsed.error.issues) n[i.path.join(".")] ??= i.message;
      return setErrors(n);
    }
    setErrors({});
    setBusy(true);
    try {
      // Creates the locked account and emails the code; the account works once the code is entered.
      await registerCustomer(parsed.data, locale);
      setStep("code");
    } catch (e2) {
      setErrors(problem(e2));
    } finally {
      setBusy(false);
    }
  }

  async function verify(code: string) {
    setBusy(true);
    setErrors({});
    try {
      await verifySignup({ email: f.email.trim(), code });
      router.push(safeNext(next, `/${locale}/account`));
      router.refresh();
    } catch (e2) {
      setErrors(problem(e2));
      setBusy(false);
    }
  }

  async function resend() {
    setErrors({});
    try { await resendSignupCode(f.email.trim(), locale); } catch (e2) { setErrors(problem(e2)); }
  }

  const field = (name: FieldName, icon: IconName, input: { type: string; autoComplete: string; inputMode?: "email" }, hint?: string) => (
    <label className="signin-field">
      <span>{t(name === "email" ? "checkout.email" : "auth.password")}</span>
      <span className="signin-box">
        <Icon name={icon} />
        <input
          {...input}
          type={name === "password" && show ? "text" : input.type}
          value={f[name]}
          onChange={(e) => { setF({ ...f, [name]: e.target.value }); if (errors[name]) setErrors({ ...errors, [name]: "" }); }}
          aria-invalid={err(name) ? true : undefined}
          aria-describedby={err(name) ? `${name}-err` : hint ? `${name}-hint` : undefined}
          autoFocus={name === "email"}
        />
        {name === "password" && (
          <button type="button" className="signin-eye" onClick={() => setShow((v) => !v)} aria-pressed={show}>{t(show ? "admin.login.hide" : "admin.login.show")}</button>
        )}
      </span>
      {err(name) ? <span className="signin-field-err" id={`${name}-err`}><Icon name="xc" />{err(name)}</span>
        : hint && <span className="signin-field-hint" id={`${name}-hint`}>{hint}</span>}
    </label>
  );

  if (step === "code") {
    return (
      <AuthSplit>
        <OtpStep email={f.email.trim()} busy={busy} error={err("_")} onVerify={verify} onResend={resend} onBack={() => { setStep("details"); setErrors({}); }} />
      </AuthSplit>
    );
  }

  return (
    <AuthSplit>
      <form className="signin-form" onSubmit={submit} noValidate>
        <div className="signin-mobile-mark"><LogoSymbol height={32} /></div>
        <div>
          <h1>{t("auth.registerTitle")}</h1>
          <p className="muted">{t("auth.registerSub")}</p>
        </div>

        {reason === "cart" && <CartReason />}
        {err("_") && <p className="signin-err" role="alert"><Icon name="xc" />{err("_")}</p>}

        {field("email", "mail", { type: "email", autoComplete: "email", inputMode: "email" })}
        {field("password", "lock", { type: "password", autoComplete: "new-password" }, t("auth.passwordHint"))}

        <button className="btn btn-primary btn-block signin-submit" type="submit" disabled={busy || !f.email || !f.password}>
          {busy ? <><span className="signin-spin" aria-hidden="true" />{t("auth.creating")}</> : <>{t("auth.createAccount")}<Icon name="right" /></>}
        </button>
        <p className="signin-terms">{t("auth.registerTerms")}</p>
        <GoogleButton next={next ? safeNext(next, "/") : undefined} />

        <div className="signin-alt">
          <p>{t("auth.haveAccount")} <Link href={`/${locale}/login${authQuery(next, reason)}`}>{t("auth.login")}</Link></p>
          <Link className="signin-biz" href={`/${locale}/register/business`}><Icon name="store" />{t("auth.forBusinesses")}<Icon name="right" /></Link>
        </div>
      </form>
    </AuthSplit>
  );
}
