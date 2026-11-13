import { z } from "zod";
import { businessIdSchema } from "./common";

const email = z.string().trim().toLowerCase().email({ message: "invalidEmail" });
const password = z.string().min(8, { message: "passwordTooShort" }).max(200);

export const loginSchema = z.object({
  email,
  password: z.string().min(1, { message: "required" }).max(200),
  /** Customer sign-in: true keeps the session for 30 days, false ends it when the browser closes. */
  remember: z.boolean().optional(),
});

export const forgotPasswordSchema = z.object({ email });
/** The 6-digit code emailed at sign-up. */
export const verifySignupSchema = z.object({ email, code: z.string().regex(/^\d{6}$/, { message: "codeInvalid" }) });
export const resetPasswordSchema = z.object({
  id: z.string().uuid(),
  token: z.string().regex(/^[a-f0-9]{64}$/),
  password,
});
export type LoginInput = z.infer<typeof loginSchema>;

export const registerCustomerSchema = z.object({
  name: z.string().trim().min(1, { message: "required" }).max(100),
  email,
  password,
});
export type RegisterCustomerInput = z.infer<typeof registerCustomerSchema>;

export const registerMerchantSchema = z.object({
  businessId: businessIdSchema,
  companyName: z.string().trim().min(1, { message: "required" }).max(150),
  displayName: z.string().trim().min(1, { message: "required" }).max(80),
  contactName: z.string().trim().min(1, { message: "required" }).max(100),
  email,
  password,
  phone: z.string().trim().min(5, { message: "required" }).max(30),
  street: z.string().trim().min(1, { message: "required" }),
  zip: z.string().trim().regex(/^\d{5}$/, { message: "invalidZip" }),
  cityId: z.string().min(1, { message: "required" }),
});
export type RegisterMerchantInput = z.infer<typeof registerMerchantSchema>;

export const ROLES = ["customer", "merchant", "admin"] as const;
export type Role = (typeof ROLES)[number];
