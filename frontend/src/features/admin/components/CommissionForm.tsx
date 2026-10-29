"use client";

import { useState, type FormEvent } from "react";
import { Field, TextInput } from "@/components/ui/Field";
import { Notice } from "@/components/ui/Notice";
import { useToast } from "@/components/ui/Toast";
import { useI18n } from "@/i18n/I18nProvider";
import { formatPct } from "@/lib/format";
import { setCommission } from "../api";

/** Platform commission rate. Existing orders keep the rate snapshotted at purchase. */
export function CommissionForm({ rateBps }: { rateBps: number }) {
  const { t, locale } = useI18n();
  const toast = useToast();
  const [value, setValue] = useState((rateBps / 100).toString());
  const [current, setCurrent] = useState(rateBps);
  const [error, setError] = useState<string | undefined>();

  async function submit(e: FormEvent) {
    e.preventDefault();
    const bps = Math.round(parseFloat(value.replace(",", ".")) * 100);
    if (!Number.isFinite(bps) || bps < 0 || bps > 5000) return setError(t("admin.commissionRange"));
    setError(undefined);
    setCurrent((await setCommission(bps)).rateBps);
    toast(t("admin.saved"));
  }

  return (
    <form className="card pad stack" onSubmit={submit} style={{ maxWidth: 520 }}>
      <p>{t("admin.currentRate", { rate: formatPct(current, locale) })}</p>
      <Field id="rate" label={t("admin.newRate")} error={error} hint={t("admin.rateHint")}>
        <TextInput id="rate" inputMode="decimal" value={value} onChange={(e) => setValue(e.target.value)} error={error} hint />
      </Field>
      <Notice tone="indigo" icon="info"><p>{t("admin.snapshotNote")}</p></Notice>
      <button className="btn btn-primary" type="submit" style={{ alignSelf: "flex-start" }}>{t("admin.save")}</button>
    </form>
  );
}
