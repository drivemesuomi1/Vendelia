"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { MAX_QTY_PER_ITEM, type CartItemInput } from "@vendelia/shared";

const STORAGE_KEY = "vd_cart";

interface CartValue {
  items: CartItemInput[];
  count: number;
  add: (item: CartItemInput) => void;
  setQty: (optionId: string, qty: number) => void;
  remove: (optionId: string) => void;
  clear: () => void;
  /** Side drawer state; `justAdded` shows the "added to cart" header. */
  drawer: { open: boolean; justAdded: boolean };
  openDrawer: (justAdded?: boolean) => void;
  closeDrawer: () => void;
  ready: boolean;
}

const CartContext = createContext<CartValue | null>(null);

/**
 * The cart only stores ids and quantities in the browser.
 * Prices are always fetched from the API (/api/cart/quote) so they cannot be tampered with.
 */
export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItemInput[]>([]);
  const [ready, setReady] = useState(false);
  const [drawer, setDrawer] = useState({ open: false, justAdded: false });

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setItems(JSON.parse(raw) as CartItemInput[]);
    } catch {
      /* storage blocked or corrupt: start empty */
    }
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    } catch {
      /* ignore */
    }
  }, [items, ready]);

  const add = useCallback((item: CartItemInput) => {
    setItems((prev) => {
      const existing = prev.find((i) => i.optionId === item.optionId);
      if (existing) return prev.map((i) => (i.optionId === item.optionId ? { ...i, qty: Math.min(MAX_QTY_PER_ITEM, i.qty + item.qty) } : i));
      return [...prev, { ...item, qty: Math.min(MAX_QTY_PER_ITEM, item.qty) }];
    });
    setDrawer({ open: true, justAdded: true });
  }, []);

  const value = useMemo<CartValue>(
    () => ({
      items,
      count: items.reduce((a, i) => a + i.qty, 0),
      add,
      setQty: (optionId, qty) => setItems((prev) => prev.map((i) => (i.optionId === optionId ? { ...i, qty: Math.max(1, Math.min(MAX_QTY_PER_ITEM, qty)) } : i))),
      remove: (optionId) => setItems((prev) => prev.filter((i) => i.optionId !== optionId)),
      clear: () => setItems([]),
      drawer,
      openDrawer: (justAdded = false) => setDrawer({ open: true, justAdded }),
      closeDrawer: () => setDrawer({ open: false, justAdded: false }),
      ready,
    }),
    [items, add, drawer, ready],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart(): CartValue {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used inside <CartProvider>");
  return ctx;
}
