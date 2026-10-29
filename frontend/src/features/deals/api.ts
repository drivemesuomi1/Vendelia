import "server-only";
import type { DealDetailDTO, DealQuery, DealSummaryDTO, MetaDTO } from "@vendelia/shared";
import { serverApi, serverApiOrNull } from "@/lib/server-api";

/** Server-side data loaders for catalogue pages (rendered on the server for SEO). */

export const getMeta = () => serverApi<MetaDTO>("/api/meta");

export async function listDeals(q: DealQuery = {}) {
  const params = new URLSearchParams();
  for (const [k, v] of Object.entries(q)) if (v !== undefined && v !== "") params.set(k, String(v));
  const { deals } = await serverApi<{ deals: DealSummaryDTO[] }>(`/api/deals?${params}`);
  return deals;
}

export const getDeal = (slug: string) => serverApiOrNull<DealDetailDTO>(`/api/deals/${encodeURIComponent(slug)}`);
