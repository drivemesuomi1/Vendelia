import { z } from "zod";

export const LOCALES = ["fi", "sv", "en"] as const;
export type Locale = (typeof LOCALES)[number];
export const DEFAULT_LOCALE: Locale = "fi";
export const localeSchema = z.enum(LOCALES);

/** Allowed Finnish VAT rates in basis points (2550 = 25.5 %). */
export const VAT_RATES_BPS = [2550, 1350, 1000] as const;
export const vatBpsSchema = z
  .number()
  .int()
  .refine((v) => (VAT_RATES_BPS as readonly number[]).includes(v), { message: "invalidVatRate" });

/** Money is always integer cents. */
export const centsSchema = z.number().int({ message: "invalidAmount" }).nonnegative({ message: "invalidAmount" });

/** Text in Finnish (required) plus optional Swedish and English. Empty sv/en fall back to Finnish. */
export const localizedTextSchema = z.object({
  fi: z.string().trim().min(1, { message: "required" }),
  sv: z.string().trim().default(""),
  en: z.string().trim().default(""),
});
export type LocalizedText = z.infer<typeof localizedTextSchema>;

export const localizedListSchema = z.object({
  fi: z.array(z.string().trim().min(1)).min(1, { message: "required" }),
  sv: z.array(z.string().trim().min(1)).default([]),
  en: z.array(z.string().trim().min(1)).default([]),
});
export type LocalizedList = z.infer<typeof localizedListSchema>;

export const uuidSchema = z.string().uuid({ message: "invalidId" });

export const VOUCHER_CODE_RE = /^VND-[A-Z2-9]{4}-[A-Z2-9]{4}$/;
export const voucherCodeSchema = z
  .string()
  .trim()
  .toUpperCase()
  .regex(VOUCHER_CODE_RE, { message: "invalidVoucherCode" });

/** Finnish business ID (Y-tunnus), e.g. 1234567-8. */
export const businessIdSchema = z.string().trim().regex(/^\d{7}-\d$/, { message: "invalidBusinessId" });
