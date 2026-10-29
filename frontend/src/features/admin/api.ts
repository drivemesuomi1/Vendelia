"use client";

import { api } from "@/lib/api-client";

export const reviewDeal = (id: string, decision: "approve" | "reject", note?: string) => api(`/api/admin/deals/${id}/review`, { body: { decision, note } });
export const setMerchantStatus = (id: string, status: "active" | "suspended") => api(`/api/admin/merchants/${id}/status`, { body: { status } });
export const setCommission = (rateBps: number) => api<{ rateBps: number }>("/api/admin/settings/commission", { method: "PUT", body: { rateBps } });
export const supportRefund = (code: string) => api("/api/admin/refunds", { body: { code } });
export const runJob = (name: string) => api<{ job: string; result: unknown }>(`/api/admin/jobs/${name}/run`, { method: "POST", body: {} });
