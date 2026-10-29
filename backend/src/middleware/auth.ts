import { createHash } from "node:crypto";
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { and, eq, gt } from "drizzle-orm";
import type { Role, SessionUserDTO } from "@vendelia/shared";
import type { AppContext } from "../context";
import { merchants, sessions, users } from "../db/schema";
import { forbidden, unauthorized } from "../domain/errors";

export const SESSION_COOKIE = "vd_session";

declare module "fastify" {
  interface FastifyRequest {
    user: SessionUserDTO | null;
  }
}

export const hashToken = (token: string) => createHash("sha256").update(token).digest("hex");

/** Loads the signed-in user (if any) from the session cookie on every request. */
export function registerSessionLoader(app: FastifyInstance, ctx: AppContext) {
  app.decorateRequest("user", null);
  app.addHook("onRequest", async (req) => {
    const token = req.cookies[SESSION_COOKIE];
    if (!token) return;
    const [row] = await ctx.db
      .select({ user: users, merchant: merchants })
      .from(sessions)
      .innerJoin(users, eq(users.id, sessions.userId))
      .leftJoin(merchants, eq(merchants.id, users.merchantId))
      .where(and(eq(sessions.tokenHash, hashToken(token)), gt(sessions.expiresAt, ctx.now())))
      .limit(1);
    if (!row) return;
    req.user = {
      id: row.user.id,
      email: row.user.email,
      name: row.user.name,
      role: row.user.role,
      merchant: row.merchant
        ? { id: row.merchant.id, name: row.merchant.name, companyName: row.merchant.companyName, businessId: row.merchant.businessId, status: row.merchant.status }
        : null,
    };
  });
}

/** preHandler: request must have a signed-in user. */
export async function requireUser(req: FastifyRequest, _reply: FastifyReply) {
  if (!req.user) throw unauthorized();
}

/** preHandler factory: signed-in user with one of the given roles. Admins pass every check. */
export function requireRole(...roles: Role[]) {
  return async (req: FastifyRequest, _reply: FastifyReply) => {
    if (!req.user) throw unauthorized();
    if (req.user.role !== "admin" && !roles.includes(req.user.role)) throw forbidden();
  };
}

/** Returns the merchant id of a signed-in merchant user or throws. */
export function merchantIdOf(req: FastifyRequest): string {
  const id = req.user?.merchant?.id;
  if (!id) throw forbidden("not_a_merchant");
  return id;
}
