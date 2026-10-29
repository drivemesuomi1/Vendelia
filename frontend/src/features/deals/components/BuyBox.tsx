"use client";

import { useEffect, useRef, useState } from "react";
import type { DealDetailDTO, DealOptionDTO } from "@vendelia/shared";
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
  // On phones the bottom bar duplicates the box's own button, so hide it while that button is on screen.
  const addRef = useRef<HTMLButtonElement>(null);
  const [addVisible, setAddVisible] = useState(false);
  useEffect(() => {
    const el = addRef.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => setAddVisible(e!.isIntersecting));
    io.observe(el);
    return () => io.disconnect();
  }, []);
  const option = deal.options.find((o) => o.id === optionId)!;
  const refOf = (o: DealOptionDTO) => (o.referencePriceCents !== undefined ? o.referencePriceCents : deal.referencePriceCents);
  const ref = refOf(option);
  const off = discountPct(option.priceCents, ref);
  const total = option.priceCents * qty;
  const add = () => cart.add({ dealId: deal.id, optionId, qty });
  // Consecutive options with the same group heading form one tab.
  const groups: { label: DealOptionDTO["group"]; options: DealOptionDTO[] }[] = [];
  for (const o of deal.options) {
    const last = groups[groups.length - 1];
    if (last && loc(last.label, "fi") === loc(o.group, "fi")) last.options.push(o);
    else groups.push({ label: o.group ?? null, options: [o] });
  }
  const tiles = deal.options.every((o) => o.shortLabel);
  const activeGroup = groups.find((g) => g.options.includes(option))!;
  // Keep tiles in a group the same height: reserve the struck-price line only if some option has one.
  const groupHasRef = activeGroup.options.some((o) => { const r = refOf(o); return !!r && r > o.priceCents; });

  return (
    <>
      <aside className="buybox card pad stack" aria-label={t("deal.buy")}>
        {deal.options.length > 1 && tiles && (
          <div className="stack" style={{ gap: 0 }}>
            <p className="label" style={{ marginBottom: 12 }}>{t("deal.chooseOption")}</p>
            {groups.length > 1 && (
              <div className="seg" role="group" aria-label={t("deal.chooseOption")}>
                {groups.map((g, k) => (
                  <button key={k} type="button" aria-pressed={g === activeGroup} onClick={() => g !== activeGroup && setOptionId(g.options[0]!.id)}>
                    {loc(g.label, locale)}
                  </button>
                ))}
              </div>
            )}
            <fieldset className="tiles">
              <legend className="sr-only">{loc(activeGroup.label, locale) || t("deal.chooseOption")}</legend>
              {activeGroup.options.map((o) => {
                const r = refOf(o);
                return (
                  <label className="tile" key={o.id}>
                    <input className="sr-only" type="radio" name="opt" checked={o.id === optionId} onChange={() => setOptionId(o.id)} />
                    <span className="tile-name">{loc(o.shortLabel, locale)}</span>
                    <span className="tile-price">{formatMoney(o.priceCents, locale)}</span>
                    {groupHasRef && (r && r > o.priceCents ? <s className="tile-ref">{formatMoney(r, locale)}</s> : <span className="tile-ref" aria-hidden="true">&nbsp;</span>)}
                  </label>
                );
              })}
            </fieldset>
          </div>
        )}
        {deal.options.length > 1 && !tiles && (
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
        {tiles && <p className="picked">{loc(option.label, locale)}</p>}
        <div className="row" style={{ alignItems: "baseline", gap: 12, flexWrap: "wrap" }}>
          <span className="price" style={{ fontSize: 32 }} aria-live="polite">{formatMoney(total, locale)}</span>
          {off !== null && (
            <>
              <span className="ref" style={{ fontSize: 16 }}><span className="sr-only">{t("deal.referencePrice")} </span>{formatMoney(ref! * qty, locale)}</span>
              <span className="chip teal">−{off} %</span>
            </>
          )}
        </div>        {off !== null && <p className="hint">{t("deal.referenceNote", { price: formatMoney(ref!, locale) })}</p>}
        <p className="muted small">{t("deal.finalPrice", { vat: formatPct(deal.vatBps, locale) })}</p>
        <div className="row between">
          <span className="label">{t("deal.quantity")}</span>
          <QtyStepper value={qty} onChange={setQty} label={t("deal.quantity")} decLabel={t("common.decrease")} incLabel={t("common.increase")} />
        </div>
        <button ref={addRef} className="btn btn-primary btn-block" onClick={add}><Icon name="cart" />{t("deal.addToCart")}</button>
        <ul className="ticks small">
          <li><Icon name="cal" /><span>{t("deal.validUntil", { date: expiry })}</span></li>
          <li><Icon name="refund" /><span>{t("deal.refundTick")}</span></li>
          <li><Icon name="gift" /><span>{t("deal.giftTick")}</span></li>
          <li><Icon name="lock" /><span>{t("deal.secureTick")}</span></li>
        </ul>
      </aside>
      <div className={`mobile-buy ${addVisible ? "away" : ""}`} aria-hidden={addVisible || undefined} inert={addVisible || undefined}>
        <div>
          <span className="price">{formatMoney(total, locale)}</span>
          <p className="hint">{t("common.inclVat")}</p>
        </div>
        <button className="btn btn-primary" onClick={add}><Icon name="cart" />{t("deal.addToCart")}</button>
      </div>
    </>
  );
}

