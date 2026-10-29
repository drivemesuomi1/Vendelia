import type { FastifyInstance } from "fastify";
import { redeemLookupSchema } from "@vendelia/shared";
import type { AppContext } from "../../context";
import { requireRole, requireUser } from "../../middleware/auth";
import { refundsService } from "./refunds.service";

export function refundsRoutes(app: FastifyInstance, ctx: AppContext) {
  /** Customer: cancel an unused voucher (14-day window). */
  app.post("/api/me/vouchers/cancel", { preHandler: requireUser }, async (req) => {
    const { code } = redeemLookupSchema.parse(req.body);
    return refundsService.cancelByCustomer(ctx, req.user!, code);
  });

  const admin = { preHandler: requireRole("admin") };
  app.get("/api/admin/refunds", admin, async () => ({ refunds: await refundsService.list(ctx) }));
  app.post("/api/admin/refunds", admin, async (req) => {
    const { code } = redeemLookupSchema.parse(req.body);
    return refundsService.adminRefund(ctx, req.user!.id, code);
  });
}
