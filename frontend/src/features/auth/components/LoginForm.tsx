"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Icon } from "@/components/ui/Icon";
import { LogoSymbol } from "@/components/ui/Logo";
import { useI18n } from "@/i18n/I18nProvider";
import { ApiError } from "@/lib/api-client";
import { login } from "../api";
import { AuthSplit, CartReason } from "./AuthSplit";
import { GoogleButton } from "./GoogleButton";

/** Only same-site relative paths are accepted as a post-login destination (no open redirects). */
export function safeNext(next: string | null | undefined, fallback: string) {
  return next && next.startsWith("/") && !next.startsWith("//") && !/[\\\x00-\x20]/.test(next) ? next : fallback;
}

/** Query string that carries the way back (and why the visitor is here) between sign-in and registration. */
export function authQuery(next?: string, reason?: string) {
  const q = new URLSearchParams();
  if (next) q.set("next", next);
  if (reason) q.set("reason", reason);
  const s = q.toString();
  return s ? `?${s}` : "";
}

/** Customer sign-in, full screen like the portal sign-ins. */
export function LoginForm({ next, reason, error: initialError }: { next?: string; reason?: string; error?: string }) {
  const { t, locale } = useI18n();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  // On: signed in for 30 days on this device. Off: signed out when the browser closes.
  const [remember, setRemember] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await login({ email, password, remember });
      router.push(safeNext(next, `/${locale}`));
      router.refresh();
    } catch (e2) {
      setError(t(`errors.${e2 instanceof ApiError ? e2.code : "network"}`));
      setBusy(false);
    }
  }

  return (
    <AuthSplit>
      <form className="signin-form" onSubmit={submit} noValidate>
        <div className="signin-mobile-mark"><LogoSymbol height={32} /></div>
        <div>
          <h1>{t("auth.loginTitle")}</h1>
          <p className="muted">{t("auth.loginSub")}</p>
        </div>

        {reason === "cart" && <CartReason />}
        {(error || initialError === "google") && <p className="signin-err" role="alert"><Icon name="xc" />{error ?? t("auth.googleFailed")}</p>}

        <label className="signin-field">
          <span>{t("checkout.email")}</span>
          <span className="signin-box">
            <Icon name="mail" />
            <input type="email" autoComplete="email" inputMode="email" autoFocus value={email} onChange={(e) => setEmail(e.target.value)} required aria-invalid={error ? true : undefined} />
          </span>
        </label>
        <div className="signin-field">
          <span className="signin-label-row">
            <label htmlFor="login-password">{t("auth.password")}</label>
            <Link className="signin-forgot" href={`/${locale}/forgot-password`}>{t("auth.forgot")}</Link>
          </span>
          <span className="signin-box">
            <Icon name="lock" />
            <input id="login-password" type={show ? "text" : "password"} autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} required aria-invalid={error ? true : undefined} />
            <button type="button" className="signin-eye" onClick={() => setShow((v) => !v)} aria-pressed={show}>{t(show ? "admin.login.hide" : "admin.login.show")}</button>
          </span>
        </div>

        <label className="signin-check">
          <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} />
          <span className="signin-check-box" aria-hidden="true"><Icon name="check" /></span>
          {t("auth.remember")}
        </label>

        <button className="btn btn-primary btn-block signin-submit" type="submit" disabled={busy || !email || !password}>
          {busy ? <><span className="signin-spin" aria-hidden="true" />{t("admin.login.signingIn")}</> : <>{t("auth.login")}<Icon name="right" /></>}
        </button>
        <GoogleButton next={next ? safeNext(next, "/") : undefined} remember={remember} />

        <div className="signin-alt">
          <p>{t("auth.noAccount")} <Link href={`/${locale}/register${authQuery(next, reason)}`}>{t("auth.createAccount")}</Link></p>
          <Link className="signin-biz" href={`/${locale}/register/business`}><Icon name="store" />{t("auth.forBusinesses")}<Icon name="right" /></Link>
        </div>
      </form>
    </AuthSplit>
  );
}
