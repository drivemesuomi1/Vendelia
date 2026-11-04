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
  /** The option's own name, e.g. "3 h"; shown on its tile. */
  label: localizedTextSchema.nullable().default(null),
  /** Section heading, e.g. "Home cleaning". Consecutive options with the same section form one tab. */
  group: localizedTextSchema.nullable().default(null),
  priceCents: centsSchema.min(100, { message: "priceTooLow" }),
  /** Regular price actually charged recently, shown struck through. Must be above the deal price. */
  referencePriceCents: centsSchema.nullable().default(null),
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
  /** Cover photo, shown first and on cards. */
  imageUrl: z.string().trim().min(1, { message: "required" }),
  /** Further photos after the cover, in display order. Site paths only (uploads or bundled images), never other sites. */
  galleryUrls: z.array(z.string().trim().regex(/^\/(?!\/)/, { message: "required" })).max(7, { message: "tooManyPhotos" }).default([]),
  options: z.array(dealOptionInputSchema).min(1).max(12),
}).superRefine((deal, ctx) => {
  const sectioned = deal.options.some((option) => option.group);
  deal.options.forEach((option, i) => {
    // With sections, every option belongs to one and needs a name for its tile.
    if (sectioned && !option.group) ctx.addIssue({ code: "custom", path: ["options", i, "group", "fi"], message: "required" });
    if (sectioned && !option.label) ctx.addIssue({ code: "custom", path: ["options", i, "label", "fi"], message: "required" });
    if (option.referencePriceCents !== null && option.referencePriceCents <= option.priceCents) {
      ctx.addIssue({ code: "custom", path: ["options", i, "referencePriceCents"], message: "referenceTooLow" });
    }
  });
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
