import { z } from "zod";
import { businessIdSchema } from "./common";

const email = z.string().trim().toLowerCase().email({ message: "invalidEmail" });
const password = z.string().min(8, { message: "passwordTooShort" }).max(200);

export const loginSchema = z.object({
  email,
  password: z.string().min(1, { message: "required" }).max(200),
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
