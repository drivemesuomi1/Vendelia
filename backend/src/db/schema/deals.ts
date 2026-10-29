import { boolean, index, integer, jsonb, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import type { DealStatus, LocalizedList, LocalizedText } from "@vendelia/shared";
import { merchants } from "./merchants";
import { categories, cities } from "./reference";

export const deals = pgTable(
  "deals",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    slug: text("slug").notNull().unique(),
    merchantId: uuid("merchant_id")
      .notNull()
      .references(() => merchants.id),
    categoryId: text("category_id")
      .notNull()
      .references(() => categories.id),
    cityId: text("city_id")
      .notNull()
      .references(() => cities.id),
    area: jsonb("area").$type<LocalizedText>().notNull(),
    street: text("street").notNull(),
    zip: text("zip").notNull(),
    meetingPoint: boolean("meeting_point").notNull().default(false),
    title: jsonb("title").$type<LocalizedText>().notNull(),
    /** Short title used when an option label is appended ("Hot stone massage – 90 min"). */
    baseTitle: jsonb("base_title").$type<LocalizedText>(),
    description: jsonb("description").$type<LocalizedText>().notNull(),
    restrictions: jsonb("restrictions").$type<LocalizedText>().notNull(),
    inclusions: jsonb("inclusions").$type<LocalizedList>().notNull(),
    terms: jsonb("terms").$type<LocalizedList>().notNull(),
    howTo: jsonb("how_to").$type<LocalizedList>().notNull(),
    /** VAT rate applied to the sale, basis points (2550 = 25.5 %). */
    vatBps: integer("vat_bps").notNull(),
    /** Optional "was" price. Only shown when the merchant has genuinely charged it. */
    referencePriceCents: integer("reference_price_cents"),
    imageUrl: text("image_url").notNull(),
    status: text("status").$type<DealStatus>().notNull().default("pending"),
    featured: boolean("featured").notNull().default(false),
    reviewNote: text("review_note"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("deals_status_idx").on(t.status), index("deals_merchant_idx").on(t.merchantId)],
);

export const dealOptions = pgTable("deal_options", {
  id: uuid("id").primaryKey().defaultRandom(),
  dealId: uuid("deal_id")
    .notNull()
    .references(() => deals.id, { onDelete: "cascade" }),
  label: jsonb("label").$type<LocalizedText>(),
  priceCents: integer("price_cents").notNull(),
  sort: integer("sort").notNull().default(0),
});
