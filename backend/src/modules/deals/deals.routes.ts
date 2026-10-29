import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { commissionPreviewSchema, dealInputSchema, dealQuerySchema } from "@vendelia/shared";
import type { AppContext } from "../../context";
import { badRequest } from "../../domain/errors";
import { ALLOWED_IMAGE_TYPES } from "../../integrations/storage/local-storage";
import { merchantIdOf, requireRole } from "../../middleware/auth";
import { dealsService } from "./deals.service";

const idParam = z.object({ id: z.string().uuid() });
const slugParam = z.object({ slug: z.string().min(1).max(100) });

export function dealsRoutes(app: FastifyInstance, ctx: AppContext) {
  // ---- public catalogue ----
  app.get("/api/meta", async () => dealsService.meta(ctx));

  app.get("/api/deals", async (req) => ({ deals: await dealsService.listPublic(ctx, dealQuerySchema.parse(req.query)) }));

  app.get("/api/deals/:slug", async (req) => dealsService.getPublic(ctx, slugParam.parse(req.params).slug));

  // ---- merchant: own deals ----
  const merchant = { preHandler: requireRole("merchant") };

  app.get("/api/merchant/deals", merchant, async (req) => ({ deals: await dealsService.listForMerchant(ctx, merchantIdOf(req)) }));

  app.get("/api/merchant/deals/:id", merchant, async (req) => dealsService.getForMerchant(ctx, merchantIdOf(req), idParam.parse(req.params).id));

  app.post("/api/merchant/deals", merchant, async (req, reply) => {
    const created = await dealsService.create(ctx, merchantIdOf(req), req.user!.id, dealInputSchema.parse(req.body));
    return reply.status(201).send(created);
  });

  app.put("/api/merchant/deals/:id", merchant, async (req) =>
    dealsService.update(ctx, merchantIdOf(req), req.user!.id, idParam.parse(req.params).id, dealInputSchema.parse(req.body)),
  );

  app.post("/api/merchant/commission-preview", merchant, async (req) => dealsService.commissionPreview(ctx, commissionPreviewSchema.parse(req.body)));

  app.post("/api/merchant/uploads", merchant, async (req, reply) => {
    const file = await req.file();
    if (!file) throw badRequest("file_missing");
    if (!ALLOWED_IMAGE_TYPES.includes(file.mimetype)) throw badRequest("unsupported_file_type");
    const url = await ctx.storage.saveImage(await file.toBuffer(), file.mimetype);
    return reply.status(201).send({ url });
  });
}
