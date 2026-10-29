import { boolean, index, integer, jsonb, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import type { Locale, LocalizedText, PaymentMethod } from "@vendelia/shared";
import { dealOptions, deals } from "./deals";
import { users } from "./users";

export type OrderStatus = "pending" | "paid" | "failed";

export const orders = pgTable(
  "orders",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    number: text("number").notNull().unique(),
    /** Hash of the token that lets a guest view their confirmation page. */
    accessTokenHash: text("access_token_hash").notNull(),
    userId: uuid("user_id").references(() => users.id),
    email: text("email").notNull(),
    firstName: text("first_name").notNull(),
    lastName: text("last_name").notNull(),
    phone: text("phone").notNull().default(""),
    isGift: boolean("is_gift").notNull().default(false),
    giftRecipient: text("gift_recipient"),
    giftMessage: text("gift_message"),
    newsletter: boolean("newsletter").notNull().default(false),
    /** Language the customer used; emails are sent in it. */
    locale: text("locale").$type<Locale>().notNull().default("fi"),
    paymentMethod: text("payment_method").$type<PaymentMethod>().notNull(),
    bank: text("bank"),
    paymentProvider: text("payment_provider").notNull(),
    paymentRef: text("payment_ref"),
    status: text("status").$type<OrderStatus>().notNull().default("pending"),
    totalCents: integer("total_cents").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    paidAt: timestamp("paid_at", { withTimezone: true }),
  },
  (t) => [index("orders_email_idx").on(t.email)],
);

/** Line items with price, VAT and commission snapshotted at purchase time. */
export const orderItems = pgTable("order_items", {
  id: uuid("id").primaryKey().defaultRandom(),
  orderId: uuid("order_id")
    .notNull()
    .references(() => orders.id, { onDelete: "cascade" }),
  dealId: uuid("deal_id")
    .notNull()
    .references(() => deals.id),
  optionId: uuid("option_id")
    .notNull()
    .references(() => dealOptions.id),
  qty: integer("qty").notNull(),
  unitPriceCents: integer("unit_price_cents").notNull(),
  vatBps: integer("vat_bps").notNull(),
  commissionBps: integer("commission_bps").notNull(),
  titleSnapshot: jsonb("title_snapshot").$type<LocalizedText>().notNull(),
});
