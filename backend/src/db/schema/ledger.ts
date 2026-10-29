import { index, integer, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { merchants } from "./merchants";
import { orders } from "./orders";
import { vouchers } from "./vouchers";

/**
 * Merchant balance ledger. Amounts are signed cents from the merchant's point of view:
 * sale +gross, commission −, commission_vat −; a refund reverses all three; payout −.
 * Sale VAT is not a ledger movement (the merchant reports it); statements derive it from the voucher.
 */
export type LedgerType = "sale" | "commission" | "commission_vat" | "refund" | "refund_commission" | "refund_commission_vat" | "payout";

export const ledgerEntries = pgTable(
  "ledger_entries",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    merchantId: uuid("merchant_id")
      .notNull()
      .references(() => merchants.id),
    voucherId: uuid("voucher_id").references(() => vouchers.id),
    orderId: uuid("order_id").references(() => orders.id),
    payoutId: uuid("payout_id").references(() => payouts.id),
    type: text("type").$type<LedgerType>().notNull(),
    amountCents: integer("amount_cents").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("ledger_merchant_idx").on(t.merchantId), index("ledger_voucher_idx").on(t.voucherId)],
);

export type PayoutStatus = "scheduled" | "paid";

export const payouts = pgTable("payouts", {
  id: uuid("id").primaryKey().defaultRandom(),
  merchantId: uuid("merchant_id")
    .notNull()
    .references(() => merchants.id),
  amountCents: integer("amount_cents").notNull(),
  status: text("status").$type<PayoutStatus>().notNull().default("scheduled"),
  periodStart: timestamp("period_start", { withTimezone: true }).notNull(),
  periodEnd: timestamp("period_end", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
