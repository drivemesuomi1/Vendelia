"use client";

import { useEffect, useState } from "react";
import type { CartItemInput, CartQuoteDTO } from "@vendelia/shared";
import { api } from "@/lib/api-client";
import { isPartnerItem, partnerQuote } from "@/features/deals/catalogue";

/** Partner deals are priced in the browser; everything else by the API, then merged. */
export async function quoteCart(items: CartItemInput[]): Promise<CartQuoteDTO> {
  const local = partnerQuote(items.filter(isPartnerItem));
  const rest = items.filter((i) => !isPartnerItem(i));
  if (!rest.length) return local;
  const remote = await api<CartQuoteDTO>("/api/cart/quote", { body: { items: rest } });
  const vatByRate = { ...remote.vatByRate };
  for (const [rate, cents] of Object.entries(local.vatByRate)) vatByRate[rate] = (vatByRate[rate] ?? 0) + cents;
  return {
    lines: [...remote.lines, ...local.lines],
    totalCents: remote.totalCents + local.totalCents,
    vatByRate,
    unavailable: [...remote.unavailable, ...local.unavailable],
  };
}

/** Live server-side pricing for the current cart contents. */
export function useCartQuote(items: CartItemInput[], ready: boolean) {
  const [quote, setQuote] = useState<CartQuoteDTO | null>(null);
  const [error, setError] = useState(false);
  const key = JSON.stringify(items);
  useEffect(() => {
    if (!ready) return;
    if (!items.length) {
      setQuote({ lines: [], totalCents: 0, vatByRate: {}, unavailable: [] });
      return;
    }
    let cancelled = false;
    quoteCart(items)
      .then((q) => !cancelled && (setQuote(q), setError(false)))
      .catch(() => !cancelled && setError(true));
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, ready]);
  return { quote, error };
}
