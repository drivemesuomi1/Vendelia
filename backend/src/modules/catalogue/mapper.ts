import type { DealSummaryDTO, DealDetailDTO } from "@vendelia/shared";
import type { DealRow } from "./types";

export function mapDealSummary(row: DealRow): DealSummaryDTO {
  const cheapest = row.options.reduce((best, option) => option.priceCents < best.priceCents ? option : best);
  return {
    id: row.id, slug: row.slug, title: row.title, restrictions: row.restrictions,
    categoryId: row.category_id, cityId: row.city_id, area: row.area,
    imageUrl: row.image_url, vatBps: row.vat_bps,
    fromPriceCents: cheapest.priceCents,
    referencePriceCents: cheapest.referencePriceCents ?? null,
    optionCount: row.options.length,
    defaultOptionId: row.options.length === 1 ? row.options[0]!.id : null,
    merchantName: row.merchant.name,
  };
}

export function mapDealDetail(row: DealRow): DealDetailDTO {
  return {
    ...mapDealSummary(row), referencePriceCents: row.reference_price_cents,
    baseTitle: row.base_title, description: row.description,
    inclusions: row.inclusions, terms: row.terms, howTo: row.how_to,
    street: row.street ?? "", zip: row.zip ?? "", meetingPoint: row.meeting_point,
    options: row.options.map((option) => ({ ...option, shortLabel: option.shortLabel ?? undefined })),
    merchant: row.merchant, status: "live", gallery: row.gallery_urls,
    serviceArea: row.service_area ?? undefined,
  };
}
