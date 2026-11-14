"use client";

import type { VoucherDTO } from "@vendelia/shared";
import { api } from "@/lib/api-client";

export const listMyVouchers = () => api<{ vouchers: VoucherDTO[] }>("/api/me/vouchers");

/** Customers can only request a refund; an admin approves it. */
export const requestRefund = (code: string, reason: string) => api<VoucherDTO>("/api/me/vouchers/refund-request", { body: { code, reason } });
