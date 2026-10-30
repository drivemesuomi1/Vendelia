import assert from "node:assert/strict";
import { sql } from "../src/db/index.js";
import { buildApp } from "../src/app.js";
import type { DealDetailDTO, DealSummaryDTO, MetaDTO, CartQuoteDTO } from "@vendelia/shared";

// Read-only smoke check against the configured database. Does not seed/update rows.
const app = buildApp(sql);
try {
  for (const path of ["/api/health", "/api/meta", "/api/deals"]) {
    const response = await app.inject({ method: "GET", url: path });
    assert.equal(response.statusCode, 200, `${path} failed`);
  }
  const meta = (await app.inject("/api/meta")).json<MetaDTO>();
  const { deals } = (await app.inject("/api/deals")).json<{ deals: DealSummaryDTO[] }>();
  console.log({ cities: meta.cities.length, categories: meta.categories.length, liveDeals: deals.length });
  for (const deal of deals) {
    const response = await app.inject(`/api/deals/${encodeURIComponent(deal.slug)}`);
    assert.equal(response.statusCode, 200);
    const detail = response.json<DealDetailDTO>();
    assert.equal(detail.options.length, deal.optionCount);
    assert.ok(detail.options.length > 0);
    const option = detail.options[0]!;
    const quoted = await app.inject({
      method: "POST", url: "/api/cart/quote",
      payload: { items: [{ dealId: deal.id, optionId: option.id, qty: 2 }] },
    });
    assert.equal(quoted.statusCode, 200);
    const quote = quoted.json<CartQuoteDTO>();
    assert.equal(quote.totalCents, option.priceCents * 2);
    assert.equal(quote.unavailable.length, 0);
    console.log({ slug: deal.slug, options: detail.options.length, fromPriceCents: deal.fromPriceCents, quoteMatchesDatabase: true });
  }
} finally {
  await app.close();
}
