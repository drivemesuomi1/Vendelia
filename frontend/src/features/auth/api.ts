"use client";

import type { LoginInput, RegisterCustomerInput } from "@vendelia/shared";
import { api } from "@/lib/api-client";

export const login = (input: LoginInput) => api("/api/auth/login", { body: input });
export const merchantLogin = (input: LoginInput) => api("/api/auth/merchant/login", { body: input });
export const logout = () => api("/api/auth/logout", { method: "POST", body: {} });
/** Customer sign-up with email and password only. */
export const registerCustomer = (input: Pick<RegisterCustomerInput, "email" | "password">) => api("/api/auth/register", { body: input });
