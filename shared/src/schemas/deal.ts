import { z } from "zod";
import { centsSchema, localizedListSchema, localizedTextSchema, vatBpsSchema } from "./common";

export const dealQuerySchema = z.object({
  city: z.string().trim().optional(),
  category: z.string().trim().optional(),
  q: z.string().trim().max(100).optional(),
  featured: z.union([z.boolean(), z.enum(["true", "false"]).transform((value) => value === "true")]).optional(),
});
export type DealQuery = z.infer<typeof dealQuerySchema>;

export const dealOptionInputSchema = z.object({
  /** Present when editing an existing option. */
  id: z.string().uuid().optional(),
  label: localizedTextSchema.nullable().default(null),
  priceCents: centsSchema.min(100, { message: "priceTooLow" }),
});

/** What a merchant submits when creating or editing a deal. */
export const dealInputSchema = z.object({
  title: localizedTextSchema,
  description: localizedTextSchema,
  restrictions: localizedTextSchema,
  inclusions: localizedListSchema,
  terms: localizedListSchema,
  howTo: localizedListSchema,
  categoryId: z.string().min(1, { message: "required" }),
  cityId: z.string().min(1, { message: "required" }),
  area: z.string().trim().default(""),
  street: z.string().trim().min(1, { message: "required" }),
  zip: z.string().trim().regex(/^\d{5}$/, { message: "invalidZip" }),
  vatBps: vatBpsSchema,
  referencePriceCents: centsSchema.nullable().default(null),
  imageUrl: z.string().trim().min(1, { message: "required" }),
  options: z.array(dealOptionInputSchema).min(1).max(6),
});
export type DealInput = z.infer<typeof dealInputSchema>;

export const commissionPreviewSchema = z.object({
  priceCents: centsSchema,
  vatBps: vatBpsSchema,
});
export type CommissionPreviewInput = z.infer<typeof commissionPreviewSchema>;

export const dealReviewSchema = z.object({
  decision: z.enum(["approve", "reject"]),
  note: z.string().trim().max(500).optional(),
});
