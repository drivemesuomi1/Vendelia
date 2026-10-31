import type { DealDetailDTO, DealOptionDTO, LocalizedList, LocalizedText } from "@vendelia/shared";

/** Database query result before conversion to public API responses. */
export interface DealRow {
  id: string;
  slug: string;
  title: LocalizedText;
  base_title: LocalizedText | null;
  description: LocalizedText;
  restrictions: LocalizedText;
  inclusions: LocalizedList;
  terms: LocalizedList;
  how_to: LocalizedList;
  category_id: string;
  city_id: string;
  area: LocalizedText;
  service_area: LocalizedText | null;
  street: string | null;
  zip: string | null;
  meeting_point: boolean;
  image_url: string;
  gallery_urls: string[];
  vat_bps: number;
  reference_price_cents: number | null;
  options: DealOptionDTO[];
  merchant: DealDetailDTO["merchant"];
}
