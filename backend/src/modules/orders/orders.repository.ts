import { eq } from "drizzle-orm";
import type { DbOrTx } from "../../db/client";
import { deals, orderItems, orders } from "../../db/schema";

export const ordersRepository = {
  async insert(db: DbOrTx, order: typeof orders.$inferInsert, items: Omit<typeof orderItems.$inferInsert, "orderId">[]) {
    const [o] = await db.insert(orders).values(order).returning();
    await db.insert(orderItems).values(items.map((i) => ({ ...i, orderId: o!.id })));
    return o!;
  },

  async byId(db: DbOrTx, id: string) {
    const [o] = await db.select().from(orders).where(eq(orders.id, id)).limit(1);
    return o ?? null;
  },

  /** Row-locks the order so concurrent payment confirmations cannot double-issue vouchers. */
  async lockById(db: DbOrTx, id: string) {
    const [o] = await db.select().from(orders).where(eq(orders.id, id)).for("update").limit(1);
    return o ?? null;
  },

  async numberExists(db: DbOrTx, number: string) {
    const [o] = await db.select({ id: orders.id }).from(orders).where(eq(orders.number, number)).limit(1);
    return Boolean(o);
  },

  async itemsWithMerchant(db: DbOrTx, orderId: string) {
    const rows = await db
      .select({ item: orderItems, merchantId: deals.merchantId })
      .from(orderItems)
      .innerJoin(deals, eq(deals.id, orderItems.dealId))
      .where(eq(orderItems.orderId, orderId));
    return rows.map((r) => ({ ...r.item, merchantId: r.merchantId }));
  },

  async setPaymentRef(db: DbOrTx, id: string, ref: string) {
    await db.update(orders).set({ paymentRef: ref }).where(eq(orders.id, id));
  },

  async markPaid(db: DbOrTx, id: string, now: Date) {
    await db.update(orders).set({ status: "paid", paidAt: now }).where(eq(orders.id, id));
  },
};
