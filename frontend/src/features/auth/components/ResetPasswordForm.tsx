"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { Icon } from "@/components/ui/Icon";
import { LogoSymbol } from "@/components/ui/Logo";
import { useI18n } from "@/i18n/I18nProvider";
import { ApiError } from "@/lib/api-client";
import { resetPassword } from "../api";
import { AuthSplit } from "./AuthSplit";

const LINK = /^[0-9a-f-]{36}$/i;
const TOKEN = /^[a-f0-9]{64}$/;

/** "Set a new password", opened from the reset email. After saving, every old session is signed out. */
export function ResetPasswordForm({ id, token }: { id: string; token: string }) {
  const { t, locale } = useI18n();
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<"customer" | "merchant" | "admin" | null>(null);
  const [invalid, setInvalid] = useState(!LINK.test(id) || !TOKEN.test(token));

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (password.length < 8) return setError(t("errors.passwordTooShort"));
    setBusy(true);
    setError(null);
    try {
      setDone((await resetPassword({ id, token, password })).role);
    } catch (e2) {
      const code = e2 instanceof ApiError ? e2.code : "network";
      if (code === "resetLinkInvalid") setInvalid(true);
      else setError(t(`errors.${code}`));
      setBusy(false);
    }
  }

  const back = <Link className="otp-link" href={`/${locale}/login`}><Icon name="left" />{t("auth.backToLogin")}</Link>;
  // Businesses and admins sign in on their own portals.
  const signIn = done === "merchant" ? `/${locale}/business` : done === "admin" ? `/${locale}/admin` : `/${locale}/login`;

  if (invalid) {
    return (
      <AuthSplit>
        <div className="signin-form otp-step">
          <span className="otp-badge" aria-hidden="true"><Icon name="xc" /></span>
          <div>
            <h1>{t("auth.resetInvalid")}</h1>
            <p className="muted">{t("auth.resetInvalidSub")}</p>
          </div>
          <Link className="btn btn-primary btn-block signin-submit" href={`/${locale}/forgot-password`}>{t("auth.resetRequestNew")}<Icon name="right" /></Link>
          <div className="otp-links">{back}</div>
        </div>
      </AuthSplit>
    );
  }

  if (done) {
    return (
      <AuthSplit>
        <div className="signin-form otp-step">
          <span className="otp-badge ok" aria-hidden="true"><Icon name="check" /></span>
          <div>
            <h1>{t("auth.resetDone")}</h1>
            <p className="muted" role="status">{t("auth.resetDoneSub")}</p>
          </div>
          <Link className="btn btn-primary btn-block signin-submit" href={signIn}>{t("auth.login")}<Icon name="right" /></Link>
        </div>
      </AuthSplit>
    );
  }

  return (
    <AuthSplit>
      <form className="signin-form" onSubmit={submit} noValidate>
        <div className="signin-mobile-mark"><LogoSymbol height={32} /></div>
        <div>
          <h1>{t("auth.resetTitle")}</h1>
          <p className="muted">{t("auth.resetSub")}</p>
        </div>
        {error && <p className="signin-err" role="alert"><Icon name="xc" />{error}</p>}
        <label className="signin-field">
          <span>{t("auth.resetNew")}</span>
          <span className="signin-box">
            <Icon name="lock" />
            <input type={show ? "text" : "password"} autoComplete="new-password" autoFocus value={password}
              onChange={(e) => { setPassword(e.target.value); if (error) setError(null); }} required minLength={8} aria-describedby="reset-hint" />
            <button type="button" className="signin-eye" onClick={() => setShow((v) => !v)} aria-pressed={show}>{t(show ? "admin.login.hide" : "admin.login.show")}</button>
          </span>
          <span className="signin-field-hint" id="reset-hint">{t("auth.passwordHint")}</span>
        </label>
        <button className="btn btn-primary btn-block signin-submit" type="submit" disabled={busy || !password}>
          {busy ? <><span className="signin-spin" aria-hidden="true" />{t("auth.resetSaving")}</> : <>{t("auth.resetSave")}<Icon name="right" /></>}
        </button>
        <div className="otp-links">{back}</div>
      </form>
    </AuthSplit>
  );
}
