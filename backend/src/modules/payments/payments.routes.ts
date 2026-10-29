import type { FastifyInstance } from "fastify";
import { z } from "zod";
import type { AppContext } from "../../context";
import { AppError, forbidden, notFound } from "../../domain/errors";
import { hashToken } from "../../middleware/auth";
import { ordersRepository } from "../orders/orders.repository";
import { ordersService } from "../orders/orders.service";

const idParam = z.object({ orderId: z.string().uuid() });

export function paymentsRoutes(app: FastifyInstance, ctx: AppContext) {
  /**
   * Mock provider only: simulates the provider's "payment succeeded" callback.
   * Requires the order's access token so nobody can confirm someone else's order.
   */
  app.post("/api/payments/:orderId/mock-confirm", async (req) => {
    if (ctx.payments.name !== "mock") throw notFound();
    const { orderId } = idParam.parse(req.params);
    const order = await ordersRepository.byId(ctx.db, orderId);
    if (!order) throw notFound("order_not_found");
    const token = req.headers["x-order-token"];
    if (typeof token !== "string" || hashToken(token) !== order.accessTokenHash) throw forbidden();
    await ordersService.markPaid(ctx, orderId);
    return { ok: true };
  });

  /** Real provider webhooks land here (signature verification + ordersService.markPaid). */
  app.post("/api/payments/webhook", async () => {
    throw new AppError(501, "not_implemented", "Payment provider webhooks arrive with the Stripe adapter");
  });
}
