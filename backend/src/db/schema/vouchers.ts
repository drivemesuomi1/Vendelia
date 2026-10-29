import { index, integer, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import type { VoucherStatus } from "@vendelia/shared";
import { dealOptions, deals } from "./deals";
import { merchants } from "./merchants";
import { orderItems, orders } from "./orders";

/** One voucher per purchased unit; each has its own code. */
export const vouchers = pgTable(
  "vouchers",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    code: text("code").notNull().unique(),
    orderId: uuid("order_id")
      .notNull()
      .references(() => orders.id),
    orderItemId: uuid("order_item_id")
      .notNull()
      .references(() => orderItems.id),
    dealId: uuid("deal_id")
      .notNull()
      .references(() => deals.id),
    optionId: uuid("option_id")
      .notNull()
      .references(() => dealOptions.id),
    merchantId: uuid("merchant_id")
      .notNull()
      .references(() => merchants.id),
    priceCents: integer("price_cents").notNull(),
    vatBps: integer("vat_bps").notNull(),
    commissionBps: integer("commission_bps").notNull(),
    status: text("status").$type<VoucherStatus>().notNull().default("active"),
    recipientName: text("recipient_name"),
    issuedAt: timestamp("issued_at", { withTimezone: true }).notNull().defaultNow(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    redeemedAt: timestamp("redeemed_at", { withTimezone: true }),
    refundedAt: timestamp("refunded_at", { withTimezone: true }),
    reminderSentAt: timestamp("reminder_sent_at", { withTimezone: true }),
  },
  (t) => [index("vouchers_merchant_idx").on(t.merchantId), index("vouchers_order_idx").on(t.orderId)],
);
