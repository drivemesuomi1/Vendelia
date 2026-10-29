import { and, eq, lt } from "drizzle-orm";
import type { AppContext } from "../context";
import { vouchers } from "../db/schema";

/** Nightly: marks unused vouchers past their expiry date as expired. */
export async function expireVouchers(ctx: AppContext) {
  const rows = await ctx.db
    .update(vouchers)
    .set({ status: "expired" })
    .where(and(eq(vouchers.status, "active"), lt(vouchers.expiresAt, ctx.now())))
    .returning({ id: vouchers.id });
  return { expired: rows.length };
}
