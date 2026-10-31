"use client";

import { useEffect, useState, type FormEvent } from "react";
import { VOUCHER_CODE_RE, type RedeemLookupDTO } from "@vendelia/shared";
import { Field, TextInput } from "@/components/ui/Field";
import { Icon } from "@/components/ui/Icon";
import { Notice } from "@/components/ui/Notice";
import { useToast } from "@/components/ui/Toast";
import { useI18n } from "@/i18n/I18nProvider";
import { ApiError } from "@/lib/api-client";
import { formatDate, formatMoney, itemTitle } from "@/lib/format";
import { lookupVoucher, redeemVoucher } from "../api";

/** Check a code, then confirm redemption. The API enforces single use atomically. */
export function RedeemPanel() {
  const { t, locale } = useI18n();
  const toast = useToast();
  const [code, setCode] = useState("");
  const [result, setResult] = useState<RedeemLookupDTO | null>(null);
  const [redeemed, setRedeemed] = useState<RedeemLookupDTO | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function check(e: FormEvent) {
    e.preventDefault();
    await lookup(code);
  }

  // Arriving from a voucher's check page (?code=…) fills in and checks that code.
  useEffect(() => {
    const fromLink = new URLSearchParams(window.location.search).get("code");
    if (fromLink) {
      setCode(fromLink);
      void lookup(fromLink);
    }
    // Runs once, on arrival from the link.
  }, []);

  async function lookup(value: string) {
    setRedeemed(null);
    setError(null);
    const c = value.trim().toUpperCase();
    if (!VOUCHER_CODE_RE.test(c)) return setError(t("errors.invalidVoucherCode"));
    setBusy(true);
    try {
      setResult(await lookupVoucher(c));
    } catch {
      setError(t("errors.network"));
    } finally {
      setBusy(false);
    }
  }

  async function confirm() {
    if (!result) return;
    setBusy(true);
    try {
      const r = await redeemVoucher(result.code);
      setRedeemed(r);
      setResult(null);
      setCode("");
      toast(t("business.redeemedToast"));
    } catch (e) {
      setError(t(`errors.${e instanceof ApiError ? e.code : "network"}`));
    } finally {
      setBusy(false);
    }
  }

  const reason = (r: RedeemLookupDTO) =>
    ({
      not_found: t("business.rNotFound"),
      other_merchant: t("business.rOther"),
      redeemed: t("business.rUsed", { date: r.redeemedAt ? formatDate(r.redeemedAt, locale) : "" }),
      refunded: t("business.rRefunded"),
      expired: t("business.rExpired", { date: r.expiresAt ? formatDate(r.expiresAt, locale) : "" }),
      valid: "",
    })[r.result];

  return (
    <div className="card pad stack">
      <form onSubmit={check} className="stack">
        <Field id="rc" label={t("business.enterCode")} error={error ?? undefined}>
          <TextInput id="rc" className="input mono" value={code} onChange={(e) => setCode(e.target.value)} autoComplete="off" autoCapitalize="characters" placeholder="VND-XXXX-XXXX" style={{ letterSpacing: ".05em", textTransform: "uppercase" }} error={error ?? undefined} />
        </Field>
        <button className="btn btn-primary btn-block" type="submit" disabled={busy}>{t("business.checkCode")}</button>
      </form>
      <div aria-live="polite">
        {result?.result === "valid" && (
          <div className="card pad stack" style={{ boxShadow: "none" }}>
            <div className="row wrap-row">
              <span className="chip teal"><Icon name="checkc" />{t("vouchers.validUnused")}</span>
              {result.test && <span className="chip danger"><Icon name="info" />{t("vouchers.testUnpaid")}</span>}
            </div>
            <p style={{ fontWeight: 600 }}>{itemTitle(result.title!, null, result.optionLabel ?? null, locale)}</p>
            <p className="muted small">
              {t("vouchers.validUntil", { date: formatDate(result.expiresAt!, locale) })}
              {result.recipientName ? ` · ${t("vouchers.giftFor", { name: result.recipientName })}` : ""}
            </p>
            <button className="btn btn-primary" onClick={confirm} disabled={busy}>{t("business.markRedeemed")}</button>
          </div>
        )}
        {result && result.result !== "valid" && <Notice tone="warn" icon="xc"><p>{reason(result)}</p></Notice>}
        {redeemed && (
          <Notice icon="checkc">
            <p>{t("business.redeemedNote", { code: redeemed.code, amount: formatMoney(redeemed.payoutCents ?? 0, locale) })}</p>
          </Notice>
        )}
      </div>
    </div>
  );
}
