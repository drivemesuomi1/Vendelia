import "server-only";
import type { DealDetailDTO, DealQuery, DealSummaryDTO, MetaDTO } from "@vendelia/shared";
import { FALLBACK_META } from "@/lib/fallback-meta";
import { serverApi, serverApiOrNull } from "@/lib/server-api";

/** Server-side data loaders for catalogue pages (rendered on the server for SEO). */

/** Never throws: without a reachable API the site falls back to built-in cities/categories and no deals. */
export const getMeta = () => serverApi<MetaDTO>("/api/meta").catch(() => FALLBACK_META);

export async function listDeals(q: DealQuery = {}) {
  const params = new URLSearchParams();
  for (const [k, v] of Object.entries(q)) if (v !== undefined && v !== "") params.set(k, String(v));
  try {
    const { deals } = await serverApi<{ deals: DealSummaryDTO[] }>(`/api/deals?${params}`);
    return deals;
  } catch {
    return [];
  }
}

export const getDeal = (slug: string) => serverApiOrNull<DealDetailDTO>(`/api/deals/${encodeURIComponent(slug)}`).catch(() => null);
