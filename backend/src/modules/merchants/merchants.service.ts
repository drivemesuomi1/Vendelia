import type { AdminMerchantRowDTO, MerchantOverviewDTO, RegisterMerchantInput } from "@vendelia/shared";
import type { AppContext } from "../../context";
import { conflict } from "../../domain/errors";
import { auditService } from "../admin/audit.service";
import { authService } from "../auth/auth.service";
import { hashPassword } from "../auth/password";
import { dealsService } from "../deals/deals.service";
import { ledgerService } from "../ledger/ledger.service";
import { usersRepository } from "../users/users.repository";
import { merchantsRepository } from "./merchants.repository";

export const merchantsService = {
  lookupCompany: (ctx: AppContext, businessId: string) => ctx.registry.lookup(businessId),

  /** Business sign-up: creates the merchant (pending review) and its first user, and signs them in. */
  async register(ctx: AppContext, input: RegisterMerchantInput) {
    if (await usersRepository.findByEmail(ctx.db, input.email)) throw conflict("email_taken");
    if (await merchantsRepository.byBusinessId(ctx.db, input.businessId)) throw conflict("business_exists");
    const passwordHash = await hashPassword(input.password);
    const userId = await ctx.db.transaction(async (tx) => {
      const m = await merchantsRepository.insert(tx, {
        name: input.displayName,
        companyName: input.companyName,
        businessId: input.businessId,
        phone: input.phone,
        street: input.street,
        zip: input.zip,
        cityId: input.cityId,
        status: "pending",
      });
      const u = await usersRepository.create(tx, { email: input.email, name: input.contactName, role: "merchant", merchantId: m.id, passwordHash });
      await auditService.record(tx, { actorId: u.id, action: "merchant.register", entity: "merchant", entityId: m.id });
      return u.id;
    });
    return authService.createSession(ctx, userId);
  },

  async overview(ctx: AppContext, merchantId: string): Promise<MerchantOverviewDTO> {
    const [stats, deals, nextPayoutCents] = await Promise.all([
      merchantsRepository.voucherStats(ctx.db, merchantId),
      dealsService.listForMerchant(ctx, merchantId),
      ledgerService.payableBalance(ctx.db, merchantId),
    ]);
    return { vouchersSold: stats.sold, vouchersRedeemed: stats.redeemed, grossSalesCents: stats.grossCents, nextPayoutCents, deals };
  },

  async listForAdmin(ctx: AppContext): Promise<AdminMerchantRowDTO[]> {
    const rows = await merchantsRepository.listWithStats(ctx.db);
    return rows.map((r) => ({
      id: r.m.id,
      name: r.m.name,
      companyName: r.m.companyName,
      businessId: r.m.businessId,
      status: r.m.status,
      email: r.email ?? "",
      liveDeals: Number(r.liveDeals),
      createdAt: r.m.createdAt.toISOString(),
    }));
  },

  async setStatus(ctx: AppContext, actorId: string, merchantId: string, status: "active" | "suspended") {
    await ctx.db.transaction(async (tx) => {
      await merchantsRepository.setStatus(tx, merchantId, status);
      await auditService.record(tx, { actorId, action: `merchant.${status}`, entity: "merchant", entityId: merchantId });
    });
    return { id: merchantId, status };
  },
};
