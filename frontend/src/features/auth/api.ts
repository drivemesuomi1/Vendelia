"use client";

import type { LoginInput, RegisterCustomerInput, RegisterMerchantInput } from "@vendelia/shared";
import { api } from "@/lib/api-client";

export const login = (input: LoginInput) => api("/api/auth/login", { body: input });
export const logout = () => api("/api/auth/logout", { method: "POST", body: {} });
export const registerCustomer = (input: RegisterCustomerInput) => api("/api/auth/register", { body: input });
export const registerMerchant = (input: RegisterMerchantInput) => api("/api/merchants/register", { body: input });
export const lookupCompany = (businessId: string) =>
  api<{ company: { businessId: string; name: string } | null }>(`/api/merchants/lookup/${encodeURIComponent(businessId)}`);
