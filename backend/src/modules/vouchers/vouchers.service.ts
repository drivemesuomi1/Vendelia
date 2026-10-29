import type { RedeemLookupDTO, SessionUserDTO } from "@vendelia/shared";
import type { AppContext } from "../../context";
import type { DbOrTx } from "../../db/client";
import type { orderItems, orders } from "../../db/schema";
import { generateVoucherCode } from "../../domain/codes";
import { splitSale } from "../../domain/commission";
import { conflict } from "../../domain/errors";
import { canRedeem, expiryFor } from "../../domain/voucher-lifecycle";
import { auditService } from "../admin/audit.service";
import { ledgerService } from "../ledger/ledger.service";
import { toVoucherDTO, vouchersRepository } from "./vouchers.repository";

type Order = typeof orders.$inferSelect;
type OrderItem = typeof orderItems.$inferSelect & { merchantId: string };

export const vouchersService = {
  /** Issues one voucher per unit bought and books the sale in the merchant ledger. Runs inside the payment transaction. */
  async issueForOrder(db: DbOrTx, order: Order, items: OrderItem[], now: Date) {
    const rows = items.flatMap((item) =>
      Array.from({ length: item.qty }, () => ({
        code: generateVoucherCode(),
        orderId: order.id,
        orderItemId: item.id,
        dealId: item.dealId,
        optionId: item.optionId,
        merchantId: item.merchantId,
        priceCents: item.unitPriceCents,
        vatBps: item.vatBps,
        commissionBps: item.commissionBps,
        recipientName: order.isGift ? order.giftRecipient : null,
        issuedAt: now,
        expiresAt: expiryFor(now),
      })),
    );
    const created = await vouchersRepository.insertMany(db, rows);
    for (const v of created) await ledgerService.recordSale(db, v);
    return created;
  },

  async listForCustomer(ctx: AppContext, user: SessionUserDTO) {
    const rows = await vouchersRepository.forCustomer(ctx.db, user.id, user.email);
    return rows.map((r) => toVoucherDTO(r, ctx.now()));
  },

  async lookupForMerchant(ctx: AppContext, merchantId: string, code: string): Promise<RedeemLookupDTO> {
    const r = await vouchersRepository.byCode(ctx.db, code);
    if (!r) return { code, result: "not_found" };
    if (r.voucher.merchantId !== merchantId) return { code, result: "other_merchant" };
    const check = canRedeem(r.voucher, ctx.now());
    const base = {
      code,
      title: r.optionLabel ? (r.baseTitle ?? r.title) : r.title,
      optionLabel: r.optionLabel,
      expiresAt: r.voucher.expiresAt.toISOString(),
      redeemedAt: r.voucher.redeemedAt?.toISOString() ?? null,
      recipientName: r.voucher.recipientName,
      payoutCents: splitSale(r.voucher.priceCents, r.voucher.vatBps, r.voucher.commissionBps).payoutCents,
    };
    return check.ok ? { ...base, result: "valid" } : { ...base, result: check.reason };
  },

  async redeem(ctx: AppContext, merchantId: string, actorId: string, code: string): Promise<RedeemLookupDTO> {
    const updated = await ctx.db.transaction(async (tx) => {
      const v = await vouchersRepository.markRedeemed(tx, code, merchantId, ctx.now());
      if (v) await auditService.record(tx, { actorId, action: "voucher.redeem", entity: "voucher", entityId: v.id });
      return v;
    });
    const result = await this.lookupForMerchant(ctx, merchantId, code);
    if (!updated) throw conflict(`redeem_${result.result}`, "Voucher cannot be redeemed");
    return result;
  },
};
