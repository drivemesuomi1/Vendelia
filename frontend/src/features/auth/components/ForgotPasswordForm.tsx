"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { Icon } from "@/components/ui/Icon";
import { LogoSymbol } from "@/components/ui/Logo";
import { useI18n } from "@/i18n/I18nProvider";
import { AuthSplit } from "./AuthSplit";

/** Password reset request. UI only for now: no email is sent yet, the confirmation is shown either way. */
export function ForgotPasswordForm() {
  const { t, locale } = useI18n();
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const valid = /^\S+@\S+\.\S+$/.test(email.trim());

  const submit = (e: FormEvent) => { e.preventDefault(); if (valid) setSent(true); };
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
          <label className="signin-field">
            <span>{t("checkout.email")}</span>
            <span className="signin-box">
              <Icon name="mail" />
              <input type="email" autoComplete="email" inputMode="email" autoFocus value={email} onChange={(e) => setEmail(e.target.value)} required />
            </span>
          </label>
          <button className="btn btn-primary btn-block signin-submit" type="submit" disabled={!valid}>
            {t("auth.forgotSend")}<Icon name="right" />
          </button>
          <div className="otp-links">{back}</div>
        </form>
      )}
    </AuthSplit>
  );
}
