import type { FastifyInstance } from "fastify";
import { redeemLookupSchema } from "@vendelia/shared";
import type { AppContext } from "../../context";
import { merchantIdOf, requireRole, requireUser } from "../../middleware/auth";
import { vouchersService } from "./vouchers.service";

export function vouchersRoutes(app: FastifyInstance, ctx: AppContext) {
  app.get("/api/me/vouchers", { preHandler: requireUser }, async (req) => ({
    vouchers: await vouchersService.listForCustomer(ctx, req.user!),
  }));

  const merchant = { preHandler: requireRole("merchant") };

  app.post("/api/merchant/vouchers/lookup", merchant, async (req) => {
    const { code } = redeemLookupSchema.parse(req.body);
    return vouchersService.lookupForMerchant(ctx, merchantIdOf(req), code);
  });

  app.post("/api/merchant/vouchers/redeem", merchant, async (req) => {
    const { code } = redeemLookupSchema.parse(req.body);
    return vouchersService.redeem(ctx, merchantIdOf(req), req.user!.id, code);
  });
}
