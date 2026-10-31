"use client";

import { useState, type FormEvent, type ReactNode } from "react";
import { Icon } from "@/components/ui/Icon";
import { LogoSymbol } from "@/components/ui/Logo";
import { LangSwitch } from "@/components/layout/LangSwitch";
import { PortalShell } from "@/components/layout/PortalShell";
import { useI18n } from "@/i18n/I18nProvider";
import { changeOwnPassword, DEV_BUSINESS_LOGIN, signInBusiness, signOutBusiness, useBusinessSession, useHydrated, type DemoBusiness } from "./store";

/**
 * Business portal entry: sign-in with the details the admin created, a forced password change on first
 * sign-in, a notice for suspended accounts, then the portal itself. Demo store until /api/auth exists.
 */
export function BusinessGate({ children }: { children: ReactNode }) {
  const { t } = useI18n();
  const hydrated = useHydrated();
  const business = useBusinessSession();

  if (!hydrated) return <div className="gate-loading" aria-busy="true" />;
  if (!business) return <BusinessSignIn />;
  if (business.mustChangePassword) return <SetPassword business={business} />;
  return (
    <PortalShell kind="business" account={{ title: business.name, lines: [`${t("common.businessId")} ${business.businessId}`, business.email], onSignOut: signOutBusiness }}>
      <p className="demo-bar"><Icon name="info" />{t("business.demoHint")}</p>
      {business.status === "suspended" ? (
        <div className="panel empty-state">
          <span className="attn-ic danger"><Icon name="xc" /></span>
          <h3>{t("business.suspendedTitle")}</h3>
          <p className="muted small">{t("business.suspendedText")}</p>
        </div>
      ) : (
        children
      )}
    </PortalShell>
  );
}

function AuthFrame({ children }: { children: ReactNode }) {
  const { t } = useI18n();
  return (
    <main className="alogin">
      <aside className="alogin-brand" aria-hidden="true">
        <div className="alogin-mark"><LogoSymbol height={40} /></div>
        <div>
          <p className="alogin-eyebrow">Vendelia</p>
          <p className="alogin-claim">{t("business.login.claim")}</p>
        </div>
        <p className="alogin-foot">© Mansio Group Oy</p>
      </aside>
      <section className="alogin-main">
        <div className="alogin-top"><LangSwitch /></div>
        {children}
      </section>
    </main>
  );
}

function BusinessSignIn() {
  const { t } = useI18n();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [error, setError] = useState(false);
  const [busy, setBusy] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(false);
    const ok = await signInBusiness(email, password);
    if (!ok) {
      setError(true);
      setBusy(false);
    }
  };

  return (
    <AuthFrame>
      <form className="alogin-form" onSubmit={submit} noValidate>
        <div className="alogin-mobile-mark"><LogoSymbol height={32} /></div>
        <h1>{t("business.login.title")}</h1>
        <p className="muted">{t("business.login.subtitle")}</p>
        {error && <p className="alogin-err" role="alert"><Icon name="xc" />{t("business.login.invalid")}</p>}
        <label className="afield">
          <span>{t("admin.mb.loginEmail")}</span>
          <span className="afield-box">
            <Icon name="mail" />
            <input type="text" inputMode="email" autoComplete="username" autoFocus required value={email} onChange={(e) => setEmail(e.target.value)} />
          </span>
        </label>
        <label className="afield">
          <span>{t("auth.password")}</span>
          <span className="afield-box">
            <Icon name="lock" />
            <input type={show ? "text" : "password"} autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} />
            <button type="button" className="afield-eye" onClick={() => setShow((v) => !v)} aria-pressed={show}>{t(show ? "admin.login.hide" : "admin.login.show")}</button>
          </span>
        </label>
        <button className="btn btn-primary btn-block" type="submit" disabled={busy || !email || !password}>
          {busy ? t("admin.login.signingIn") : t("auth.login")}
        </button>
        <p className="alogin-note"><Icon name="info" />{t("business.login.noAccount")}</p>
        {DEV_BUSINESS_LOGIN && <p className="alogin-dev">{t("admin.login.dev")}</p>}
      </form>
    </AuthFrame>
  );
}

function SetPassword({ business }: { business: DemoBusiness }) {
  const { t } = useI18n();
  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (pw.length < 12) return setError(t("admin.mb.errPassword"));
    if (pw !== pw2) return setError(t("business.login.mismatch"));
    setBusy(true);
    await changeOwnPassword(business.id, pw);
  };

  return (
    <AuthFrame>
      <form className="alogin-form" onSubmit={submit} noValidate>
        <div className="alogin-mobile-mark"><LogoSymbol height={32} /></div>
        <h1>{t("business.login.setTitle")}</h1>
        <p className="muted">{t("business.login.setText", { name: business.name })}</p>
        {error && <p className="alogin-err" role="alert"><Icon name="xc" />{error}</p>}
        <label className="afield">
          <span>{t("business.login.newPassword")}</span>
          <span className="afield-box"><Icon name="lock" /><input type="password" autoComplete="new-password" autoFocus value={pw} onChange={(e) => { setPw(e.target.value); setError(""); }} /></span>
        </label>
        <label className="afield">
          <span>{t("business.login.repeatPassword")}</span>
          <span className="afield-box"><Icon name="lock" /><input type="password" autoComplete="new-password" value={pw2} onChange={(e) => { setPw2(e.target.value); setError(""); }} /></span>
        </label>
        <p className="hint">{t("admin.mb.errPassword")}</p>
        <button className="btn btn-primary btn-block" type="submit" disabled={busy}>{t("business.login.save")}</button>
        <button className="btn btn-ghost btn-block" type="button" onClick={signOutBusiness}>{t("auth.logout")}</button>
      </form>
    </AuthFrame>
  );
}
