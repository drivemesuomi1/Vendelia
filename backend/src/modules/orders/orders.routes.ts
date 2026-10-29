import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { checkoutSchema, localeSchema } from "@vendelia/shared";
import type { AppContext } from "../../context";
import { ordersService } from "./orders.service";

const idParam = z.object({ id: z.string().uuid() });

export function ordersRoutes(app: FastifyInstance, ctx: AppContext) {
  app.post("/api/orders", { config: { rateLimit: { max: 20, timeWindow: "1 minute" } } }, async (req, reply) => {
    const input = checkoutSchema.parse(req.body);
    const locale = localeSchema.catch("fi").parse(req.headers["x-locale"]);
    return reply.status(201).send(await ordersService.create(ctx, req.user, input, locale));
  });

  /** Guests pass the access token returned at checkout in the X-Order-Token header. */
  app.get("/api/orders/:id", async (req) => {
    const token = req.headers["x-order-token"];
    return ordersService.get(ctx, idParam.parse(req.params).id, typeof token === "string" ? token : undefined, req.user);
  });
}
