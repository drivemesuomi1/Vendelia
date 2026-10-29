"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Field, TextInput } from "@/components/ui/Field";
import { Notice } from "@/components/ui/Notice";
import { useI18n } from "@/i18n/I18nProvider";
import { ApiError } from "@/lib/api-client";
import { login } from "../api";

/** Only same-site relative paths are accepted as a post-login destination (no open redirects). */
export function safeNext(next: string | null | undefined, fallback: string) {
  return next && next.startsWith("/") && !next.startsWith("//") ? next : fallback;
}

export function LoginForm({ next }: { next?: string }) {
  const { t, locale } = useI18n();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await login({ email, password });
      router.push(safeNext(next, `/${locale}`));
      router.refresh();
    } catch (e2) {
      setError(t(`errors.${e2 instanceof ApiError ? e2.code : "network"}`));
      setBusy(false);
    }
  }

  return (
    <form className="card pad stack" onSubmit={submit} noValidate>
      <h1 style={{ fontSize: 28 }}>{t("auth.loginTitle")}</h1>
      {error && <Notice tone="danger" icon="xc">{error}</Notice>}
      <Field id="email" label={t("checkout.email")}>
        <TextInput id="email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
      </Field>
      <Field id="pw" label={t("auth.password")}>
        <TextInput id="pw" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} required />
      </Field>
      <button className="btn btn-primary btn-block" type="submit" disabled={busy}>{t("auth.login")}</button>
      <p className="small muted" style={{ textAlign: "center" }}>
        {t("auth.noAccount")} <Link href={`/${locale}/register${next ? `?next=${encodeURIComponent(next)}` : ""}`}>{t("auth.createAccount")}</Link> ·{" "}
        <Link href={`/${locale}/register/business`}>{t("auth.forBusinesses")}</Link>
      </p>
    </form>
  );
}
