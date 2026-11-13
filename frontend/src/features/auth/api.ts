"use client";

import type { LoginInput, RegisterCustomerInput } from "@vendelia/shared";
import { api } from "@/lib/api-client";

export const login = (input: LoginInput) => api("/api/auth/login", { body: input });
export const merchantLogin = (input: LoginInput) => api("/api/auth/merchant/login", { body: input });
export const logout = () => api("/api/auth/logout", { method: "POST", body: {} });
/** Emails a password reset link if the address has an account; the answer never says whether it does. */
export const forgotPassword = (email: string, locale: string) => api("/api/auth/forgot", { body: { email }, locale });
/** Sets a new password from the emailed link. Returns the account's role so the page can point to the right sign-in. */
export const resetPassword = (input: { id: string; token: string; password: string }) =>
  api<{ ok: true; role: "customer" | "merchant" | "admin" }>("/api/auth/reset", { body: input });
/** Customer sign-up with email and password only. */
export const registerCustomer = (input: Pick<RegisterCustomerInput, "email" | "password">) => api("/api/auth/register", { body: input });
