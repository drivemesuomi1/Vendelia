import type { CartItemInput, LocalizedText } from "@vendelia/shared";
import type { AppContext } from "../../context";
import type { DbOrTx } from "../../db/client";
import { badRequest } from "../../domain/errors";
import { vatIncluded } from "../../domain/vat";
import { dealsRepository } from "../deals/deals.repository";

export interface PricedLine {
  dealId: string;
  optionId: string;
  merchantId: string;
  qty: number;
  unitPriceCents: number;
  totalCents: number;
  vatBps: number;
  title: LocalizedText;
  baseTitle: LocalizedText | null;
  optionLabel: LocalizedText | null;
  merchantName: string;
  slug: string;
  imageUrl: string;
}

export interface PricedCart {
  lines: PricedLine[];
  totalCents: number;
  /** VAT included in the total, grouped by rate (bps → cents). */
  vatByRate: Record<string, number>;
  /** Items that are no longer purchasable (deal paused, option removed). */
  unavailable: CartItemInput[];
}

/**
 * Prices a cart from the database. The browser only sends ids and quantities;
 * prices, VAT and availability always come from here.
 */
export async function priceCart(db: DbOrTx, items: CartItemInput[]): Promise<PricedCart> {
  const rows = await dealsRepository.getOptionsWithDeals(db, [...new Set(items.map((i) => i.optionId))]);
  const byOption = new Map(rows.map((r) => [r.option.id, r]));
  const lines: PricedLine[] = [];
  const unavailable: CartItemInput[] = [];

  for (const item of items) {
    const r = byOption.get(item.optionId);
    if (!r || r.deal.id !== item.dealId || r.deal.status !== "live" || r.merchant.status !== "active") {
      unavailable.push(item);
      continue;
    }
    const existing = lines.find((l) => l.optionId === item.optionId);
    if (existing) {
      existing.qty += item.qty;
      existing.totalCents = existing.qty * existing.unitPriceCents;
      continue;
    }
    lines.push({
      dealId: r.deal.id,
      optionId: r.option.id,
      merchantId: r.deal.merchantId,
      qty: item.qty,
      unitPriceCents: r.option.priceCents,
      totalCents: r.option.priceCents * item.qty,
      vatBps: r.deal.vatBps,
      title: r.deal.title,
      baseTitle: r.deal.baseTitle,
      optionLabel: r.option.label,
      merchantName: r.merchant.name,
      slug: r.deal.slug,
      imageUrl: r.deal.imageUrl,
    });
  }

  const vatByRate: Record<string, number> = {};
  for (const l of lines) vatByRate[l.vatBps] = (vatByRate[l.vatBps] ?? 0) + vatIncluded(l.totalCents, l.vatBps);
  return { lines, totalCents: lines.reduce((a, l) => a + l.totalCents, 0), vatByRate, unavailable };
}

export const cartService = {
  quote: (ctx: AppContext, items: CartItemInput[]) => priceCart(ctx.db, items),

  async requirePurchasable(db: DbOrTx, items: CartItemInput[]) {
    const priced = await priceCart(db, items);
    if (priced.unavailable.length) throw badRequest("items_unavailable", "Some items are no longer available");
    if (!priced.lines.length) throw badRequest("cart_empty");
    return priced;
  },
};
