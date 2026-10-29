"use client";

import type { DealInput, RedeemLookupDTO, SplitDTO } from "@vendelia/shared";
import { api } from "@/lib/api-client";

export const createDeal = (input: DealInput) => api<{ id: string; slug: string; status: string }>("/api/merchant/deals", { body: input });
export const updateDeal = (id: string, input: DealInput) => api<{ id: string; status: string }>(`/api/merchant/deals/${id}`, { method: "PUT", body: input });
export const previewCommission = (priceCents: number, vatBps: number) =>
  api<{ commissionBps: number; split: SplitDTO }>("/api/merchant/commission-preview", { body: { priceCents, vatBps } });

export async function uploadImage(file: File) {
  const fd = new FormData();
  fd.append("file", file);
  return api<{ url: string }>("/api/merchant/uploads", { method: "POST", body: fd });
}

export const lookupVoucher = (code: string) => api<RedeemLookupDTO>("/api/merchant/vouchers/lookup", { body: { code } });
export const redeemVoucher = (code: string) => api<RedeemLookupDTO>("/api/merchant/vouchers/redeem", { body: { code } });
