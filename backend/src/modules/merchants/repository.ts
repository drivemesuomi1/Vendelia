import type { Sql, TransactionSql } from 'postgres';
import { randomUUID } from 'node:crypto';
import { HttpProblem } from '../../errors';

export interface ProvisioningOperation {
  id: string; merchant_id: string; auth_user_id: string; login_email: string; details_hash: string;
  state: 'pending' | 'complete'; last_error: string | null;
}
import type { AdminMerchantDTO, AdminMerchantInput, MerchantStatus, MerchantDealDTO, BusinessIdMatch } from '@vendelia/shared';

export class DuplicateBusinessIdProblem extends HttpProblem {
  constructor(public readonly businesses: BusinessIdMatch[]) { super(409, 'business_id_confirmation_required'); }
}

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
  async ownDeals(merchantId: string): Promise<MerchantDealDTO[]> {
    const rows = await this.sql`
      SELECT d.id, d.slug, d.title, d.image_url AS "imageUrl", d.status, to_json(d.created_at) AS "createdAt",
        (SELECT min(o.price_cents) FROM public.deal_options o WHERE o.deal_id = d.id AND o.active) AS "fromPriceCents",
        (SELECT count(*)::int FROM public.deal_options o WHERE o.deal_id = d.id AND o.active) AS "optionCount"
      FROM public.deals d WHERE d.merchant_id = ${merchantId} ORDER BY d.created_at DESC, d.id`;
    return rows.map(row => ({ ...row, createdAt: new Date(row.createdAt).toISOString() })) as MerchantDealDTO[];
  }
  private async lock(tx: TransactionSql, businessId: string) {
    await tx`SELECT pg_advisory_xact_lock(hashtextextended(${`FI:${businessId}`}, 0))`;
  }
  private async validateReferences(tx: TransactionSql, input: AdminMerchantInput) {
    const rows = await tx`SELECT 1 FROM public.cities c CROSS JOIN public.categories cat
      WHERE c.id=${input.cityId} AND c.active AND cat.id=${input.categoryId} AND cat.active`;
    if (!rows.length) throw new HttpProblem(400, 'invalidMerchantReference');
  }
  private async confirmBusinessId(tx: TransactionSql, businessId: string, allowed: boolean) {
    if (allowed) return;
    const matches = await tx<BusinessIdMatch[]>`SELECT id, display_name AS name, company_name AS "companyName"
      FROM public.merchants WHERE country_code='FI' AND business_id=${businessId} ORDER BY created_at, id`;
    if (matches.length) throw new DuplicateBusinessIdProblem(matches);
  }
  private async insertMerchant(tx: TransactionSql, input: AdminMerchantInput, id: string) {
    await tx`INSERT INTO public.merchants
      (id, country_code, business_id, company_name, display_name, contact_name, public_email, public_phone, city_id, category_id, status)
      VALUES (${id}, 'FI', ${input.businessId}, ${input.companyName}, ${input.name}, ${input.contactName},
        ${input.publicEmail || null}, ${input.phone || null}, ${input.cityId}, ${input.categoryId}, ${input.status})`;
    return id;
  }
  async create(input: AdminMerchantInput, allowDuplicateBusinessId = false): Promise<string> {
    return this.sql.begin(async tx => {
      await this.lock(tx, input.businessId);
      await this.confirmBusinessId(tx, input.businessId, allowDuplicateBusinessId);
      await this.validateReferences(tx, input);
      return this.insertMerchant(tx, input, randomUUID());
    });
  }
  async prepareProvisioning(input: AdminMerchantInput, email: string, fingerprint: string, adminId: string, allowDuplicateBusinessId = false): Promise<ProvisioningOperation> {
    return this.sql.begin(async tx => {
      await this.lock(tx, input.businessId);
      const [current] = await tx<ProvisioningOperation[]>`SELECT * FROM public.merchant_account_provisioning WHERE details_hash=${fingerprint}`;
      if (current) return current;
      await this.confirmBusinessId(tx, input.businessId, allowDuplicateBusinessId);
      await this.validateReferences(tx, input);
      const [operation] = await tx<ProvisioningOperation[]>`INSERT INTO public.merchant_account_provisioning
        (business_id,merchant_id,auth_user_id,login_email,details_hash,created_by)
        VALUES (${input.businessId},${randomUUID()},${randomUUID()},${email},${fingerprint},${adminId}) RETURNING *`;
      return operation!;
    });
  }
  async completeProvisioning(id: string, fingerprint: string, input: AdminMerchantInput, ensureAuthUser: (operation: ProvisioningOperation) => Promise<void>, allowDuplicateBusinessId = false): Promise<string> {
    return this.sql.begin(async tx => {
      await this.lock(tx, input.businessId);
      const [operation] = await tx<ProvisioningOperation[]>`SELECT * FROM public.merchant_account_provisioning WHERE id=${id}`;
      if (!operation || operation.details_hash !== fingerprint) throw new HttpProblem(409, 'provisioningConflict');
      if (operation.state === 'complete') return operation.merchant_id;
      await this.validateReferences(tx, input);
      await this.confirmBusinessId(tx, input.businessId, allowDuplicateBusinessId);
      await ensureAuthUser(operation);
      await this.insertMerchant(tx, input, operation.merchant_id);
      await tx`INSERT INTO public.profiles(user_id,display_name,role) VALUES (${operation.auth_user_id},${input.contactName},'merchant')`;
      await tx`INSERT INTO public.merchant_members(user_id,merchant_id,member_role) VALUES (${operation.auth_user_id},${operation.merchant_id},'owner')`;
      await tx`UPDATE public.merchant_account_provisioning SET state='complete',last_error=NULL,updated_at=now() WHERE id=${id}`;
      return operation.merchant_id;
    });
  }
  async recordProvisioningError(id: string, code: string) {
    await this.sql`UPDATE public.merchant_account_provisioning SET last_error=${code},updated_at=now() WHERE id=${id} AND state='pending'`;
  }
  async setStatus(id: string, status: MerchantStatus): Promise<boolean> {
    const rows = await this.sql`UPDATE public.merchants SET status = ${status}, updated_at = now() WHERE id = ${id} RETURNING id`;
    return rows.length > 0;
  }
}
