import { and, eq, inArray, isNull, sql } from "drizzle-orm";
import type { DbOrTx } from "../../db/client";
import { ledgerEntries, vouchers } from "../../db/schema";
import { splitSale } from "../../domain/commission";

type VoucherForLedger = Pick<typeof vouchers.$inferSelect, "id" | "merchantId" | "orderId" | "priceCents" | "vatBps" | "commissionBps">;

/** Double-entry style merchant ledger. Every money movement is a row; nothing is ever updated or deleted. */
export const ledgerService = {
  async recordSale(db: DbOrTx, v: VoucherForLedger) {
    const s = splitSale(v.priceCents, v.vatBps, v.commissionBps);
    const base = { merchantId: v.merchantId, voucherId: v.id, orderId: v.orderId };
    await db.insert(ledgerEntries).values([
      { ...base, type: "sale", amountCents: s.grossCents },
      { ...base, type: "commission", amountCents: -s.commissionCents },
      { ...base, type: "commission_vat", amountCents: -s.commissionVatCents },
    ]);
    return s;
  },

  /** Reverses a sale: refund the gross and return the commission + its VAT to the merchant balance. */
  async recordRefund(db: DbOrTx, v: VoucherForLedger) {
    const s = splitSale(v.priceCents, v.vatBps, v.commissionBps);
    const base = { merchantId: v.merchantId, voucherId: v.id, orderId: v.orderId };
    await db.insert(ledgerEntries).values([
      { ...base, type: "refund", amountCents: -s.grossCents },
      { ...base, type: "refund_commission", amountCents: s.commissionCents },
      { ...base, type: "refund_commission_vat", amountCents: s.commissionVatCents },
    ]);
  },

  /** Balance owed to a merchant for redeemed vouchers not yet included in a payout. */
  async payableBalance(db: DbOrTx, merchantId: string) {
    const [row] = await db
      .select({ total: sql<number>`coalesce(sum(${ledgerEntries.amountCents}), 0)` })
      .from(ledgerEntries)
      .innerJoin(vouchers, eq(vouchers.id, ledgerEntries.voucherId))
      .where(and(eq(ledgerEntries.merchantId, merchantId), eq(vouchers.status, "redeemed"), isNull(ledgerEntries.payoutId)));
    return Number(row?.total ?? 0);
  },

  /** Marks the payable entries of a merchant as settled by a payout and records the payout movement. */
  async settle(db: DbOrTx, merchantId: string, payoutId: string, amountCents: number) {
    const payable = await db
      .select({ id: ledgerEntries.id })
      .from(ledgerEntries)
      .innerJoin(vouchers, eq(vouchers.id, ledgerEntries.voucherId))
      .where(and(eq(ledgerEntries.merchantId, merchantId), eq(vouchers.status, "redeemed"), isNull(ledgerEntries.payoutId)));
    if (payable.length) {
      await db.update(ledgerEntries).set({ payoutId }).where(inArray(ledgerEntries.id, payable.map((p) => p.id)));
    }
    await db.insert(ledgerEntries).values({ merchantId, payoutId, type: "payout", amountCents: -amountCents });
  },
};
