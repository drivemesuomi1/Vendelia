"use client";

import type { VoucherDTO } from "@vendelia/shared";
import { api } from "@/lib/api-client";

export const listMyVouchers = () => api<{ vouchers: VoucherDTO[] }>("/api/me/vouchers");

export const cancelVoucher = (code: string) => api<VoucherDTO>("/api/me/vouchers/cancel", { body: { code } });
