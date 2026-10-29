import { boolean, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { cities } from "./reference";

export type MerchantStatus = "pending" | "active" | "suspended";

export const merchants = pgTable("merchants", {
  id: uuid("id").primaryKey().defaultRandom(),
  /** Name shown to customers, e.g. "Näyte Wellness". */
  name: text("name").notNull(),
  /** Registered company name, e.g. "Näyte Wellness Oy". */
  companyName: text("company_name").notNull(),
  businessId: text("business_id").notNull().unique(),
  phone: text("phone").notNull(),
  street: text("street").notNull(),
  zip: text("zip").notNull(),
  cityId: text("city_id")
    .notNull()
    .references(() => cities.id),
  status: text("status").$type<MerchantStatus>().notNull().default("pending"),
  /** Masked payout account for display; the real account lives with the payment provider. */
  payoutAccountMasked: text("payout_account_masked").notNull().default(""),
  payoutVerified: boolean("payout_verified").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
