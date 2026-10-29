import { and, eq, gte, lt, ne } from "drizzle-orm";
import type { AppContext } from "../context";
import { merchants, vouchers } from "../db/schema";
import { splitSale } from "../domain/commission";

/**
 * Yearly (by 31 January): totals per seller for EU DAC7 platform reporting to Vero.
 * Produces the figures; submitting them to the tax authority is a separate manual/API step.
 */
export async function buildDac7Report(ctx: AppContext, year = ctx.now().getUTCFullYear() - 1) {
  const from = new Date(Date.UTC(year, 0, 1));
  const to = new Date(Date.UTC(year + 1, 0, 1));
  const rows = await ctx.db
    .select({ v: vouchers, m: merchants })
    .from(vouchers)
    .innerJoin(merchants, eq(merchants.id, vouchers.merchantId))
    .where(and(gte(vouchers.issuedAt, from), lt(vouchers.issuedAt, to), ne(vouchers.status, "refunded")));

  const sellers = new Map<string, { businessId: string; companyName: string; transactions: number; grossCents: number; feesCents: number }>();
  for (const { v, m } of rows) {
    const s = sellers.get(m.id) ?? { businessId: m.businessId, companyName: m.companyName, transactions: 0, grossCents: 0, feesCents: 0 };
    const split = splitSale(v.priceCents, v.vatBps, v.commissionBps);
    s.transactions += 1;
    s.grossCents += split.grossCents;
    s.feesCents += split.feeCents;
    sellers.set(m.id, s);
  }
  return { year, sellers: [...sellers.values()] };
}
