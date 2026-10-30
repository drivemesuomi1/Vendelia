import "server-only";
import { cache } from "react";
import type { DealDetailDTO, DealQuery, DealSummaryDTO, MetaDTO } from "@vendelia/shared";
import { serverApi, serverApiOrNull } from "@/lib/server-api";

/** Database-backed catalogue loaders. Outages propagate to the error boundary. */
export const getMeta = cache(() => serverApi<MetaDTO>("/api/meta"));

export async function listDeals(q: DealQuery = {}) {
  const params = new URLSearchParams();
  for (const [k, v] of Object.entries(q)) if (v !== undefined && v !== "") params.set(k, String(v));
  const { deals } = await serverApi<{ deals: DealSummaryDTO[] }>(`/api/deals?${params}`);
  return deals;
}

export const getDeal = cache((slug: string): Promise<DealDetailDTO | null> =>
  serverApiOrNull<DealDetailDTO>(`/api/deals/${encodeURIComponent(slug)}`));
