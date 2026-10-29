import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { businessIdSchema, registerMerchantSchema } from "@vendelia/shared";
import type { AppContext } from "../../context";
import { merchantIdOf, requireRole } from "../../middleware/auth";
import { setSessionCookie } from "../auth/auth.routes";
import { merchantsService } from "./merchants.service";

export function merchantsRoutes(app: FastifyInstance, ctx: AppContext) {
  const strict = { config: { rateLimit: { max: 10, timeWindow: "1 minute" } } };

  /** Prefill company name from the Finnish business register. */
  app.get("/api/merchants/lookup/:businessId", strict, async (req) => {
    const { businessId } = z.object({ businessId: businessIdSchema }).parse(req.params);
    return { company: await merchantsService.lookupCompany(ctx, businessId) };
  });

  app.post("/api/merchants/register", strict, async (req, reply) => {
    const input = registerMerchantSchema.parse(req.body);
    setSessionCookie(reply, ctx, await merchantsService.register(ctx, input));
    return reply.status(201).send({ ok: true });
  });

  app.get("/api/merchant/overview", { preHandler: requireRole("merchant") }, async (req) => merchantsService.overview(ctx, merchantIdOf(req)));
}
