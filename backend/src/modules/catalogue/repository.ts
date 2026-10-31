import type { Sql } from "postgres";
import type { CityDTO, CategoryDTO, DealQuery } from "@vendelia/shared";
import type { DealRow } from "./types";

export class CatalogueRepository {
  constructor(private readonly sql: Sql) {}

  /** One shared visibility rule for listing, detail, counts and cart quotes. */
  private visibleDeals(filter: ReturnType<Sql>) {
    const sql = this.sql;
    return sql<DealRow[]>`
      SELECT d.id, d.slug, d.title, d.base_title, d.description, d.restrictions,
        d.inclusions, d.terms, d.how_to, d.category_id, d.city_id, d.area,
        d.service_area, d.street, d.zip, d.meeting_point, d.image_url,
        d.gallery_urls, d.vat_bps, d.reference_price_cents, purchasable.options,
        jsonb_strip_nulls(jsonb_build_object(
          'name', m.display_name, 'companyName', m.company_name,
          'businessId', m.business_id, 'phone', coalesce(m.public_phone, ''),
          'email', m.public_email, 'website', m.website
        )) AS merchant
      FROM public.deals d
      JOIN public.merchants m ON m.id = d.merchant_id AND m.status = 'active'
      JOIN public.categories c ON c.id = d.category_id AND c.active
      JOIN public.cities primary_city ON primary_city.id = d.city_id AND primary_city.active
      JOIN LATERAL (
        SELECT jsonb_agg(jsonb_build_object(
          'id', o.id, 'label', o.label, 'shortLabel', o.short_label,
          'group', o.group_label, 'priceCents', o.price_cents,
          'referencePriceCents', o.reference_price_cents
        ) ORDER BY o.sort_order, o.id) AS options
        FROM public.deal_options o WHERE o.deal_id = d.id AND o.active
      ) purchasable ON purchasable.options IS NOT NULL
      WHERE d.status = 'live' AND d.currency_code = 'EUR'
        AND EXISTS (
          SELECT 1 FROM public.deal_cities dc
          JOIN public.cities coverage ON coverage.id = dc.city_id AND coverage.active
          WHERE dc.deal_id = d.id
        )
        AND ${filter}
      ORDER BY d.featured DESC, d.created_at DESC, d.id
    `;
  }

  async meta() {
    const sql = this.sql;
    // A single statement keeps counts consistent with the returned reference rows.
    const [row] = await sql<{ cities: CityDTO[]; categories: CategoryDTO[] }[]>`
      WITH visible AS (
        SELECT d.id, d.category_id FROM public.deals d
        JOIN public.merchants m ON m.id = d.merchant_id AND m.status = 'active'
        JOIN public.categories c ON c.id = d.category_id AND c.active
        JOIN public.cities pc ON pc.id = d.city_id AND pc.active
        WHERE d.status = 'live' AND d.currency_code = 'EUR'
          AND EXISTS (SELECT 1 FROM public.deal_options o WHERE o.deal_id = d.id AND o.active)
          AND EXISTS (
            SELECT 1 FROM public.deal_cities dc
            JOIN public.cities coverage ON coverage.id = dc.city_id AND coverage.active
            WHERE dc.deal_id = d.id
          )
      )
      SELECT
        coalesce((SELECT jsonb_agg(jsonb_build_object(
          'id', c.id, 'name', c.name, 'abbr', c.abbr
        ) ORDER BY c.sort_order, c.id) FROM public.cities c WHERE c.active), '[]'::jsonb) AS cities,
        coalesce((SELECT jsonb_agg(jsonb_build_object(
          'id', c.id, 'name', c.name, 'icon', c.icon,
          'dealCount', (SELECT count(*) FROM visible v WHERE v.category_id = c.id)
        ) ORDER BY c.sort_order, c.id) FROM public.categories c WHERE c.active), '[]'::jsonb) AS categories
    `;
    return row!;
  }

  async list(query: DealQuery = {}): Promise<DealRow[]> {
    const sql = this.sql;
    const rows = await this.visibleDeals(sql`
      ${query.category ? sql`d.category_id = ${query.category}` : sql`true`}
      AND ${query.featured ? sql`d.featured` : sql`true`}
      AND ${query.city ? sql`EXISTS (
        SELECT 1 FROM public.deal_cities dc
        JOIN public.cities coverage ON coverage.id = dc.city_id AND coverage.active
        WHERE dc.deal_id = d.id AND dc.city_id = ${query.city}
      )` : sql`true`}
      AND ${query.q ? sql`position(lower(${query.q}) in lower(concat_ws(' ',
        d.title->>'fi', d.title->>'sv', d.title->>'en',
        d.description->>'fi', d.description->>'sv', d.description->>'en',
        d.restrictions->>'fi', d.restrictions->>'sv', d.restrictions->>'en',
        m.display_name, m.company_name
      ))) > 0` : sql`true`}
    `);
    return rows;
  }

  async detail(slug: string): Promise<DealRow | null> {
    const sql = this.sql;
    const [row] = await this.visibleDeals(sql`d.slug = ${slug}`);
    return row ?? null;
  }

  async findByIds(ids: string[]): Promise<DealRow[]> {
    if (!ids.length) return [];
    const sql = this.sql;
    return this.visibleDeals(sql`d.id IN ${sql(ids)}`);
  }
}
