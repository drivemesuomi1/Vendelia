import { and, desc, eq, gte, lt } from "drizzle-orm";
import type { PayoutStatementDTO, StatementRowDTO } from "@vendelia/shared";
import type { AppContext } from "../../context";
import { deals, merchants, payouts, vouchers } from "../../db/schema";
import { splitSale } from "../../domain/commission";
import { notFound } from "../../domain/errors";
import { auditService } from "../admin/audit.service";
import { ledgerService } from "../ledger/ledger.service";

/** Settlement period: 1st–15th and 16th–end of month, matching a twice-monthly payout. */
export function periodFor(now: Date): { start: Date; end: Date } {
  const y = now.getUTCFullYear();
  const m = now.getUTCMonth();
  return now.getUTCDate() <= 15
    ? { start: new Date(Date.UTC(y, m, 1)), end: new Date(Date.UTC(y, m, 16)) }
    : { start: new Date(Date.UTC(y, m, 16)), end: new Date(Date.UTC(y, m + 1, 1)) };
}

export const payoutsService = {
  /** Statement for a period: every line the brief requires (sale, VAT, commission base, commission, its VAT, refunds, payout). */
  async statement(ctx: AppContext, merchantId: string, period = periodFor(ctx.now())): Promise<PayoutStatementDTO> {
    const [merchant] = await ctx.db.select().from(merchants).where(eq(merchants.id, merchantId)).limit(1);
    if (!merchant) throw notFound();
    const rows = await ctx.db
      .select({ v: vouchers, title: deals.title })
      .from(vouchers)
      .innerJoin(deals, eq(deals.id, vouchers.dealId))
      .where(and(eq(vouchers.merchantId, merchantId), gte(vouchers.issuedAt, period.start), lt(vouchers.issuedAt, period.end)));

    const byDeal = new Map<string, StatementRowDTO>();
    for (const { v, title } of rows) {
      const r = byDeal.get(v.dealId) ?? {
        dealId: v.dealId, title, sold: 0, refunded: 0, grossCents: 0, saleVatCents: 0, netCents: 0, commissionCents: 0, commissionVatCents: 0, refundCents: 0, payoutCents: 0,
      };
      const s = splitSale(v.priceCents, v.vatBps, v.commissionBps);
      r.sold += 1;
      r.grossCents += s.grossCents;
      r.saleVatCents += s.saleVatCents;
      r.netCents += s.netCents;
      if (v.status === "refunded") {
        r.refunded += 1;
        r.refundCents += s.grossCents;
      } else {
        r.commissionCents += s.commissionCents;
        r.commissionVatCents += s.commissionVatCents;
        r.payoutCents += s.payoutCents;
      }
      byDeal.set(v.dealId, r);
    }
    const list = [...byDeal.values()];
    const totals = list.reduce(
      (t, r) => ({
        sold: t.sold + r.sold, refunded: t.refunded + r.refunded, grossCents: t.grossCents + r.grossCents, saleVatCents: t.saleVatCents + r.saleVatCents,
        netCents: t.netCents + r.netCents, commissionCents: t.commissionCents + r.commissionCents, commissionVatCents: t.commissionVatCents + r.commissionVatCents,
        refundCents: t.refundCents + r.refundCents, payoutCents: t.payoutCents + r.payoutCents,
      }),
      { sold: 0, refunded: 0, grossCents: 0, saleVatCents: 0, netCents: 0, commissionCents: 0, commissionVatCents: 0, refundCents: 0, payoutCents: 0 },
    );
    const history = await ctx.db.select().from(payouts).where(eq(payouts.merchantId, merchantId)).orderBy(desc(payouts.createdAt)).limit(12);
    return {
      periodStart: period.start.toISOString(),
      periodEnd: period.end.toISOString(),
      rows: list,
      totals,
      pendingPayoutCents: await ledgerService.payableBalance(ctx.db, merchantId),
      payouts: history.map((p) => ({ id: p.id, amountCents: p.amountCents, status: p.status, createdAt: p.createdAt.toISOString() })),
      payoutAccountMasked: merchant.payoutAccountMasked,
    };
  },

  /** Creates a payout for every active merchant with a positive payable balance (redeemed vouchers only). */
  async run(ctx: AppContext, actorId: string | null = null) {
    const active = await ctx.db.select({ id: merchants.id }).from(merchants).where(eq(merchants.status, "active"));
    const period = periodFor(ctx.now());
    const created: { merchantId: string; amountCents: number }[] = [];
    for (const m of active) {
      await ctx.db.transaction(async (tx) => {
        const amount = await ledgerService.payableBalance(tx, m.id);
        if (amount <= 0) return;
        const [p] = await tx.insert(payouts).values({ merchantId: m.id, amountCents: amount, periodStart: period.start, periodEnd: period.end }).returning();
        await ledgerService.settle(tx, m.id, p!.id, amount);
        await auditService.record(tx, { actorId, action: "payout.create", entity: "payout", entityId: p!.id, data: { amount } });
        created.push({ merchantId: m.id, amountCents: amount });
      });
    }
    return created;
  },
};
