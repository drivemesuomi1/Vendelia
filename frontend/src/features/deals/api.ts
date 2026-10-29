import "server-only";
import type { DealDetailDTO, DealQuery, DealSummaryDTO, MetaDTO } from "@vendelia/shared";
import { FALLBACK_META } from "@/lib/fallback-meta";
import { serverApi, serverApiOrNull } from "@/lib/server-api";
import { PARTNER_DEALS, partnerDeal, partnerDeals } from "./catalogue";

/** Server-side data loaders for catalogue pages (rendered on the server for SEO). */

/** Adds categories the partner deals need and counts them in. */
function withPartnerDeals(meta: MetaDTO): MetaDTO {
  const categories = [...meta.categories];
  for (const c of FALLBACK_META.categories) {
    if (PARTNER_DEALS.some((d) => d.categoryId === c.id) && !categories.some((x) => x.id === c.id)) categories.push(c);
  }
  return {
    ...meta,
    categories: categories.map((c) => ({ ...c, dealCount: c.dealCount + PARTNER_DEALS.filter((d) => d.categoryId === c.id).length })),
  };
}

/** Never throws: without a reachable API the site falls back to built-in cities/categories and the partner deals. */
export const getMeta = () => serverApi<MetaDTO>("/api/meta").catch(() => FALLBACK_META).then(withPartnerDeals);

export async function listDeals(q: DealQuery = {}) {
  const params = new URLSearchParams();
  for (const [k, v] of Object.entries(q)) if (v !== undefined && v !== "") params.set(k, String(v));
  const partners = partnerDeals(q);
  try {
    const { deals } = await serverApi<{ deals: DealSummaryDTO[] }>(`/api/deals?${params}`);
    return [...deals, ...partners.filter((p) => !deals.some((d) => d.slug === p.slug))];
  } catch {
    return partners;
  }
}

export async function getDeal(slug: string): Promise<DealDetailDTO | null> {
  const fromApi = await serverApiOrNull<DealDetailDTO>(`/api/deals/${encodeURIComponent(slug)}`).catch(() => null);
  return fromApi ?? partnerDeal(slug);
}
