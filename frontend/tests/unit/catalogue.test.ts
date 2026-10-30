import { beforeEach, describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
vi.mock("@/lib/server-api", () => ({ serverApi: vi.fn(), serverApiOrNull: vi.fn() }));
import { serverApi, serverApiOrNull } from "../../src/lib/server-api";
import { getDeal, getMeta, listDeals } from "../../src/features/deals/api";

beforeEach(() => vi.resetAllMocks());
describe("database catalogue loaders", () => {
  it("uses API metadata without adding built-in cities or counts", async () => {
    const meta = { cities: [], categories: [{ id: "new-category", dealCount: 0 }] };
    vi.mocked(serverApi).mockResolvedValue(meta);
    expect(await getMeta()).toEqual(meta);
  });
  it("honors empty results and does not resurrect the former partner deal", async () => {
    vi.mocked(serverApi).mockResolvedValue({ deals: [] });
    expect(await listDeals()).toEqual([]);
    vi.mocked(serverApiOrNull).mockResolvedValue(null);
    expect(await getDeal("cleava-kotisiivous-ja-muuttosiivous")).toBeNull();
  });
  it("encodes filters, including featured=false", async () => {
    vi.mocked(serverApi).mockResolvedValue({ deals: [] });
    await listDeals({ city: "espoo", q: "home & office", featured: false });
    expect(serverApi).toHaveBeenCalledWith("/api/deals?city=espoo&q=home+%26+office&featured=false");
  });
  it("propagates outages instead of stale data or a false 404", async () => {
    const outage = new Error("service_unavailable");
    vi.mocked(serverApi).mockRejectedValue(outage);
    vi.mocked(serverApiOrNull).mockRejectedValue(outage);
    await expect(getMeta()).rejects.toThrow(outage);
    await expect(listDeals()).rejects.toThrow(outage);
    await expect(getDeal("cleava-kotisiivous-ja-muuttosiivous")).rejects.toThrow(outage);
  });
});
