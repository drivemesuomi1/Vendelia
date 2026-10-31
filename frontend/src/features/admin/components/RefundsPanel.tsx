"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import type { AdminRefundRowDTO } from "@vendelia/shared";
import { Field, TextInput } from "@/components/ui/Field";
import { useToast } from "@/components/ui/Toast";
import { useI18n } from "@/i18n/I18nProvider";
import { ApiError } from "@/lib/api-client";
import { formatDate, formatMoney, loc } from "@/lib/format";
import { supportRefund } from "../api";

export function RefundsPanel({ refunds }: { refunds: AdminRefundRowDTO[] }) {
  const { t, locale } = useI18n();
  const router = useRouter();
  const toast = useToast();
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | undefined>();

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!window.confirm(t("admin.confirmRefund", { code: code.toUpperCase() }))) return;
    try {
      await supportRefund(code.trim());
      setCode("");
      setError(undefined);
      toast(t("admin.refundDone"));
      router.refresh();
    } catch (e2) {
      setError(t(`errors.${e2 instanceof ApiError ? e2.code : "network"}`));
    }
  }

  return (
    <div className="stack">
      <form className="card pad stack" onSubmit={submit} style={{ maxWidth: 520 }}>
        <h2 style={{ fontSize: 18 }}>{t("admin.supportRefund")}</h2>
        <Field id="code" label={t("admin.voucherCode")} error={error} hint={t("admin.supportRefundHint")}>
          <TextInput id="code" className="input mono" value={code} onChange={(e) => setCode(e.target.value)} placeholder="VND-XXXX-XXXX" error={error} hint />
        </Field>
        <button className="btn btn-danger" type="submit" style={{ alignSelf: "flex-start" }}>{t("admin.refund")}</button>
      </form>
      <div className="card">
        <div className="table-wrap">
          <table>
            <thead><tr><th>{t("vouchers.code")}</th><th>{t("business.colDeal")}</th><th>{t("admin.merchant")}</th><th>{t("admin.email")}</th><th className="num">{t("business.colPrice")}</th><th>{t("admin.refundedAt")}</th></tr></thead>
            <tbody>
              {refunds.map((r) => (
                <tr key={r.code}>
                  <td className="mono">{r.code}</td><td>{loc(r.title, locale)}</td><td>{r.merchantName}</td><td>{r.email}</td>
                  <td className="num">{formatMoney(r.priceCents, locale)}</td><td>{formatDate(r.refundedAt, locale)}</td>
                </tr>
              ))}
              {!refunds.length && <tr><td colSpan={6} className="muted">{t("admin.noRefunds")}</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
