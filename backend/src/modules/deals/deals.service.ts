import { eq } from "drizzle-orm";
import type { CommissionPreviewInput, DealInput, DealQuery, MerchantDealRowDTO, MetaDTO } from "@vendelia/shared";
import type { AppContext } from "../../context";
import { categories, cities, merchants, users } from "../../db/schema";
import { generateToken, slugify } from "../../domain/codes";
import { splitSale } from "../../domain/commission";
import { badRequest, forbidden, notFound } from "../../domain/errors";
import { COMMISSION_VAT_BPS } from "../../domain/vat";
import { REFUND_WINDOW_DAYS, VOUCHER_VALIDITY_MONTHS } from "../../domain/voucher-lifecycle";
import { templates } from "../../integrations/email/templates";
import { auditService } from "../admin/audit.service";
import { settingsRepository } from "../admin/settings.repository";
import { dealsRepository } from "./deals.repository";

async function assertReferences(ctx: AppContext, input: DealInput) {
  const [c] = await ctx.db.select({ id: categories.id }).from(categories).where(eq(categories.id, input.categoryId)).limit(1);
  if (!c) throw badRequest("validation_failed", undefined, { categoryId: "invalidCategory" });
  const [ci] = await ctx.db.select({ id: cities.id }).from(cities).where(eq(cities.id, input.cityId)).limit(1);
  if (!ci) throw badRequest("validation_failed", undefined, { cityId: "invalidCity" });
}

export const dealsService = {
  async meta(ctx: AppContext): Promise<MetaDTO> {
    const [base, commissionBps] = await Promise.all([dealsRepository.meta(ctx.db), settingsRepository.getCommissionBps(ctx.db)]);
    return {
      ...base,
      commissionBps,
      commissionVatBps: COMMISSION_VAT_BPS,
      voucherValidityMonths: VOUCHER_VALIDITY_MONTHS,
      refundWindowDays: REFUND_WINDOW_DAYS,
    };
  },

  listPublic: (ctx: AppContext, q: DealQuery) => dealsRepository.listPublic(ctx.db, q),

  async getPublic(ctx: AppContext, slug: string) {
    const deal = await dealsRepository.getDetail(ctx.db, { slug });
    if (!deal || deal.status !== "live") throw notFound("deal_not_found");
    const { merchantId: _m, ...dto } = deal;
    return dto;
  },

  async listForMerchant(ctx: AppContext, merchantId: string): Promise<MerchantDealRowDTO[]> {
    const commissionBps = await settingsRepository.getCommissionBps(ctx.db);
    const rows = await dealsRepository.listByMerchant(ctx.db, merchantId);
    return rows.map(({ deal, options, sold }) => {
      const from = options.length ? Math.min(...options.map((o) => o.priceCents)) : 0;
      return {
        id: deal.id,
        slug: deal.slug,
        title: deal.title,
        status: deal.status,
        fromPriceCents: from,
        vatBps: deal.vatBps,
        payoutCents: splitSale(from, deal.vatBps, commissionBps).payoutCents,
        sold,
      };
    });
  },

  async getForMerchant(ctx: AppContext, merchantId: string, dealId: string) {
    const deal = await dealsRepository.getDetail(ctx.db, { id: dealId });
    if (!deal || deal.merchantId !== merchantId) throw notFound("deal_not_found");
    return deal;
  },

  async create(ctx: AppContext, merchantId: string, actorId: string, input: DealInput) {
    const [m] = await ctx.db.select({ status: merchants.status }).from(merchants).where(eq(merchants.id, merchantId)).limit(1);
    if (m?.status !== "active") throw forbidden("merchant_not_active");
    await assertReferences(ctx, input);
    let slug = slugify(input.title.fi) || "diili";
    if (await dealsRepository.slugExists(ctx.db, slug)) slug = `${slug}-${generateToken(3).toLowerCase().replace(/[^a-z0-9]/g, "")}`;
    const deal = await ctx.db.transaction(async (tx) => {
      const d = await dealsRepository.create(tx, merchantId, slug, input);
      await auditService.record(tx, { actorId, action: "deal.create", entity: "deal", entityId: d.id });
      return d;
    });
    return { id: deal.id, slug: deal.slug, status: deal.status };
  },

  async update(ctx: AppContext, merchantId: string, actorId: string, dealId: string, input: DealInput) {
    await this.getForMerchant(ctx, merchantId, dealId);
    await assertReferences(ctx, input);
    await ctx.db.transaction(async (tx) => {
      await dealsRepository.update(tx, dealId, input);
      await auditService.record(tx, { actorId, action: "deal.update", entity: "deal", entityId: dealId });
    });
    return { id: dealId, status: "pending" as const };
  },

  async commissionPreview(ctx: AppContext, input: CommissionPreviewInput) {
    const commissionBps = await settingsRepository.getCommissionBps(ctx.db);
    return { commissionBps, split: splitSale(input.priceCents, input.vatBps, commissionBps) };
  },

  async review(ctx: AppContext, actorId: string, dealId: string, decision: "approve" | "reject", note?: string) {
    const deal = await dealsRepository.getDetail(ctx.db, { id: dealId });
    if (!deal) throw notFound("deal_not_found");
    const status = decision === "approve" ? "live" : "rejected";
    await ctx.db.transaction(async (tx) => {
      await dealsRepository.setStatus(tx, dealId, status, note);
      await auditService.record(tx, { actorId, action: `deal.${decision}`, entity: "deal", entityId: dealId, data: { note } });
    });
    const recipients = await ctx.db.select({ email: users.email }).from(users).where(eq(users.merchantId, deal.merchantId));
    const mail = templates.dealReviewed({ title: deal.title.fi, approved: decision === "approve", note });
    for (const r of recipients) await ctx.mailer.send({ to: r.email, template: "dealReviewed", ...mail });
    return { id: dealId, status };
  },
};
