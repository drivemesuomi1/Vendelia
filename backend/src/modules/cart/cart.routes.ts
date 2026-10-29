import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { cartItemSchema } from "@vendelia/shared";
import type { AppContext } from "../../context";
import { cartService } from "./cart.service";

const quoteSchema = z.object({ items: z.array(cartItemSchema).max(20) });

export function cartRoutes(app: FastifyInstance, ctx: AppContext) {
  /** Returns current prices, VAT and availability for the items in a browser cart. */
  app.post("/api/cart/quote", async (req) => cartService.quote(ctx, quoteSchema.parse(req.body).items));
}
