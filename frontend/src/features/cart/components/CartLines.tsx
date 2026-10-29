"use client";

import Link from "next/link";
import type { CartQuoteDTO } from "@vendelia/shared";
import { Icon } from "@/components/ui/Icon";
import { QtyStepper } from "@/components/ui/QtyStepper";
import { useI18n } from "@/i18n/I18nProvider";
import { formatMoney, formatPct, itemTitle } from "@/lib/format";
import { useCart } from "../store";

/** Line items with quantity controls (used in the cart page and the drawer). */
export function CartLines({ quote, compact, expiry }: { quote: CartQuoteDTO; compact?: boolean; expiry?: string }) {
  const { t, locale } = useI18n();
  const cart = useCart();
  return (
    <>
      {quote.lines.map((l) => {
        const title = itemTitle(l.title, l.baseTitle, l.optionLabel, locale);
        return (
          <div className="line" key={l.optionId}>
            <div className="thumb">
              <img src={l.imageUrl} alt="" loading="lazy" />
            </div>
            <div>
              <h3>{compact ? title : <Link href={`/${locale}/deals/${l.slug}`}>{title}</Link>}</h3>
              <p className="muted small">
                {l.merchantName} · {t("cart.each", { price: formatMoney(l.unitPriceCents, locale) })}
              </p>
              {!compact && expiry && <p className="hint">{t("cart.validUntilVat", { date: expiry, vat: formatPct(l.vatBps, locale) })}</p>}
              <div className="ctrl">
                <QtyStepper
                  value={l.qty}
                  onChange={(q) => cart.setQty(l.optionId, q)}
                  label={t("cart.qtyFor", { item: title })}
                  decLabel={t("common.decrease")}
                  incLabel={t("common.increase")}
                />
                <span className="lt">{formatMoney(l.totalCents, locale)}</span>
                <button className="btn btn-ghost btn-sm" onClick={() => cart.remove(l.optionId)} aria-label={t("cart.removeItem", { item: title })}>
                  <Icon name="trash" />
                  {!compact && t("cart.remove")}
                </button>
              </div>
            </div>
          </div>
        );
      })}
    </>
  );
}

/** Subtotal, VAT per rate, service fee and total. */
export function CartTotals({ quote, totalLabel }: { quote: CartQuoteDTO; totalLabel: string }) {
  const { t, locale } = useI18n();
  const count = quote.lines.reduce((a, l) => a + l.qty, 0);
  return (
    <div>
      <div className="summary-line">
        <span>{t("cart.itemsCount", { n: count })}</span>
        <span>{formatMoney(quote.totalCents, locale)}</span>
      </div>
      {Object.entries(quote.vatByRate)
        .sort(([a], [b]) => Number(b) - Number(a))
        .map(([rate, cents]) => (
          <div className="summary-line muted" key={rate}>
            <span>{t("cart.includesVat", { rate: formatPct(Number(rate), locale) })}</span>
            <span>{formatMoney(cents, locale)}</span>
          </div>
        ))}
      <div className="summary-line">
        <span>{t("cart.serviceFee")}</span>
        <span>{formatMoney(0, locale)}</span>
      </div>
      <div className="summary-line total">
        <span>{totalLabel}</span>
        <span>{formatMoney(quote.totalCents, locale)}</span>
      </div>
    </div>
  );
}
