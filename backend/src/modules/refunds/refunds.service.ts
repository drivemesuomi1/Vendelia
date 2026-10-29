import { desc, eq } from "drizzle-orm";
import type { AdminRefundRowDTO, SessionUserDTO } from "@vendelia/shared";
import type { AppContext } from "../../context";
import { deals, merchants, orders, vouchers } from "../../db/schema";
import { conflict, forbidden, notFound } from "../../domain/errors";
import { canCancel } from "../../domain/voucher-lifecycle";
import { templates } from "../../integrations/email/templates";
import { auditService } from "../admin/audit.service";
import { ledgerService } from "../ledger/ledger.service";
import { toVoucherDTO, vouchersRepository } from "../vouchers/vouchers.repository";

async function refund(ctx: AppContext, code: string, actorId: string, reason: "customer_cancel" | "support") {
  const row = await vouchersRepository.byCode(ctx.db, code);
  if (!row) throw notFound("voucher_not_found");
  const [order] = await ctx.db.select().from(orders).where(eq(orders.id, row.voucher.orderId)).limit(1);

  await ctx.db.transaction(async (tx) => {
    const v = await vouchersRepository.markRefunded(tx, code, ctx.now());
    if (!v) throw conflict("not_cancellable");
    await ledgerService.recordRefund(tx, v);
    await auditService.record(tx, { actorId, action: "voucher.refund", entity: "voucher", entityId: v.id, data: { reason } });
    // Provider refund last: if it fails the transaction rolls back and the voucher stays active.
    await ctx.payments.refund({ ref: order?.paymentRef ?? "", amountCents: v.priceCents, reason });
  });

  const locale = row.orderLocale;
  const mail = templates.refundAcknowledgement({ locale, code, title: row.title[locale] || row.title.fi, amountCents: row.voucher.priceCents });
  await ctx.mailer.send({ to: row.orderEmail, template: "refundAcknowledgement", ...mail });
  const fresh = await vouchersRepository.byCode(ctx.db, code);
  return toVoucherDTO(fresh!, ctx.now());
}

export const refundsService = {
  /** Customer cancels an unused voucher within the 14-day window. */
  async cancelByCustomer(ctx: AppContext, user: SessionUserDTO, code: string) {
    const row = await vouchersRepository.byCode(ctx.db, code);
    if (!row) throw notFound("voucher_not_found");
    const owns = row.orderUserId === user.id || row.orderEmail === user.email;
    if (!owns) throw forbidden();
    const check = canCancel(row.voucher, ctx.now());
    if (!check.ok) throw conflict(check.reason);
    return refund(ctx, code, user.id, "customer_cancel");
  },

  /** Support refund by an admin (no 14-day limit, still only for unused vouchers). */
  adminRefund: (ctx: AppContext, actorId: string, code: string) => refund(ctx, code, actorId, "support"),

  async list(ctx: AppContext): Promise<AdminRefundRowDTO[]> {
    const rows = await ctx.db
      .select({ v: vouchers, title: deals.title, merchantName: merchants.name, orderNumber: orders.number, email: orders.email })
      .from(vouchers)
      .innerJoin(deals, eq(deals.id, vouchers.dealId))
      .innerJoin(merchants, eq(merchants.id, vouchers.merchantId))
      .innerJoin(orders, eq(orders.id, vouchers.orderId))
      .where(eq(vouchers.status, "refunded"))
      .orderBy(desc(vouchers.refundedAt));
    return rows.map((r) => ({
      code: r.v.code,
      title: r.title,
      merchantName: r.merchantName,
      priceCents: r.v.priceCents,
      refundedAt: r.v.refundedAt!.toISOString(),
      orderNumber: r.orderNumber,
      email: r.email,
    }));
  },
};
