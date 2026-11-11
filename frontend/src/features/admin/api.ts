"use client";

import type { AdminMerchantCreateInput, AdminMerchantDTO, AdminVoucherDTO, DealInput, Locale, MerchantStatus } from "@vendelia/shared";
import { api } from "@/lib/api-client";

/** Admin edit of any business's deal; the deal keeps its status. */
export const adminUpdateDeal = (id: string, input: DealInput) => api<{ id: string; slug: string; status: string }>(`/api/admin/deals/${id}`, { method: "PUT", body: input });
export const reviewDeal = (id: string, decision: "approve" | "reject", note?: string) => api(`/api/admin/deals/${id}/review`, { body: { decision, note } });
export const setMerchantStatus = (id: string, status: MerchantStatus) => api<{ merchant: AdminMerchantDTO }>(`/api/admin/merchants/${id}/status`, { body: { status } });
export const setCommission = (rateBps: number) => api<{ rateBps: number }>("/api/admin/settings/commission", { method: "PUT", body: { rateBps } });
export const supportRefund = (code: string) => api<{ voucher: AdminVoucherDTO }>("/api/admin/refunds", { body: { code } });
export const runJob = (name: string) => api<{ job: string; result: unknown }>(`/api/admin/jobs/${name}/run`, { method: "POST", body: {} });

export const createMerchant = (input: AdminMerchantCreateInput, locale?: Locale) =>
  api<{ merchant: AdminMerchantDTO; login?: { email: string; passwordSet: boolean; emailed?: boolean } }>("/api/admin/merchants", { body: input, locale });
