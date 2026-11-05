import { randomBytes } from 'node:crypto';
import type { Sql, TransactionSql } from 'postgres';
import type { AdminDealDTO, DealInput, DealRecordDTO, DealStatus, MerchantDealCardDTO } from '@vendelia/shared';
import { HttpProblem } from '../../errors';

const iso = (value: unknown) => (value ? new Date(value as string).toISOString() : null);
// The shared client is wrapped by Drizzle, which turns off postgres.js json and date serialization,
// so JSON and timestamps go in as text (as in orders/service.ts).
const json = (value: unknown) => JSON.stringify(value);

/** URL slug from the Finnish title, with a short random suffix so two businesses can use the same title. */
export function slugFor(title: string) {
  const base = title
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
    .slice(0, 60).replace(/-+$/g, '');
  const suffix = randomBytes(3).toString('hex');
  return base ? `${base}-${suffix}` : `deal-${suffix}`;
}

/** Photos after the cover in display order, without repeats or the cover itself. */
function galleryOf(input: DealInput) {
  return [...new Set(input.galleryUrls)].filter(url => url !== input.imageUrl);
}

type Option = DealInput['options'][number];

/**
 * How one submitted option is stored. `short_label` is the option's own name (its tile, e.g. "3 h");
 * `label` is the full name used in the cart and on vouchers, which includes the section ("Home cleaning: 3 h").
 */
function optionColumns(option: Option) {
  const { label, group } = option;
  const join = (a: string, b: string) => (a && b ? `${a}: ${b}` : '');
  const full = label && group
    ? { fi: join(group.fi, label.fi), sv: join(group.sv, label.sv), en: join(group.en, label.en) }
    : label;
  return {
    label: full ? json(full) : null, short_label: option.label ? json(option.label) : null,
    group_label: option.group ? json(option.group) : null,
    price_cents: option.priceCents, reference_price_cents: option.referencePriceCents,
  };
}

interface DealRow {
  id: string; slug: string; status: DealStatus; review_note: string | null;
  submitted_at: string | null; reviewed_at: string | null; created_at: string;
  title: DealInput['title']; description: DealInput['description']; restrictions: DealInput['restrictions'];
  inclusions: DealInput['inclusions']; terms: DealInput['terms']; how_to: DealInput['howTo'];
  category_id: string; city_id: string; area: { fi?: string } | null; street: string | null; zip: string | null;
  vat_bps: number; reference_price_cents: number | null; image_url: string; gallery_urls: string[] | null;
  options: { id: string; label: Option['label']; group: Option['group']; priceCents: number; referencePriceCents: number | null }[];
  merchant_id: string; merchant_name: string; merchant_status: AdminDealDTO['merchantStatus'];
}

const empty = { fi: '', sv: '', en: '' };
const emptyList = { fi: [], sv: [], en: [] };

function toRecord(row: DealRow): DealRecordDTO {
  return {
    id: row.id, slug: row.slug, status: row.status, reviewNote: row.review_note,
    submittedAt: iso(row.submitted_at), reviewedAt: iso(row.reviewed_at), createdAt: iso(row.created_at)!,
    input: {
      title: row.title, description: row.description, restrictions: row.restrictions ?? empty,
      inclusions: row.inclusions ?? emptyList, terms: row.terms ?? emptyList, howTo: row.how_to ?? emptyList,
      categoryId: row.category_id, cityId: row.city_id, area: row.area?.fi ?? '',
      street: row.street ?? '', zip: row.zip ?? '', vatBps: row.vat_bps,
      referencePriceCents: row.reference_price_cents, imageUrl: row.image_url, galleryUrls: row.gallery_urls ?? [],
      options: row.options.map(o => ({ id: o.id, label: o.label, group: o.group, priceCents: o.priceCents, referencePriceCents: o.referencePriceCents })),
    },
  };
}

/** Deals as businesses submit them and admins review them. Ownership always comes from the caller's session. */
export class DealRepository {
  constructor(private readonly sql: Sql) {}

  private select(where: ReturnType<Sql>) {
    return this.sql<DealRow[]>`
      SELECT d.id, d.slug, d.status, d.review_note, d.submitted_at, d.reviewed_at, d.created_at,
        d.title, d.description, d.restrictions, d.inclusions, d.terms, d.how_to, d.category_id, d.city_id,
        d.area, d.street, d.zip, d.vat_bps, d.reference_price_cents, d.image_url, d.gallery_urls,
        d.merchant_id, m.display_name AS merchant_name, m.status AS merchant_status,
        coalesce((SELECT jsonb_agg(jsonb_build_object('id', o.id, 'label', coalesce(o.short_label, o.label), 'group', o.group_label,
          'priceCents', o.price_cents, 'referencePriceCents', o.reference_price_cents)
          ORDER BY o.sort_order, o.id) FROM public.deal_options o WHERE o.deal_id = d.id AND o.active), '[]'::jsonb) AS options
      FROM public.deals d JOIN public.merchants m ON m.id = d.merchant_id
      WHERE ${where}`;
  }

  async ownCards(merchantId: string): Promise<MerchantDealCardDTO[]> {
    const rows = await this.sql`
      SELECT d.id, d.slug, d.title, d.image_url AS "imageUrl", d.status, d.vat_bps AS "vatBps", to_json(d.created_at) AS "createdAt",
        d.review_note AS "reviewNote", to_json(d.submitted_at) AS "submittedAt", to_json(d.reviewed_at) AS "reviewedAt",
        (SELECT min(o.price_cents) FROM public.deal_options o WHERE o.deal_id = d.id AND o.active) AS "fromPriceCents",
        (SELECT count(*)::int FROM public.deal_options o WHERE o.deal_id = d.id AND o.active) AS "optionCount"
      FROM public.deals d WHERE d.merchant_id = ${merchantId}
      ORDER BY coalesce(d.submitted_at, d.created_at) DESC, d.id`;
    return rows.map(r => ({ ...r, createdAt: iso(r.createdAt)!, submittedAt: iso(r.submittedAt), reviewedAt: iso(r.reviewedAt) })) as MerchantDealCardDTO[];
  }

  async own(merchantId: string, id: string): Promise<DealRecordDTO | null> {
    const [row] = await this.select(this.sql`d.id = ${id} AND d.merchant_id = ${merchantId}`);
    return row ? toRecord(row) : null;
  }

  private async checkReferences(tx: TransactionSql, input: DealInput) {
    const ok = await tx`SELECT 1 FROM public.categories c CROSS JOIN public.cities ci
      WHERE c.id = ${input.categoryId} AND c.active AND ci.id = ${input.cityId} AND ci.active`;
    if (!ok.length) throw new HttpProblem(400, 'invalidDealReference');
  }

  private async addOption(tx: TransactionSql, dealId: string, option: Option, sortOrder: number) {
    const [created] = await tx<{ id: string }[]>`
      INSERT INTO public.deal_options ${tx({ deal_id: dealId, ...optionColumns(option), sort_order: sortOrder, active: true })} RETURNING id`;
    await this.recordPrice(tx, created!.id, option.priceCents);
  }

  /** Every price a customer can see is logged, so "was" prices can be checked later. */
  private recordPrice(tx: TransactionSql, optionId: string, priceCents: number) {
    return tx`INSERT INTO public.deal_option_price_history (option_id, price_cents, effective_at, source)
      VALUES (${optionId}, ${priceCents}, now(), 'platform')`;
  }

  /** A text[] built from JSON text (the Drizzle-wrapped client cannot infer array parameter types); order is kept. */
  private textArray(values: string[]) {
    return this.sql`ARRAY(SELECT e FROM jsonb_array_elements_text(${json(values)}::jsonb) WITH ORDINALITY AS t(e, n) ORDER BY n)`;
  }

  private fields(input: DealInput) {
    return {
      category_id: input.categoryId, city_id: input.cityId,
      title: json(input.title), description: json(input.description), restrictions: json(input.restrictions),
      inclusions: json(input.inclusions), terms: json(input.terms), how_to: json(input.howTo),
      area: json({ fi: input.area, sv: '', en: '' }), street: input.street, zip: input.zip,
      vat_bps: input.vatBps, reference_price_cents: input.referencePriceCents, image_url: input.imageUrl,
      gallery_urls: this.textArray(galleryOf(input)),
    };
  }

  /** New deals always start in review. */
  async create(merchantId: string, input: DealInput): Promise<{ id: string; slug: string; status: DealStatus }> {
    return this.sql.begin(async tx => {
      await this.checkReferences(tx, input);
      const slug = slugFor(input.title.fi);
      const values = { ...this.fields(input), merchant_id: merchantId, slug, status: 'pending', submitted_at: new Date().toISOString() };
      const [deal] = await tx<{ id: string }[]>`
        INSERT INTO public.deals ${tx(values)} RETURNING id`;
      await tx`INSERT INTO public.deal_cities (deal_id, city_id) VALUES (${deal!.id}, ${input.cityId})`;
      for (const [i, option] of input.options.entries()) await this.addOption(tx, deal!.id, option, i);
      return { id: deal!.id, slug, status: 'pending' as const };
    });
  }

  /** Any edit sends the deal back to review (a live deal leaves the site until approved again). */
  async update(merchantId: string, id: string, input: DealInput): Promise<{ id: string; slug: string; status: DealStatus }> {
    return this.sql.begin(async tx => {
      const [deal] = await tx<{ id: string; slug: string }[]>`
        SELECT id, slug FROM public.deals WHERE id = ${id} AND merchant_id = ${merchantId} FOR UPDATE`;
      if (!deal) throw new HttpProblem(404, 'deal_not_found');
      await this.checkReferences(tx, input);
      await tx`UPDATE public.deals SET ${tx(this.fields(input))}, status = 'pending', review_note = NULL,
        submitted_at = now(), updated_at = now() WHERE id = ${id}`;
      await tx`INSERT INTO public.deal_cities (deal_id, city_id) VALUES (${id}, ${input.cityId}) ON CONFLICT DO NOTHING`;

      const existing = new Map((await tx<{ id: string; price_cents: number }[]>`
        SELECT id, price_cents FROM public.deal_options WHERE deal_id = ${id}`).map(o => [o.id, o.price_cents]));
      const kept = new Set<string>();
      for (const [i, option] of input.options.entries()) {
        const current = option.id ? existing.get(option.id) : undefined;
        if (option.id && current !== undefined) {
          kept.add(option.id);
          await tx`UPDATE public.deal_options SET ${tx({ ...optionColumns(option), sort_order: i, active: true })},
            updated_at = now() WHERE id = ${option.id}`;
          if (current !== option.priceCents) await this.recordPrice(tx, option.id, option.priceCents);
        } else {
          await this.addOption(tx, id, option, i);
        }
      }
      // Removed options are only switched off, so vouchers already sold keep pointing at them.
      const removed = [...existing.keys()].filter(optionId => !kept.has(optionId));
      if (removed.length) await tx`UPDATE public.deal_options SET active = false, updated_at = now() WHERE id IN ${tx(removed)}`;
      return { id, slug: deal.slug, status: 'pending' as const };
    });
  }

  async adminList(status: DealStatus | null, merchantId: string | null = null): Promise<AdminDealDTO[]> {
    const rows = await this.select(this.sql`${status ? this.sql`d.status = ${status}` : this.sql`true`}
      AND ${merchantId ? this.sql`d.merchant_id = ${merchantId}` : this.sql`true`}`);
    return rows.map(row => ({ ...toRecord(row), merchantId: row.merchant_id, merchantName: row.merchant_name, merchantStatus: row.merchant_status }))
      .sort((a, b) => Number(b.status === 'pending') - Number(a.status === 'pending')
        || (b.submittedAt ?? b.createdAt).localeCompare(a.submittedAt ?? a.createdAt));
  }

  async adminGet(id: string): Promise<AdminDealDTO | null> {
    const [row] = await this.select(this.sql`d.id = ${id}`);
    return row ? { ...toRecord(row), merchantId: row.merchant_id, merchantName: row.merchant_name, merchantStatus: row.merchant_status } : null;
  }

  /** Approve puts a pending/rejected deal live; reject sends a pending or live deal back. Either can carry a comment for the business. */
  async review(id: string, decision: 'approve' | 'reject', note: string | null, adminId: string) {
    const from = decision === 'approve' ? ['pending', 'rejected'] : ['pending', 'live'];
    const [row] = await this.sql<{ id: string; status: DealStatus }[]>`
      UPDATE public.deals SET status = ${decision === 'approve' ? 'live' : 'rejected'},
        review_note = ${note}, reviewed_at = now(), reviewed_by = ${adminId}, updated_at = now()
      WHERE id = ${id} AND status IN ${this.sql(from)} RETURNING id, status`;
    if (row) return row;
    const exists = await this.sql`SELECT 1 FROM public.deals WHERE id = ${id}`;
    throw new HttpProblem(exists.length ? 409 : 404, exists.length ? 'invalidTransition' : 'deal_not_found');
  }

}
