"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { registerCustomerSchema } from "@vendelia/shared";
import { Field, TextInput } from "@/components/ui/Field";
import { Notice } from "@/components/ui/Notice";
import { useI18n } from "@/i18n/I18nProvider";
import { ApiError } from "@/lib/api-client";
import { registerCustomer } from "../api";
import { safeNext } from "./LoginForm";

export function RegisterForm({ next }: { next?: string }) {
  const { t, locale } = useI18n();
  const router = useRouter();
  const [f, setF] = useState({ name: "", email: "", password: "" });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const err = (k: string) => (errors[k] ? t(`errors.${errors[k]}`) : undefined);

  async function submit(e: FormEvent) {
    e.preventDefault();
    const parsed = registerCustomerSchema.safeParse(f);
    if (!parsed.success) {
      const n: Record<string, string> = {};
      for (const i of parsed.error.issues) n[i.path.join(".")] ??= i.message;
      return setErrors(n);
    }
    setBusy(true);
    try {
      await registerCustomer(parsed.data);
      router.push(safeNext(next, `/${locale}/account/vouchers`));
      router.refresh();
    } catch (e2) {
      setErrors(e2 instanceof ApiError ? (Object.keys(e2.fields).length ? e2.fields : { _: e2.code }) : { _: "network" });
      setBusy(false);
    }
  }

  return (
    <form className="card pad stack" onSubmit={submit} noValidate>
      <h1 style={{ fontSize: 28 }}>{t("auth.registerTitle")}</h1>
      {errors._ && <Notice tone="danger" icon="xc">{t(`errors.${errors._}`)}</Notice>}
      <Field id="name" label={t("auth.name")} required error={err("name")}>
        <TextInput id="name" autoComplete="name" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} error={err("name")} />
      </Field>
      <Field id="email" label={t("checkout.email")} required error={err("email")}>
        <TextInput id="email" type="email" autoComplete="email" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} error={err("email")} />
      </Field>
      <Field id="pw" label={t("auth.password")} required error={err("password")} hint={t("auth.passwordHint")}>
        <TextInput id="pw" type="password" autoComplete="new-password" value={f.password} onChange={(e) => setF({ ...f, password: e.target.value })} error={err("password")} hint />
      </Field>
      <button className="btn btn-primary btn-block" type="submit" disabled={busy}>{t("auth.createAccount")}</button>
      <p className="small muted" style={{ textAlign: "center" }}>
        {t("auth.haveAccount")} <Link href={`/${locale}/login`}>{t("auth.login")}</Link>
      </p>
    </form>
  );
}
