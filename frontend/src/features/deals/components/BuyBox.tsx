"use client";

import { useState } from "react";
import type { DealDetailDTO } from "@vendelia/shared";
import { Icon } from "@/components/ui/Icon";
import { QtyStepper } from "@/components/ui/QtyStepper";
import { useI18n } from "@/i18n/I18nProvider";
import { discountPct, formatMoney, formatPct, loc } from "@/lib/format";
import { useCart } from "@/features/cart/store";

/** Option picker, quantity and "Add to cart" (desktop sidebar + sticky mobile bar). */
export function BuyBox({ deal, expiry }: { deal: DealDetailDTO; expiry: string }) {
  const { t, locale } = useI18n();
  const cart = useCart();
  const [optionId, setOptionId] = useState(deal.options[0]!.id);
  const [qty, setQty] = useState(1);
  const option = deal.options.find((o) => o.id === optionId)!;
  const off = discountPct(option.priceCents, deal.referencePriceCents);
  const add = () => cart.add({ dealId: deal.id, optionId, qty });

  return (
    <>
      <aside className="buybox card pad stack" aria-label={t("deal.buy")}>
        {deal.options.length > 1 && (
          <fieldset className="stack">
            <legend className="label" style={{ marginBottom: 8 }}>{t("deal.chooseOption")}</legend>
            {deal.options.map((o) => (
              <label className="opt" key={o.id}>
                <input type="radio" name="opt" checked={o.id === optionId} onChange={() => setOptionId(o.id)} />
                {loc(o.label, locale)}
                <span className="p">{formatMoney(o.priceCents, locale)}</span>
              </label>
            ))}
          </fieldset>
        )}
        <div className="row" style={{ alignItems: "baseline", gap: 12, flexWrap: "wrap" }}>
          <span className="price" style={{ fontSize: 32 }}>{formatMoney(option.priceCents, locale)}</span>
          {off !== null && (
            <>
              <span className="ref" style={{ fontSize: 16 }}><span className="sr-only">{t("deal.referencePrice")} </span>{formatMoney(deal.referencePriceCents!, locale)}</span>
              <span className="chip teal">−{off} %</span>
            </>
          )}
        </div>
        {off !== null && <p className="hint">{t("deal.referenceNote", { price: formatMoney(deal.referencePriceCents!, locale) })}</p>}
        <p className="muted small">{t("deal.finalPrice", { vat: formatPct(deal.vatBps, locale) })}</p>
        <div className="row between">
          <span className="label">{t("deal.quantity")}</span>
          <QtyStepper value={qty} onChange={setQty} label={t("deal.quantity")} decLabel={t("common.decrease")} incLabel={t("common.increase")} />
        </div>
        <button className="btn btn-primary btn-block" onClick={add}><Icon name="cart" />{t("deal.addToCart")}</button>
        <ul className="ticks small">
          <li><Icon name="cal" /><span>{t("deal.validUntil", { date: expiry })}</span></li>
          <li><Icon name="refund" /><span>{t("deal.refundTick")}</span></li>
          <li><Icon name="gift" /><span>{t("deal.giftTick")}</span></li>
          <li><Icon name="lock" /><span>{t("deal.secureTick")}</span></li>
        </ul>
      </aside>
      <div className="mobile-buy">
        <div>
          <span className="price">{formatMoney(option.priceCents, locale)}</span>
          <p className="hint">{t("common.inclVat")}</p>
        </div>
        <button className="btn btn-primary" onClick={add}><Icon name="cart" />{t("deal.addToCart")}</button>
      </div>
    </>
  );
}

