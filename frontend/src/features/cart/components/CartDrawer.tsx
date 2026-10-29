"use client";

import Link from "next/link";
import { Dialog } from "@/components/ui/Dialog";
import { Icon } from "@/components/ui/Icon";
import { useI18n } from "@/i18n/I18nProvider";
import { formatMoney } from "@/lib/format";
import { useCartQuote } from "../api";
import { useCart } from "../store";
import { CartLines } from "./CartLines";

/** Slide-in cart opened from the header or after "Add to cart". */
export function CartDrawer() {
  const { t, locale } = useI18n();
  const cart = useCart();
  const { quote } = useCartQuote(cart.items, cart.ready && cart.drawer.open);
  const close = cart.closeDrawer;

  return (
    <Dialog open={cart.drawer.open} onClose={close} className="drawer" labelledBy="drawer-title">
      <div className="drawer-head">
        <h2 id="drawer-title" style={{ fontSize: 20 }}>
          {cart.drawer.justAdded ? (
            <span className="row" style={{ color: "var(--teal)" }}>
              <Icon name="checkc" />
              {t("cart.added")}
            </span>
          ) : (
            t("cart.title")
          )}
        </h2>
        <button className="btn btn-ghost" onClick={close} aria-label={t("cart.close")}>
          <Icon name="x" />
        </button>
      </div>
      <div className="drawer-body">
        {!cart.items.length ? (
          <div className="empty">
            <p style={{ fontWeight: 600 }}>{t("cart.empty")}</p>
          </div>
        ) : quote ? (
          <CartLines quote={quote} compact />
        ) : (
          <div className="empty">
            <div className="spin" aria-hidden="true" />
          </div>
        )}
      </div>
      <div className="drawer-foot">
        {cart.items.length && quote ? (
          <>
            <div className="summary-line total" style={{ border: 0, margin: 0, padding: "0 0 8px" }}>
              <span>
                {t("cart.total")} <span className="muted small" style={{ fontWeight: 400 }}>{t("common.inclVat")}</span>
              </span>
              <span>{formatMoney(quote.totalCents, locale)}</span>
            </div>
            <Link className="btn btn-primary btn-block" href={`/${locale}/checkout`} onClick={close}>
              {t("cart.toCheckout")}
            </Link>
            <Link className="btn btn-secondary btn-block" href={`/${locale}/cart`} onClick={close}>
              {t("cart.viewCart")}
            </Link>
          </>
        ) : (
          <Link className="btn btn-primary btn-block" href={`/${locale}/deals`} onClick={close}>
            {t("cart.browse")}
          </Link>
        )}
      </div>
    </Dialog>
  );
}
