import type { CartItemInput, CartQuoteDTO, DealDetailDTO, DealQuery, DealSummaryDTO, MetaDTO } from "@vendelia/shared";
import type { PlatformConfig } from "../../config";
import type { CatalogueRepository } from "./repository";
import { mapDealDetail, mapDealSummary } from "./mapper";

/** Catalogue use cases and pricing rules, independent of HTTP transport. */
export class CatalogueService {
  constructor(
    private readonly repository: CatalogueRepository,
    private readonly config: PlatformConfig,
  ) {}

  async meta(): Promise<MetaDTO> {
    return { ...await this.repository.meta(), ...this.config };
  }

  async list(query: DealQuery = {}): Promise<DealSummaryDTO[]> {
    return (await this.repository.list(query)).map(mapDealSummary);
  }

  async detail(slug: string): Promise<DealDetailDTO | null> {
    const row = await this.repository.detail(slug);
    return row ? mapDealDetail(row) : null;
  }

  async quote(items: CartItemInput[]): Promise<CartQuoteDTO> {
    if (!items.length) return { lines: [], totalCents: 0, vatByRate: {}, unavailable: [] };
    const ids = [...new Set(items.map((item) => item.dealId))];
    const rows = await this.repository.findByIds(ids);
    return calculateQuote(items, rows.map(mapDealDetail));
  }
}

/** Uses current database prices; client-supplied prices are never inputs. */
function calculateQuote(items: CartItemInput[], deals: DealDetailDTO[]): CartQuoteDTO {
  const result: CartQuoteDTO = { lines: [], totalCents: 0, vatByRate: {}, unavailable: [] };
  const byId = new Map(deals.map((deal) => [deal.id, deal]));
  for (const item of items) {
    const deal = byId.get(item.dealId);
    const option = deal?.options.find((option) => option.id === item.optionId);
    if (!deal || !option) { result.unavailable.push(item); continue; }
    const totalCents = option.priceCents * item.qty;
    result.lines.push({
      dealId: deal.id, optionId: option.id, qty: item.qty,
      unitPriceCents: option.priceCents, totalCents, vatBps: deal.vatBps,
      title: deal.title, baseTitle: deal.baseTitle, optionLabel: option.label,
      merchantName: deal.merchantName, slug: deal.slug, imageUrl: deal.imageUrl,
    });
    result.totalCents += totalCents;
    result.vatByRate[deal.vatBps] = (result.vatByRate[deal.vatBps] ?? 0)
      + Math.round(totalCents * deal.vatBps / (10000 + deal.vatBps));
  }
  return result;
}
