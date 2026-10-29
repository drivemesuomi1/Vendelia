"use client";

import { useEffect, useState } from "react";
import type { CartItemInput, CartQuoteDTO } from "@vendelia/shared";
import { api } from "@/lib/api-client";

export const quoteCart = (items: CartItemInput[]) => api<CartQuoteDTO>("/api/cart/quote", { body: { items } });

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
