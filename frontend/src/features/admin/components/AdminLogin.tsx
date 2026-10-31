"use client";

import { useActionState, useState } from "react";
import { Icon } from "@/components/ui/Icon";
import { LogoSymbol } from "@/components/ui/Logo";
import { LangSwitch } from "@/components/layout/LangSwitch";
import { useI18n } from "@/i18n/I18nProvider";
import { adminLogin, type AdminLoginState } from "../actions";

/** Staff sign-in shown at /admin when there is no admin session: brand panel + a single focused form. */
export function AdminLogin({ configured, devHint = false }: { configured: boolean; devHint?: boolean }) {
  const { t } = useI18n();
  const [state, action, pending] = useActionState<AdminLoginState | null, FormData>(adminLogin, null);
  const [show, setShow] = useState(false);
  const error = !configured ? "notConfigured" : state?.error;

  return (
    <main className="alogin">
      <aside className="alogin-brand" aria-hidden="true">
        <div className="alogin-mark"><LogoSymbol height={40} /></div>
        <div>
          <p className="alogin-eyebrow">Vendelia</p>
          <p className="alogin-claim">{t("admin.login.claim")}</p>
        </div>
        <p className="alogin-foot">© Mansio Group Oy</p>
      </aside>

      <section className="alogin-main">
        <div className="alogin-top"><LangSwitch /></div>
        <form className="alogin-form" action={action} noValidate>
          <div className="alogin-mobile-mark"><LogoSymbol height={32} /></div>
          <h1>{t("admin.login.title")}</h1>
          <p className="muted">{t("admin.login.subtitle")}</p>

          {error && (
            <p className="alogin-err" role="alert"><Icon name="xc" />{t(`admin.login.${error}`)}</p>
          )}

          <label className="afield">
            <span>{t("admin.login.user")}</span>
            <span className="afield-box">
              <Icon name="mail" />
              <input name="email" type="text" autoComplete="username" autoFocus required disabled={!configured} />
            </span>
          </label>

          <label className="afield">
            <span>{t("auth.password")}</span>
            <span className="afield-box">
              <Icon name="lock" />
              <input name="password" type={show ? "text" : "password"} autoComplete="current-password" required disabled={!configured} />
              <button type="button" className="afield-eye" onClick={() => setShow((v) => !v)} aria-pressed={show}>
                {t(show ? "admin.login.hide" : "admin.login.show")}
              </button>
            </span>
          </label>

          <button className="btn btn-primary btn-block" type="submit" disabled={pending || !configured}>
            {pending ? t("admin.login.signingIn") : t("auth.login")}
          </button>

          <p className="alogin-note"><Icon name="lock" />{t("admin.login.note")}</p>
          {devHint && <p className="alogin-dev">{t("admin.login.dev")}</p>}
        </form>
      </section>
    </main>
  );
}
