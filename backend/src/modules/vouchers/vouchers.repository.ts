import { and, desc, eq, gt, inArray, or, type SQL } from "drizzle-orm";
import type { VoucherDTO } from "@vendelia/shared";
import type { DbOrTx } from "../../db/client";
import { dealOptions, deals, merchants, orders, vouchers } from "../../db/schema";
import { canCancel, effectiveStatus, refundDeadline } from "../../domain/voucher-lifecycle";

const select = {
  voucher: vouchers,
  dealSlug: deals.slug,
  title: deals.title,
  baseTitle: deals.baseTitle,
  howTo: deals.howTo,
  street: deals.street,
  zip: deals.zip,
  cityId: deals.cityId,
  meetingPoint: deals.meetingPoint,
  imageUrl: deals.imageUrl,
  optionLabel: dealOptions.label,
  merchantName: merchants.name,
  orderNumber: orders.number,
  orderEmail: orders.email,
  orderUserId: orders.userId,
  orderLocale: orders.locale,
};

function baseQuery(db: DbOrTx, where: SQL | undefined) {
  return db
    .select(select)
    .from(vouchers)
    .innerJoin(deals, eq(deals.id, vouchers.dealId))
    .innerJoin(dealOptions, eq(dealOptions.id, vouchers.optionId))
    .innerJoin(merchants, eq(merchants.id, vouchers.merchantId))
    .innerJoin(orders, eq(orders.id, vouchers.orderId))
    .where(where)
    .orderBy(desc(vouchers.issuedAt));
}

export type VoucherRow = Awaited<ReturnType<typeof baseQuery>>[number];

export function toVoucherDTO(r: VoucherRow, now: Date): VoucherDTO {
  const v = r.voucher;
  const step = r.howTo.fi[1] !== undefined ? { fi: r.howTo.fi[1] ?? "", sv: r.howTo.sv[1] ?? "", en: r.howTo.en[1] ?? "" } : null;
  return {
    code: v.code,
    status: effectiveStatus(v, now),
    dealSlug: r.dealSlug,
    title: r.optionLabel ? (r.baseTitle ?? r.title) : r.title,
    optionLabel: r.optionLabel,
    merchantName: r.merchantName,
    street: r.street,
    zip: r.zip,
    cityId: r.cityId,
    meetingPoint: r.meetingPoint,
    howTo: step,
    priceCents: v.priceCents,
    issuedAt: v.issuedAt.toISOString(),
    expiresAt: v.expiresAt.toISOString(),
    redeemedAt: v.redeemedAt?.toISOString() ?? null,
    refundedAt: v.refundedAt?.toISOString() ?? null,
    cancellableUntil: canCancel(v, now).ok ? refundDeadline(v.issuedAt).toISOString() : null,
    recipientName: v.recipientName,
    orderNumber: r.orderNumber,
    imageUrl: r.imageUrl,
  };
}

export const vouchersRepository = {
  async byCode(db: DbOrTx, code: string) {
    const [row] = await baseQuery(db, eq(vouchers.code, code)).limit(1);
    return row ?? null;
  },

  byOrder: (db: DbOrTx, orderId: string) => baseQuery(db, eq(vouchers.orderId, orderId)),

  /** Vouchers bought by this account, or by a guest checkout with the same email. */
  forCustomer: (db: DbOrTx, userId: string, email: string) => baseQuery(db, or(eq(orders.userId, userId), eq(orders.email, email))),

  async insertMany(db: DbOrTx, rows: (typeof vouchers.$inferInsert)[]) {
    return db.insert(vouchers).values(rows).returning();
  },

  /** Atomic single-use redemption: only succeeds if the voucher is still active and unexpired. */
  async markRedeemed(db: DbOrTx, code: string, merchantId: string, now: Date) {
    const [row] = await db
      .update(vouchers)
      .set({ status: "redeemed", redeemedAt: now })
      .where(and(eq(vouchers.code, code), eq(vouchers.merchantId, merchantId), eq(vouchers.status, "active"), gt(vouchers.expiresAt, now)))
      .returning();
    return row ?? null;
  },

  /** Atomic cancellation: only flips active → refunded once. */
  async markRefunded(db: DbOrTx, code: string, now: Date) {
    const [row] = await db
      .update(vouchers)
      .set({ status: "refunded", refundedAt: now })
      .where(and(eq(vouchers.code, code), eq(vouchers.status, "active")))
      .returning();
    return row ?? null;
  },

  async setReminderSent(db: DbOrTx, ids: string[], now: Date) {
    if (ids.length) await db.update(vouchers).set({ reminderSentAt: now }).where(inArray(vouchers.id, ids));
  },
};
