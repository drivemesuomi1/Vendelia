import { and, count, desc, eq, ne, sql } from "drizzle-orm";
import type { DbOrTx } from "../../db/client";
import { deals, merchants, users, vouchers } from "../../db/schema";
import type { MerchantStatus } from "../../db/schema/merchants";

export const merchantsRepository = {
  async byBusinessId(db: DbOrTx, businessId: string) {
    const [m] = await db.select().from(merchants).where(eq(merchants.businessId, businessId)).limit(1);
    return m ?? null;
  },

  async insert(db: DbOrTx, values: typeof merchants.$inferInsert) {
    const [m] = await db.insert(merchants).values(values).returning();
    return m!;
  },

  async setStatus(db: DbOrTx, id: string, status: MerchantStatus) {
    await db.update(merchants).set({ status }).where(eq(merchants.id, id));
  },

  async listWithStats(db: DbOrTx) {
    return db
      .select({
        m: merchants,
        email: sql<string>`(select ${users.email} from ${users} where ${users.merchantId} = ${merchants.id} limit 1)`,
        liveDeals: sql<number>`(select count(*) from ${deals} where ${deals.merchantId} = ${merchants.id} and ${deals.status} = 'live')`,
      })
      .from(merchants)
      .orderBy(desc(merchants.createdAt));
  },

  async voucherStats(db: DbOrTx, merchantId: string) {
    const [row] = await db
      .select({
        sold: count(),
        redeemed: sql<number>`count(*) filter (where ${vouchers.status} = 'redeemed')`,
        gross: sql<number>`coalesce(sum(${vouchers.priceCents}), 0)`,
      })
      .from(vouchers)
      .where(and(eq(vouchers.merchantId, merchantId), ne(vouchers.status, "refunded")));
    return { sold: Number(row?.sold ?? 0), redeemed: Number(row?.redeemed ?? 0), grossCents: Number(row?.gross ?? 0) };
  },
};
