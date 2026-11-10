"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { MAX_QTY_PER_ITEM, type CartItemInput } from "@vendelia/shared";
import { useI18n } from "@/i18n/I18nProvider";
import { useAppData } from "@/lib/meta-context";

const STORAGE_KEY = "vd_cart";
/** An item chosen while signed out, added once the visitor has signed in or registered. */
const PENDING_KEY = "vd_cart_pending";

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
 * Adding needs a signed-in account: a signed-out visitor is sent to sign-in, and the chosen item is added
 * as soon as they come back signed in.
 */
export function CartProvider({ children }: { children: ReactNode }) {
  const { user } = useAppData();
  const { locale } = useI18n();
  const router = useRouter();
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

  const put = useCallback((item: CartItemInput) => {
    setItems((prev) => {
      const existing = prev.find((i) => i.optionId === item.optionId);
      if (existing) return prev.map((i) => (i.optionId === item.optionId ? { ...i, qty: Math.min(MAX_QTY_PER_ITEM, i.qty + item.qty) } : i));
      return [...prev, { ...item, qty: Math.min(MAX_QTY_PER_ITEM, item.qty) }];
    });
    setDrawer({ open: true, justAdded: true });
  }, []);

  const add = useCallback((item: CartItemInput) => {
    if (user) return put(item);
    try { sessionStorage.setItem(PENDING_KEY, JSON.stringify(item)); } catch { /* storage off: they choose again after signing in */ }
    const here = `${window.location.pathname}${window.location.search}`;
    router.push(`/${locale}/login?next=${encodeURIComponent(here)}&reason=cart`);
  }, [user, put, router, locale]);

  // Back from sign-in or registration: add what was chosen before.
  useEffect(() => {
    if (!user || !ready) return;
    try {
      const raw = sessionStorage.getItem(PENDING_KEY);
      if (!raw) return;
      sessionStorage.removeItem(PENDING_KEY);
      put(JSON.parse(raw) as CartItemInput);
    } catch { /* ignore a corrupt pending item */ }
  }, [user, ready, put]);

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
