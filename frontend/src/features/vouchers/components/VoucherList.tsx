"use client";

import { useState } from "react";
import type { VoucherDTO } from "@vendelia/shared";
import { Dialog } from "@/components/ui/Dialog";
import { Icon } from "@/components/ui/Icon";
import { Notice } from "@/components/ui/Notice";
import { useToast } from "@/components/ui/Toast";
import { useI18n } from "@/i18n/I18nProvider";
import { ApiError } from "@/lib/api-client";
import { formatDate, formatMoney, itemTitle } from "@/lib/format";
import { cancelVoucher } from "../api";
import { VoucherCard } from "./VoucherCard";
import { VoucherStatus } from "./VoucherStatus";

/** "My vouchers": status, show voucher, and cancel within the refund window. */
export function VoucherList({ initial, email }: { initial: VoucherDTO[]; email: string }) {
  const { t, locale } = useI18n();
  const toast = useToast();
  const [vouchers, setVouchers] = useState(initial);
  const [showing, setShowing] = useState<VoucherDTO | null>(null);
  const [cancelling, setCancelling] = useState<VoucherDTO | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function confirmCancel() {
    if (!cancelling) return;
    setBusy(true);
    setError(null);
    try {
      const updated = await cancelVoucher(cancelling.code);
      setVouchers((vs) => vs.map((v) => (v.code === updated.code ? updated : v)));
      setCancelling(null);
      toast(t("vouchers.cancelled"));
    } catch (e) {
      setError(t(`errors.${e instanceof ApiError ? e.code : "network"}`));
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <p className="muted" style={{ marginTop: 6 }}>{t("vouchers.signedInAs", { email })}</p>
      <div className="stack" style={{ marginTop: "var(--s3)" }}>
        {!vouchers.length && (
          <div className="card empty"><p style={{ fontWeight: 600 }}>{t("vouchers.none")}</p></div>
        )}
        {vouchers.map((v) => {
          const title = itemTitle(v.title, null, v.optionLabel, locale);
          return (
            <article className="card purchase" key={v.code} aria-labelledby={`t-${v.code}`}>
              <div className="thumb"><img src={v.imageUrl} alt="" loading="lazy" /></div>
              <div style={{ minWidth: 0 }}>
                <div className="row wrap-row" style={{ marginBottom: 4 }}>
                  <VoucherStatus v={v} />
                  {v.recipientName && <span className="chip indigo"><Icon name="gift" />{t("vouchers.gift")}</span>}
                </div>
                <h2 id={`t-${v.code}`} style={{ fontSize: 17 }}>{title}</h2>
                <p className="muted small">
                  {v.merchantName} · {t("vouchers.code")} <span className="mono">{v.code}</span> · {formatMoney(v.priceCents, locale)}
                </p>
                <p className="small" style={{ marginTop: 4 }}>
                  {t("vouchers.purchasedOn", { date: formatDate(v.issuedAt, locale) })} ·{" "}
                  {v.status === "refunded" ? t("vouchers.cancelledLabel") : t("vouchers.validUntil", { date: formatDate(v.expiresAt, locale) })}
                </p>
                {v.cancellableUntil && <p className="hint">{t("vouchers.freeCancelUntil", { date: formatDate(v.cancellableUntil, locale) })}</p>}
              </div>
              <div className="actions">
                {v.status === "active" && <button className="btn btn-secondary btn-sm" onClick={() => setShowing(v)}>{t("vouchers.show")}</button>}
                {v.cancellableUntil && <button className="btn btn-danger btn-sm" onClick={() => { setError(null); setCancelling(v); }}>{t("vouchers.cancelRefund")}</button>}
              </div>
            </article>
          );
        })}
      </div>
      <Notice className="mt" icon="help">{t("vouchers.help")}</Notice>

      <Dialog open={!!showing} onClose={() => setShowing(null)} wide labelledBy="show-title">
        <div className="pad row between">
          <h2 id="show-title" style={{ fontSize: 20 }}>{t("vouchers.voucher")}</h2>
          <button className="btn btn-ghost" onClick={() => setShowing(null)} aria-label={t("common.close")}><Icon name="x" /></button>
        </div>
        {showing && <div style={{ padding: "0 16px 16px" }}><VoucherCard v={showing} /></div>}
      </Dialog>

      <Dialog open={!!cancelling} onClose={() => setCancelling(null)} labelledBy="cancel-title">
        {cancelling && (
          <div className="pad stack">
            <h2 id="cancel-title" style={{ fontSize: 20 }}>{t("vouchers.cancelTitle")}</h2>
            <p>{itemTitle(cancelling.title, null, cancelling.optionLabel, locale)} · <span className="mono">{cancelling.code}</span></p>
            <p className="muted">{t("vouchers.cancelBody", { amount: formatMoney(cancelling.priceCents, locale) })}</p>
            {error && <Notice tone="danger" icon="xc">{error}</Notice>}
            <div className="row wrap-row" style={{ justifyContent: "flex-end" }}>
              <button className="btn btn-secondary" onClick={() => setCancelling(null)}>{t("vouchers.keep")}</button>
              <button className="btn btn-primary" onClick={confirmCancel} disabled={busy}>{t("vouchers.cancelRefund")}</button>
            </div>
          </div>
        )}
      </Dialog>
    </>
  );
}
