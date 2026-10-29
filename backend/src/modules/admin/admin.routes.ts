import type { FastifyInstance } from "fastify";
import { desc } from "drizzle-orm";
import { z } from "zod";
import { commissionSettingSchema, dealReviewSchema, type AdminDealRowDTO, type DealStatus } from "@vendelia/shared";
import type { AppContext } from "../../context";
import { emailOutbox } from "../../db/schema";
import { JOBS, type JobName } from "../../jobs/scheduler";
import { requireRole } from "../../middleware/auth";
import { dealsRepository } from "../deals/deals.repository";
import { dealsService } from "../deals/deals.service";
import { merchantsService } from "../merchants/merchants.service";
import { auditService } from "./audit.service";
import { settingsRepository } from "./settings.repository";

const idParam = z.object({ id: z.string().uuid() });
const statusQuery = z.object({ status: z.enum(["draft", "pending", "live", "rejected"]).optional() });

export function adminRoutes(app: FastifyInstance, ctx: AppContext) {
  const admin = { preHandler: requireRole("admin") };

  // ---- deal approval ----
  app.get("/api/admin/deals", admin, async (req) => {
    const { status } = statusQuery.parse(req.query);
    const rows = await dealsRepository.listForReview(ctx.db, status as DealStatus | undefined);
    const deals: AdminDealRowDTO[] = rows.map((r) => ({
      id: r.deal.id,
      slug: r.deal.slug,
      title: r.deal.title,
      merchantName: r.merchantName,
      status: r.deal.status,
      fromPriceCents: r.options.length ? Math.min(...r.options.map((o) => o.priceCents)) : 0,
      createdAt: r.deal.createdAt.toISOString(),
    }));
    return { deals };
  });

  app.post("/api/admin/deals/:id/review", admin, async (req) => {
    const { decision, note } = dealReviewSchema.parse(req.body);
    return dealsService.review(ctx, req.user!.id, idParam.parse(req.params).id, decision, note);
  });

  // ---- merchants ----
  app.get("/api/admin/merchants", admin, async () => ({ merchants: await merchantsService.listForAdmin(ctx) }));

  app.post("/api/admin/merchants/:id/status", admin, async (req) => {
    const { status } = z.object({ status: z.enum(["active", "suspended"]) }).parse(req.body);
    return merchantsService.setStatus(ctx, req.user!.id, idParam.parse(req.params).id, status);
  });

  // ---- commission ----
  app.get("/api/admin/settings/commission", admin, async () => ({ rateBps: await settingsRepository.getCommissionBps(ctx.db) }));

  app.put("/api/admin/settings/commission", admin, async (req) => {
    const { rateBps } = commissionSettingSchema.parse(req.body);
    const before = await settingsRepository.getCommissionBps(ctx.db);
    await settingsRepository.setCommissionBps(ctx.db, rateBps);
    await auditService.record(ctx.db, { actorId: req.user!.id, action: "settings.commission", entity: "settings", entityId: "commission_bps", data: { before, after: rateBps } });
    return { rateBps };
  });

  // ---- support tools ----
  app.get("/api/admin/audit", admin, async () => ({ entries: await auditService.latest(ctx.db) }));

  app.get("/api/admin/emails", admin, async () => ({
    emails: await ctx.db.select().from(emailOutbox).orderBy(desc(emailOutbox.createdAt)).limit(50),
  }));

  app.post("/api/admin/jobs/:name/run", admin, async (req) => {
    const { name } = z.object({ name: z.enum(Object.keys(JOBS) as [JobName, ...JobName[]]) }).parse(req.params);
    const result = await JOBS[name](ctx);
    await auditService.record(ctx.db, { actorId: req.user!.id, action: "job.run", entity: "job", entityId: name });
    return { job: name, result };
  });
}
