import { describe, expect, it } from "vitest";
import { PARTNER_DEALS, partnerDeal, partnerDeals, partnerQuote } from "../../src/features/deals/catalogue";

const deal = PARTNER_DEALS[0]!;
const option = (label: string) => deal.options.find((o) => o.label!.fi.includes(label))!;

describe("partner catalogue", () => {
  it("prices the cart as unit price × quantity", () => {
    const o = option("61–80");
    const q = partnerQuote([{ dealId: deal.id, optionId: o.id, qty: 2 }]);
    expect(q.totalCents).toBe(59800);
    expect(q.lines[0]!.totalCents).toBe(59800);
  });

  it("includes VAT inside the price, not on top", () => {
    const o = option("3 h");
    const q = partnerQuote([{ dealId: deal.id, optionId: o.id, qty: 3 }]);
    expect(q.totalCents).toBe(8900 * 3);
    expect(q.vatByRate["2550"]).toBe(Math.round((8900 * 3 * 2550) / 12550));
  });

  it("sums several lines and flags unknown options", () => {
    const q = partnerQuote([
      { dealId: deal.id, optionId: option("3 h").id, qty: 1 },
      { dealId: deal.id, optionId: option("8 h").id, qty: 2 },
      { dealId: deal.id, optionId: "00000000-0000-4000-8000-000000000000", qty: 1 },
    ]);
    expect(q.totalCents).toBe(8900 + 23900 * 2);
    expect(q.unavailable).toHaveLength(1);
  });

  it("every discounted option has a lower price than its reference", () => {
    for (const o of deal.options) if (o.referencePriceCents) expect(o.priceCents).toBeLessThan(o.referencePriceCents);
  });

  it("is found by slug, city filter and search", () => {
    expect(partnerDeal(deal.slug)?.id).toBe(deal.id);
    expect(partnerDeals({ city: "espoo" })).toHaveLength(1);
    expect(partnerDeals({ q: "muuttosiivous" })).toHaveLength(1);
    expect(partnerDeals({ category: "food" })).toHaveLength(0);
  });
});
