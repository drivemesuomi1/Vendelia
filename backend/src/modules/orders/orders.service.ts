import { timingSafeEqual } from "node:crypto";
import { inArray } from "drizzle-orm";
import type { CheckoutInput, CreateOrderResponse, Locale, OrderDTO, SessionUserDTO } from "@vendelia/shared";
import type { AppContext } from "../../context";
import { users } from "../../db/schema";
import { generateOrderNumber, generateToken } from "../../domain/codes";
import { splitSale } from "../../domain/commission";
import { forbidden, notFound } from "../../domain/errors";
import { refundDeadline } from "../../domain/voucher-lifecycle";
import { templates } from "../../integrations/email/templates";
import { hashToken } from "../../middleware/auth";
import { settingsRepository } from "../admin/settings.repository";
import { cartService } from "../cart/cart.service";
import { toVoucherDTO, vouchersRepository } from "../vouchers/vouchers.repository";
import { vouchersService } from "../vouchers/vouchers.service";
import { ordersRepository } from "./orders.repository";

const pick = (t: { fi: string; sv: string; en: string }, l: Locale) => t[l] || t.fi;

export const ordersService = {
  /** Checkout: prices the cart server-side, snapshots VAT and commission, and starts a payment. */
  async create(ctx: AppContext, user: SessionUserDTO | null, input: CheckoutInput, locale: Locale): Promise<CreateOrderResponse> {
    const priced = await cartService.requirePurchasable(ctx.db, input.items);
    const commissionBps = await settingsRepository.getCommissionBps(ctx.db);

    let number = generateOrderNumber();
    while (await ordersRepository.numberExists(ctx.db, number)) number = generateOrderNumber();
    const accessToken = generateToken();

    const order = await ordersRepository.insert(
      ctx.db,
      {
        number,
        accessTokenHash: hashToken(accessToken),
        userId: user?.id ?? null,
        email: input.contact.email.toLowerCase(),
        firstName: input.contact.firstName,
        lastName: input.contact.lastName,
        phone: input.contact.phone,
        isGift: input.gift.enabled,
        giftRecipient: input.gift.enabled ? input.gift.recipientName : null,
        giftMessage: input.gift.enabled ? input.gift.message : null,
        newsletter: input.newsletter,
        locale,
        paymentMethod: input.payment.method,
        bank: input.payment.method === "bank" ? (input.payment.bank ?? null) : null,
        paymentProvider: ctx.payments.name,
        totalCents: priced.totalCents,
      },
      priced.lines.map((l) => ({
        dealId: l.dealId,
        optionId: l.optionId,
        qty: l.qty,
        unitPriceCents: l.unitPriceCents,
        vatBps: l.vatBps,
        commissionBps,
        titleSnapshot: l.title,
      })),
    );

    const payment = await ctx.payments.createPayment({
      orderId: order.id,
      orderNumber: number,
      amountCents: priced.totalCents,
      method: input.payment.method,
      bank: input.payment.bank,
      returnUrl: `${ctx.env.FRONTEND_URL}/${locale}/checkout/success?order=${order.id}`,
    });
    await ordersRepository.setPaymentRef(ctx.db, order.id, payment.ref);

    return {
      orderId: order.id,
      number,
      accessToken,
      totalCents: priced.totalCents,
      payment: { provider: ctx.payments.name, action: payment.action, redirectUrl: payment.redirectUrl },
    };
  },

  /**
   * Called when the payment provider confirms payment. Idempotent: a second call does nothing.
   * Issues vouchers, books the ledger, then emails the customer and merchants.
   */
  async markPaid(ctx: AppContext, orderId: string) {
    const issued = await ctx.db.transaction(async (tx) => {
      const order = await ordersRepository.lockById(tx, orderId);
      if (!order) throw notFound("order_not_found");
      if (order.status === "paid") return null;
      await ordersRepository.markPaid(tx, order.id, ctx.now());
      const items = await ordersRepository.itemsWithMerchant(tx, order.id);
      const vouchers = await vouchersService.issueForOrder(tx, order, items, ctx.now());
      return { order, vouchers };
    });
    if (!issued) return;

    const { order } = issued;
    const rows = await vouchersRepository.byOrder(ctx.db, order.id);
    const l = order.locale;
    const mail = templates.orderConfirmation({
      locale: l,
      orderNumber: order.number,
      totalCents: order.totalCents,
      cancelUntil: refundDeadline(ctx.now()),
      link: `${ctx.env.FRONTEND_URL}/${l}/account/vouchers`,
      vouchers: rows.map((r) => ({
        code: r.voucher.code,
        title: r.optionLabel ? `${pick(r.baseTitle ?? r.title, l)} – ${pick(r.optionLabel, l)}` : pick(r.title, l),
        merchant: r.merchantName,
        expiresAt: r.voucher.expiresAt,
      })),
    });
    await ctx.mailer.send({ to: order.email, template: "orderConfirmation", ...mail });

    const merchantIds = [...new Set(rows.map((r) => r.voucher.merchantId))];
    const merchantUsers = merchantIds.length
      ? await ctx.db.select({ email: users.email, merchantId: users.merchantId }).from(users).where(inArray(users.merchantId, merchantIds))
      : [];
    for (const r of rows) {
      const s = splitSale(r.voucher.priceCents, r.voucher.vatBps, r.voucher.commissionBps);
      const m = templates.merchantNewSale({ title: r.title.fi, code: r.voucher.code, payoutCents: s.payoutCents });
      for (const u of merchantUsers.filter((u) => u.merchantId === r.voucher.merchantId)) {
        await ctx.mailer.send({ to: u.email, template: "merchantNewSale", ...m });
      }
    }
  },

  /** Order + vouchers for the confirmation page: guest token or signed-in owner. */
  async get(ctx: AppContext, orderId: string, accessToken: string | undefined, user: SessionUserDTO | null): Promise<OrderDTO> {
    const order = await ordersRepository.byId(ctx.db, orderId);
    if (!order) throw notFound("order_not_found");
    const tokenOk =
      !!accessToken &&
      timingSafeEqual(Buffer.from(hashToken(accessToken)), Buffer.from(order.accessTokenHash));
    const ownerOk = !!user && (order.userId === user.id || order.email === user.email);
    if (!tokenOk && !ownerOk && user?.role !== "admin") throw forbidden();
    const rows = await vouchersRepository.byOrder(ctx.db, order.id);
    return {
      id: order.id,
      number: order.number,
      status: order.status,
      email: order.email,
      totalCents: order.totalCents,
      paymentMethod: order.paymentMethod,
      createdAt: order.createdAt.toISOString(),
      vouchers: rows.map((r) => toVoucherDTO(r, ctx.now())),
    };
  },
};
