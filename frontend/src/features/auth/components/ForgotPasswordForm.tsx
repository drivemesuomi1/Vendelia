"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { ApiError } from "@/lib/api-client";
import { forgotPassword } from "../api";
import { Icon } from "@/components/ui/Icon";
import { LogoSymbol } from "@/components/ui/Logo";
import { useI18n } from "@/i18n/I18nProvider";
import { AuthSplit } from "./AuthSplit";

/** Password reset request. The confirmation is the same whether or not the email has an account. */
export function ForgotPasswordForm() {
  const { t, locale } = useI18n();
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const valid = /^\S+@\S+\.\S+$/.test(email.trim());

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!valid || busy) return;
    setBusy(true);
    setError(null);
    try {
      await forgotPassword(email.trim(), locale);
      setSent(true);
    } catch (e2) {
      setError(t(`errors.${e2 instanceof ApiError ? e2.code : "network"}`));
    } finally {
      setBusy(false);
    }
  }
  const back = <Link className="otp-link" href={`/${locale}/login`}><Icon name="left" />{t("auth.backToLogin")}</Link>;

  return (
    <AuthSplit>
      {sent ? (
        <div className="signin-form otp-step" key="sent">
          <span className="otp-badge ok" aria-hidden="true"><Icon name="check" /></span>
          <div>
            <h1>{t("auth.forgotSent")}</h1>
            <p className="muted" role="status">{t("auth.forgotSentSub", { email: email.trim() })}</p>
          </div>
          <button type="button" className="btn btn-secondary btn-block signin-google" onClick={() => setSent(false)}>{t("auth.otpChange")}</button>
          <div className="otp-links">{back}</div>
        </div>
      ) : (
        <form className="signin-form" onSubmit={submit} noValidate key="ask">
          <div className="signin-mobile-mark"><LogoSymbol height={32} /></div>
          <div>
            <h1>{t("auth.forgotTitle")}</h1>
            <p className="muted">{t("auth.forgotSub")}</p>
          </div>
          {error && <p className="signin-err" role="alert"><Icon name="xc" />{error}</p>}
          <label className="signin-field">
            <span>{t("checkout.email")}</span>
            <span className="signin-box">
              <Icon name="mail" />
              <input type="email" autoComplete="email" inputMode="email" autoFocus value={email} onChange={(e) => setEmail(e.target.value)} required />
            </span>
          </label>
          <button className="btn btn-primary btn-block signin-submit" type="submit" disabled={!valid || busy}>
            {busy ? <><span className="signin-spin" aria-hidden="true" />{t("auth.forgotSending")}</> : <>{t("auth.forgotSend")}<Icon name="right" /></>}
          </button>
          <div className="otp-links">{back}</div>
        </form>
      )}
    </AuthSplit>
  );
}
