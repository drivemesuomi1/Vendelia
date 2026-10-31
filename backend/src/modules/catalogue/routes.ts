import type { FastifyInstance } from "fastify";
import { cartQuoteSchema, dealQuerySchema } from "@vendelia/shared";
import type { CatalogueService } from "./service";

/** HTTP parsing, validation and responses; business rules live in the service. */
export async function catalogueRoutes(app: FastifyInstance, { service }: { service: CatalogueService }) {
  app.get("/api/meta", async () => service.meta());

  app.get("/api/deals", async (request, reply) => {
    const parsed = dealQuerySchema.safeParse(request.query);
    if (!parsed.success) return reply.code(400).send({ error: "invalid_request", message: "Invalid deal filters" });
    return { deals: await service.list(parsed.data) };
  });

  app.get<{ Params: { slug: string } }>("/api/deals/:slug", async (request, reply) => {
    const deal = await service.detail(request.params.slug);
    return deal ?? reply.code(404).send({ error: "not_found", message: "Deal not found" });
  });

  app.post("/api/cart/quote", async (request, reply) => {
    const parsed = cartQuoteSchema.safeParse(request.body);
    if (!parsed.success) return reply.code(400).send({ error: "invalid_request", message: "Invalid cart items" });
    return service.quote(parsed.data.items);
  });
}
