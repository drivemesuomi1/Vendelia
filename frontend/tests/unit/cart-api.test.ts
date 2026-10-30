import { afterEach, expect, it, vi } from "vitest";
import { quoteCart } from "../../src/features/cart/api";
afterEach(() => vi.unstubAllGlobals());
const items = [{ dealId: "c1ea7a00-0000-4000-8000-000000000001",
  optionId: "c1ea7a00-0000-4000-8000-000000000101", qty: 2 }];
it("sends former partner items to the API and uses its current price", async () => {
  const result = { lines: [], totalCents: 20000, vatByRate: {}, unavailable: [] };
  const fetcher = vi.fn().mockResolvedValue(new Response(JSON.stringify(result)));
  vi.stubGlobal("fetch", fetcher);
  expect(await quoteCart(items)).toEqual(result);
  expect(fetcher).toHaveBeenCalledWith("/api/cart/quote", expect.objectContaining({
    method: "POST", body: JSON.stringify({ items }),
  }));
});
it("does not calculate a local price when the API is unavailable", async () => {
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(
    JSON.stringify({ error: "service_unavailable" }), { status: 503 },
  )));
  await expect(quoteCart(items)).rejects.toMatchObject({ status: 503, code: "service_unavailable" });
});
