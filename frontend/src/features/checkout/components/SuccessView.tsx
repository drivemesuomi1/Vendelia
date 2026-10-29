"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { OrderDTO } from "@vendelia/shared";
import { Icon } from "@/components/ui/Icon";
import { Notice } from "@/components/ui/Notice";
import { useI18n } from "@/i18n/I18nProvider";
import { formatDate, formatMoney } from "@/lib/format";
import { VoucherCard } from "@/features/vouchers/components/VoucherCard";
import { fetchOrder } from "../api";
import { CheckoutSteps } from "./CheckoutSteps";

/** Thank-you page with every voucher from the order. */
export function SuccessView({ orderId }: { orderId: string }) {
  const { t, locale } = useI18n();
  const [order, setOrder] = useState<OrderDTO | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    fetchOrder(orderId).then(setOrder).catch(() => setFailed(true));
  }, [orderId]);

  if (failed) {
    return (
      <main className="wrap" style={{ paddingTop: "var(--s4)", maxWidth: 900 }}>
        <Notice tone="warn" icon="info">{t("checkout.orderNotVisible")}</Notice>
        <Link className="btn btn-primary" style={{ marginTop: 16 }} href={`/${locale}/account/vouchers`}>{t("nav.myVouchers")}</Link>
      </main>
    );
  }
  if (!order) return <main className="wrap empty"><div className="spin" aria-hidden="true" /></main>;

  const n = order.vouchers.length;
  const cancelUntil = order.vouchers[0]?.cancellableUntil;
  return (
    <main className="wrap" style={{ paddingTop: "var(--s4)", maxWidth: 900 }}>
      <CheckoutSteps current={3} />
      <div style={{ textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center", gap: "var(--s2)" }}>
        <div className="success-ic"><Icon name="check" /></div>
        <h1 style={{ fontSize: "clamp(26px,4vw,34px)" }}>{t("checkout.thanks")}</h1>
        <p className="muted">
          {t(n === 1 ? "checkout.sentOne" : "checkout.sentMany", { n, email: order.email })}{" "}
          {t("checkout.orderMeta", { number: order.number, total: formatMoney(order.totalCents, locale) })}
        </p>
      </div>
      <div className="stack" style={{ marginTop: "var(--s4)" }}>
        {order.vouchers.map((v) => <VoucherCard key={v.code} v={v} />)}
      </div>
      <div className="row wrap-row" style={{ justifyContent: "center", marginTop: "var(--s3)" }}>
        <Link className="btn btn-primary" href={`/${locale}/account/vouchers`}>{t("nav.myVouchers")}</Link>
        <Link className="btn btn-secondary" href={`/${locale}`}>{t("checkout.keepBrowsing")}</Link>
      </div>
      {cancelUntil && <p className="hint" style={{ textAlign: "center", marginTop: "var(--s2)" }}>{t("checkout.cancelHint", { date: formatDate(cancelUntil, locale) })}</p>}
    </main>
  );
}
