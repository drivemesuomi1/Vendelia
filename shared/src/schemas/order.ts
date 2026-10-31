import { z } from "zod";
import { uuidSchema } from "./common";

export const MAX_QTY_PER_ITEM = 10;

export const cartItemSchema = z.object({
  dealId: uuidSchema,
  optionId: uuidSchema,
  qty: z.number().int().min(1).max(MAX_QTY_PER_ITEM),
});
export type CartItemInput = z.infer<typeof cartItemSchema>;

export const cartQuoteSchema = z.object({
  items: z.array(cartItemSchema).max(20).superRefine((items, ctx) => {
    const seen = new Set<string>();
    items.forEach((item, index) => {
      if (seen.has(item.optionId)) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: [index, "optionId"], message: "duplicateOption" });
      }
      seen.add(item.optionId);
    });
  }),
});

export const PAYMENT_METHODS = ["bank", "mobilepay", "card"] as const;
/**
 * Temporary: "test" skips payment and issues test/unpaid vouchers. The API accepts it only
 * while PAYMENT_BYPASS is enabled; remove it once a payment provider is integrated.
 */
export const TEST_PAYMENT_METHOD = "test" as const;
export type PaymentMethod = (typeof PAYMENT_METHODS)[number] | typeof TEST_PAYMENT_METHOD;

export const BANKS = [
  "OP",
  "Nordea",
  "Danske Bank",
  "S-Pankki",
  "Aktia",
  "POP Pankki",
  "Säästöpankki",
  "Oma Säästöpankki",
  "Handelsbanken",
  "Ålandsbanken",
] as const;

const contactSchema = z.object({
  email: z.string().trim().email({ message: "invalidEmail" }),
  firstName: z.string().trim().min(1, { message: "required" }),
  lastName: z.string().trim().min(1, { message: "required" }),
  phone: z.string().trim().max(30).optional().default(""),
});

// Refinements live on the sub-objects so every field error is reported in one response.
const giftSchema = z
  .object({
    enabled: z.boolean(),
    recipientName: z.string().trim().max(80).optional().default(""),
    message: z.string().trim().max(200).optional().default(""),
  })
  .superRefine((g, ctx) => {
    if (g.enabled && !g.recipientName) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["recipientName"], message: "required" });
  });

const paymentSchema = z
  .object({
    method: z.enum([...PAYMENT_METHODS, TEST_PAYMENT_METHOD]),
    bank: z.string().optional(),
  })
  .superRefine((p, ctx) => {
    if (p.method === "bank" && !(BANKS as readonly string[]).includes(p.bank ?? "")) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["bank"], message: "chooseBank" });
    }
  });

export const checkoutSchema = z.object({
  items: z.array(cartItemSchema).min(1, { message: "cartEmpty" }).max(20),
  contact: contactSchema,
  gift: giftSchema,
  payment: paymentSchema,
  acceptTerms: z.literal(true, { errorMap: () => ({ message: "acceptTerms" }) }),
  newsletter: z.boolean().default(false),
});
export type CheckoutInput = z.infer<typeof checkoutSchema>;
