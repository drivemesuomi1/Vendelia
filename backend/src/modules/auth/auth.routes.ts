import type { FastifyInstance, FastifyReply } from "fastify";
import { loginSchema, registerCustomerSchema } from "@vendelia/shared";
import type { AppContext } from "../../context";
import { SESSION_COOKIE } from "../../middleware/auth";
import { authService } from "./auth.service";

export function setSessionCookie(reply: FastifyReply, ctx: AppContext, session: { token: string; expiresAt: Date }) {
  reply.setCookie(SESSION_COOKIE, session.token, {
    httpOnly: true,
    sameSite: "lax",
    secure: ctx.env.NODE_ENV === "production",
    path: "/",
    expires: session.expiresAt,
  });
}

export function authRoutes(app: FastifyInstance, ctx: AppContext) {
  const strict = { config: { rateLimit: { max: 10, timeWindow: "1 minute" } } };

  app.post("/api/auth/register", strict, async (req, reply) => {
    const input = registerCustomerSchema.parse(req.body);
    setSessionCookie(reply, ctx, await authService.registerCustomer(ctx, input));
    return reply.status(201).send({ ok: true });
  });

  app.post("/api/auth/login", strict, async (req, reply) => {
    const input = loginSchema.parse(req.body);
    setSessionCookie(reply, ctx, await authService.login(ctx, input));
    return { ok: true };
  });

  app.post("/api/auth/logout", async (req, reply) => {
    await authService.logout(ctx, req.cookies[SESSION_COOKIE]);
    reply.clearCookie(SESSION_COOKIE, { path: "/" });
    return { ok: true };
  });

  app.get("/api/auth/me", async (req) => ({ user: req.user }));
}
