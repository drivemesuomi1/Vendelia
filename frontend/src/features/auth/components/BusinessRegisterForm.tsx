"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { registerMerchantSchema } from "@vendelia/shared";
import { Field, TextInput } from "@/components/ui/Field";
import { Notice } from "@/components/ui/Notice";
import { useI18n } from "@/i18n/I18nProvider";
import { ApiError } from "@/lib/api-client";
import { loc } from "@/lib/format";
import { useAppData } from "@/lib/meta-context";
import { lookupCompany, registerMerchant } from "../api";

/** Business sign-up. The business ID prefills the company name from the Finnish trade register (PRH/YTJ). */
export function BusinessRegisterForm() {
  const { t, locale } = useI18n();
  const { meta } = useAppData();
  const router = useRouter();
  const [f, setF] = useState({ businessId: "", companyName: "", displayName: "", contactName: "", email: "", password: "", phone: "", street: "", zip: "", cityId: meta.cities[0]?.id ?? "" });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [lookup, setLookup] = useState<"idle" | "found" | "none">("idle");
  const [busy, setBusy] = useState(false);
  const set = (k: keyof typeof f, v: string) => setF((p) => ({ ...p, [k]: v }));
  const err = (k: string) => (errors[k] ? t(`errors.${errors[k]}`) : undefined);

  async function onBusinessIdBlur() {
    if (!/^\d{7}-\d$/.test(f.businessId)) return;
    try {
      const { company } = await lookupCompany(f.businessId);
      if (company) {
        setF((p) => ({ ...p, companyName: p.companyName || company.name, displayName: p.displayName || company.name.replace(/\s+(Oy|Ab|Oyj|Ky|Tmi)$/i, "") }));
        setLookup("found");
      } else setLookup("none");
    } catch {
      setLookup("none");
    }
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    const parsed = registerMerchantSchema.safeParse(f);
    if (!parsed.success) {
      const n: Record<string, string> = {};
      for (const i of parsed.error.issues) n[i.path.join(".")] ??= i.message;
      return setErrors(n);
    }
    setBusy(true);
    try {
      await registerMerchant(parsed.data);
      router.push(`/${locale}/business`);
      router.refresh();
    } catch (e2) {
      setErrors(e2 instanceof ApiError ? (Object.keys(e2.fields).length ? e2.fields : { _: e2.code }) : { _: "network" });
      setBusy(false);
    }
  }

  const input = (k: keyof typeof f, label: string, props: Record<string, unknown> = {}, hint?: string) => (
    <Field id={k} label={label} required error={err(k)} hint={hint}>
      <TextInput id={k} value={f[k]} onChange={(e) => set(k, e.target.value)} error={err(k)} hint={!!hint} {...props} />
    </Field>
  );

  return (
    <form className="card pad stack" onSubmit={submit} noValidate>
      <h1 style={{ fontSize: 28 }}>{t("auth.businessTitle")}</h1>
      <p className="muted">{t("auth.businessIntro")}</p>
      {errors._ && <Notice tone="danger" icon="xc">{t(`errors.${errors._}`)}</Notice>}
      {input("businessId", t("common.businessId"), { onBlur: onBusinessIdBlur, placeholder: "1234567-8", inputMode: "numeric" }, lookup === "found" ? t("auth.prhFound") : lookup === "none" ? t("auth.prhNone") : t("auth.prhHint"))}
      <div className="form-grid two">
        {input("companyName", t("auth.companyName"))}
        {input("displayName", t("auth.displayName"))}
      </div>
      <div className="form-grid two">
        {input("street", t("business.street"))}
        <div className="form-grid two">
          {input("zip", t("business.zip"), { inputMode: "numeric" })}
          <Field id="cityId" label={t("business.city")}>
            <select id="cityId" className="select" value={f.cityId} onChange={(e) => set("cityId", e.target.value)}>
              {meta.cities.map((c) => <option key={c.id} value={c.id}>{loc(c.name, locale)}</option>)}
            </select>
          </Field>
        </div>
      </div>
      <div className="form-grid two">
        {input("contactName", t("auth.contactName"), { autoComplete: "name" })}
        {input("phone", t("checkout.phone"), { type: "tel", autoComplete: "tel" })}
      </div>
      <div className="form-grid two">
        {input("email", t("checkout.email"), { type: "email", autoComplete: "email" })}
        {input("password", t("auth.password"), { type: "password", autoComplete: "new-password" }, t("auth.passwordHint"))}
      </div>
      <Notice tone="indigo" icon="info"><p>{t("auth.businessReview")}</p></Notice>
      <button className="btn btn-primary" type="submit" disabled={busy} style={{ alignSelf: "flex-start" }}>{t("auth.businessSubmit")}</button>
    </form>
  );
}
