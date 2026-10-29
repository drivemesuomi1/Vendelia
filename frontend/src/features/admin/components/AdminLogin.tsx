"use client";

import { useActionState } from "react";
import { Field, TextInput } from "@/components/ui/Field";
import { LogoSymbol } from "@/components/ui/Logo";
import { Notice } from "@/components/ui/Notice";
import { useI18n } from "@/i18n/I18nProvider";
import { adminLogin, type AdminLoginState } from "../actions";

/** Staff sign-in shown at /admin when there is no admin session. */
export function AdminLogin({ configured }: { configured: boolean }) {
  const { t } = useI18n();
  const [state, action, pending] = useActionState<AdminLoginState | null, FormData>(adminLogin, null);
  const error = !configured ? "notConfigured" : state?.error;

  return (
    <main className="wrap auth-wrap">
      <form className="card pad stack" action={action}>
        <div className="row" style={{ gap: 12 }}>
          <LogoSymbol height={36} />
          <div>
            <h1 style={{ fontSize: 26 }}>{t("admin.login.title")}</h1>
            <p className="muted small">{t("admin.login.subtitle")}</p>
          </div>
        </div>
        {error && <Notice tone="danger" icon="xc">{t(`admin.login.${error}`)}</Notice>}
        <Field id="admin-email" label={t("checkout.email")}>
          <TextInput id="admin-email" name="email" type="email" autoComplete="username" required disabled={!configured} />
        </Field>
        <Field id="admin-pw" label={t("auth.password")}>
          <TextInput id="admin-pw" name="password" type="password" autoComplete="current-password" required disabled={!configured} />
        </Field>
        <button className="btn btn-primary btn-block" type="submit" disabled={pending || !configured}>
          {t("auth.login")}
        </button>
      </form>
    </main>
  );
}
