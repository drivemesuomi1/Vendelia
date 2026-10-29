"use client";

import Link from "next/link";
import { Icon } from "@/components/ui/Icon";
import { Notice } from "@/components/ui/Notice";
import { useI18n } from "@/i18n/I18nProvider";
import { useAppData } from "@/lib/meta-context";
import { formatDate, expiryFromToday } from "@/lib/format";
import { CheckoutSteps } from "@/features/checkout/components/CheckoutSteps";
import { useCartQuote } from "../api";
import { useCart } from "../store";
import { CartLines, CartTotals } from "./CartLines";


export function CartView() {
  const { t, locale } = useI18n();
  const { meta } = useAppData();
  const cart = useCart();
  const { quote, error } = useCartQuote(cart.items, cart.ready);
  const expiry = formatDate(expiryFromToday(meta.voucherValidityMonths), locale);

  if (cart.ready && !cart.items.length) {
    return (
      <main className="wrap" style={{ paddingTop: "var(--s4)" }}>
        <h1 style={{ fontSize: "clamp(26px,4vw,34px)" }}>{t("cart.title")}</h1>
        <div className="card empty" style={{ marginTop: "var(--s3)" }}>
          <Icon name="cart" />
          <p style={{ fontWeight: 600, marginTop: 8 }}>{t("cart.empty")}</p>
          <p className="muted" style={{ marginTop: 6 }}>{t("cart.emptyHint")}</p>
          <Link className="btn btn-primary" style={{ marginTop: "var(--s2)" }} href={`/${locale}/deals`}>
            {t("cart.browse")}
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="wrap" style={{ paddingTop: "var(--s4)" }}>
      <h1 style={{ fontSize: "clamp(26px,4vw,34px)", marginBottom: "var(--s2)" }}>{t("cart.title")}</h1>
      <CheckoutSteps current={1} />
      {error && <Notice tone="danger" icon="xc">{t("errors.network")}</Notice>}
      {quote && quote.unavailable.length > 0 && (
        <Notice tone="warn" icon="info" className="mb">
          {t("cart.unavailable")}
        </Notice>
      )}
      {!quote ? (
        <div className="empty"><div className="spin" aria-hidden="true" /></div>
      ) : (
        <div className="checkout">
          <div className="card pad">
            <h2 className="sr-only">{t("cart.items")}</h2>
            <CartLines quote={quote} expiry={expiry} />
            <p className="hint" style={{ marginTop: "var(--s2)" }}>{t("cart.ownCodeEach")}</p>
          </div>
          <aside className="card pad stack" aria-label={t("cart.summary")}>
            <h2 style={{ fontSize: 20 }}>{t("cart.summary")}</h2>
            <CartTotals quote={quote} totalLabel={t("cart.total")} />
            <Link className="btn btn-primary btn-block" href={`/${locale}/checkout`}>
              {t("cart.toCheckout")} <Icon name="right" />
            </Link>
            <Link className="btn btn-ghost btn-block" href={`/${locale}/deals`}>
              {t("cart.continue")}
            </Link>
            <ul className="ticks small">
              <li><Icon name="refund" /><span>{t("cart.refundNote", { days: meta.refundWindowDays })}</span></li>
              <li><Icon name="mail" /><span>{t("cart.emailNote")}</span></li>
            </ul>
          </aside>
        </div>
      )}
    </main>
  );
}
