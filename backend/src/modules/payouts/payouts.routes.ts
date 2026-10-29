import type { FastifyInstance } from "fastify";
import type { AppContext } from "../../context";
import { merchantIdOf, requireRole } from "../../middleware/auth";
import { payoutsService } from "./payouts.service";

export function payoutsRoutes(app: FastifyInstance, ctx: AppContext) {
  app.get("/api/merchant/payouts", { preHandler: requireRole("merchant") }, async (req) => payoutsService.statement(ctx, merchantIdOf(req)));
}
