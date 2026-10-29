"use client";

import type { CheckoutInput, CreateOrderResponse, Locale, OrderDTO } from "@vendelia/shared";
import { api } from "@/lib/api-client";

/** The guest access token is kept for this browser tab so the success page can load the order. */
const tokenKey = (orderId: string) => `vd_order_${orderId}`;

export function rememberOrderToken(orderId: string, token: string) {
  try {
    sessionStorage.setItem(tokenKey(orderId), token);
  } catch {
    /* ignore */
  }
}

export function orderToken(orderId: string): string | undefined {
  try {
    return sessionStorage.getItem(tokenKey(orderId)) ?? undefined;
  } catch {
    return undefined;
  }
}

export const createOrder = (input: CheckoutInput, locale: Locale) => api<CreateOrderResponse>("/api/orders", { body: input, locale });

export const confirmMockPayment = (orderId: string, token: string) =>
  api<{ ok: true }>(`/api/payments/${orderId}/mock-confirm`, { method: "POST", body: {}, headers: { "x-order-token": token } });

export const fetchOrder = (orderId: string) => {
  const token = orderToken(orderId);
  return api<OrderDTO>(`/api/orders/${orderId}`, { headers: token ? { "x-order-token": token } : {} });
};
