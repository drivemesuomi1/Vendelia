import type { Sql } from 'postgres';
import type { AdminMerchantDTO, AdminMerchantInput, MerchantStatus } from '@vendelia/shared';

export class MerchantRepository {
  constructor(private readonly sql: Sql) {}
  async list(id: string | null = null): Promise<AdminMerchantDTO[]> {
    const rows = await this.sql`
      SELECT m.id, m.display_name AS name, m.company_name AS "companyName", m.business_id AS "businessId",
        m.contact_name AS "contactName", m.public_email AS "publicEmail", m.public_phone AS phone, m.website,
        m.city_id AS "cityId", m.category_id AS "categoryId", m.status,
        to_json(m.created_at) AS "createdAt", to_json(m.updated_at) AS "updatedAt",
        (SELECT count(*)::int FROM public.deals d WHERE d.merchant_id = m.id) AS "dealCount",
        (SELECT count(*)::int FROM public.deals d WHERE d.merchant_id = m.id AND d.status = 'live') AS "liveDealCount"
      FROM public.merchants m WHERE (${id}::uuid IS NULL OR m.id = ${id}::uuid)
      ORDER BY m.created_at DESC, m.id`;
    return rows.map(row => ({ ...row, createdAt: new Date(row.createdAt).toISOString(), updatedAt: new Date(row.updatedAt).toISOString() })) as AdminMerchantDTO[];
  }
  async create(input: AdminMerchantInput): Promise<string | null> {
    // One statement validates current reference data and writes the business atomically.
    const [row] = await this.sql`
      INSERT INTO public.merchants
        (country_code, business_id, company_name, display_name, contact_name, public_email, public_phone, city_id, category_id, status)
      SELECT 'FI', ${input.businessId}, ${input.companyName}, ${input.name}, ${input.contactName},
        ${input.publicEmail || null}, ${input.phone || null}, c.id, cat.id, ${input.status}
      FROM public.cities c CROSS JOIN public.categories cat
      WHERE c.id = ${input.cityId} AND c.active AND cat.id = ${input.categoryId} AND cat.active
      RETURNING id`;
    return row?.id ?? null;
  }
  async setStatus(id: string, status: MerchantStatus): Promise<boolean> {
    const rows = await this.sql`UPDATE public.merchants SET status = ${status}, updated_at = now() WHERE id = ${id} RETURNING id`;
    return rows.length > 0;
  }
}
