import type { FastifyInstance } from "fastify";
import { z } from "zod";
import type { AppContext } from "../../context";
import { requireUser } from "../../middleware/auth";
import { usersRepository } from "./users.repository";

const profileSchema = z.object({ name: z.string().trim().min(1, { message: "required" }).max(100) });

export function usersRoutes(app: FastifyInstance, ctx: AppContext) {
  app.patch("/api/me", { preHandler: requireUser }, async (req) => {
    const { name } = profileSchema.parse(req.body);
    await usersRepository.updateName(ctx.db, req.user!.id, name);
    return { ok: true };
  });
}
