import { and, asc, count, desc, eq, inArray, ne, or, sql } from "drizzle-orm";
import type { DealDetailDTO, DealInput, DealQuery, DealStatus, DealSummaryDTO, LocalizedText } from "@vendelia/shared";
import type { DbOrTx } from "../../db/client";
import { categories, cities, dealOptions, deals, merchants, orderItems, vouchers } from "../../db/schema";
import { conflict } from "../../domain/errors";

type DealRow = typeof deals.$inferSelect;
type OptionRow = typeof dealOptions.$inferSelect;

const emptyText: LocalizedText = { fi: "", sv: "", en: "" };

function toSummary(d: DealRow, merchantName: string, opts: OptionRow[]): DealSummaryDTO {
  const prices = opts.map((o) => o.priceCents);
  return {
    id: d.id,
    slug: d.slug,
    title: d.title,
    restrictions: d.restrictions,
    categoryId: d.categoryId,
    cityId: d.cityId,
    area: d.area ?? emptyText,
    imageUrl: d.imageUrl,
    vatBps: d.vatBps,
    fromPriceCents: prices.length ? Math.min(...prices) : 0,
    referencePriceCents: d.referencePriceCents,
    optionCount: opts.length,
    defaultOptionId: opts.length === 1 ? opts[0]!.id : null,
    merchantName,
  };
}

async function optionsFor(db: DbOrTx, dealIds: string[]) {
  if (!dealIds.length) return new Map<string, OptionRow[]>();
  const rows = await db.select().from(dealOptions).where(inArray(dealOptions.dealId, dealIds)).orderBy(asc(dealOptions.sort));
  const map = new Map<string, OptionRow[]>();
  for (const r of rows) map.set(r.dealId, [...(map.get(r.dealId) ?? []), r]);
  return map;
}

export const dealsRepository = {
  async listPublic(db: DbOrTx, q: DealQuery): Promise<DealSummaryDTO[]> {
    const conds = [eq(deals.status, "live"), eq(merchants.status, "active")];
    if (q.city) conds.push(eq(deals.cityId, q.city));
    if (q.category) conds.push(eq(deals.categoryId, q.category));
    if (q.featured) conds.push(eq(deals.featured, true));
    if (q.q) {
      const like = `%${q.q.replace(/[%_\\]/g, (m) => `\\${m}`)}%`;
      conds.push(
        or(
          sql`${deals.title}->>'fi' ILIKE ${like}`,
          sql`${deals.title}->>'sv' ILIKE ${like}`,
          sql`${deals.title}->>'en' ILIKE ${like}`,
          sql`${deals.area}->>'fi' ILIKE ${like}`,
          sql`${merchants.name} ILIKE ${like}`,
        )!,
      );
    }
    const rows = await db
      .select({ deal: deals, merchantName: merchants.name })
      .from(deals)
      .innerJoin(merchants, eq(merchants.id, deals.merchantId))
      .where(and(...conds))
      .orderBy(desc(deals.featured), desc(deals.createdAt));
    const opts = await optionsFor(db, rows.map((r) => r.deal.id));
    return rows.map((r) => toSummary(r.deal, r.merchantName, opts.get(r.deal.id) ?? []));
  },

  async getDetail(db: DbOrTx, where: { slug: string } | { id: string }): Promise<(DealDetailDTO & { merchantId: string }) | null> {
    const cond = "slug" in where ? eq(deals.slug, where.slug) : eq(deals.id, where.id);
    const [row] = await db
      .select({ deal: deals, merchant: merchants })
      .from(deals)
      .innerJoin(merchants, eq(merchants.id, deals.merchantId))
      .where(cond)
      .limit(1);
    if (!row) return null;
    const opts = (await optionsFor(db, [row.deal.id])).get(row.deal.id) ?? [];
    const d = row.deal;
    return {
      ...toSummary(d, row.merchant.name, opts),
      merchantId: d.merchantId,
      baseTitle: d.baseTitle,
      description: d.description,
      inclusions: d.inclusions,
      terms: d.terms,
      howTo: d.howTo,
      street: d.street,
      zip: d.zip,
      meetingPoint: d.meetingPoint,
      status: d.status,
      options: opts.map((o) => ({ id: o.id, label: o.label, priceCents: o.priceCents })),
      merchant: { name: row.merchant.name, companyName: row.merchant.companyName, businessId: row.merchant.businessId, phone: row.merchant.phone },
    };
  },

  async listByMerchant(db: DbOrTx, merchantId: string) {
    const rows = await db.select().from(deals).where(eq(deals.merchantId, merchantId)).orderBy(desc(deals.createdAt));
    const opts = await optionsFor(db, rows.map((r) => r.id));
    const sold = rows.length
      ? await db
          .select({ dealId: vouchers.dealId, n: count() })
          .from(vouchers)
          .where(and(inArray(vouchers.dealId, rows.map((r) => r.id)), ne(vouchers.status, "refunded")))
          .groupBy(vouchers.dealId)
      : [];
    const soldMap = new Map(sold.map((s) => [s.dealId, Number(s.n)]));
    return rows.map((d) => ({ deal: d, options: opts.get(d.id) ?? [], sold: soldMap.get(d.id) ?? 0 }));
  },

  async listForReview(db: DbOrTx, status?: DealStatus) {
    const rows = await db
      .select({ deal: deals, merchantName: merchants.name })
      .from(deals)
      .innerJoin(merchants, eq(merchants.id, deals.merchantId))
      .where(status ? eq(deals.status, status) : undefined)
      .orderBy(desc(deals.createdAt));
    const opts = await optionsFor(db, rows.map((r) => r.deal.id));
    return rows.map((r) => ({ ...r, options: opts.get(r.deal.id) ?? [] }));
  },

  async slugExists(db: DbOrTx, slug: string) {
    const [row] = await db.select({ id: deals.id }).from(deals).where(eq(deals.slug, slug)).limit(1);
    return Boolean(row);
  },

  async create(db: DbOrTx, merchantId: string, slug: string, input: DealInput) {
    const [d] = await db
      .insert(deals)
      .values({
        slug,
        merchantId,
        categoryId: input.categoryId,
        cityId: input.cityId,
        area: { fi: input.area, sv: input.area, en: input.area },
        street: input.street,
        zip: input.zip,
        title: input.title,
        description: input.description,
        restrictions: input.restrictions,
        inclusions: input.inclusions,
        terms: input.terms,
        howTo: input.howTo,
        vatBps: input.vatBps,
        referencePriceCents: input.referencePriceCents,
        imageUrl: input.imageUrl,
        status: "pending",
      })
      .returning();
    await db.insert(dealOptions).values(input.options.map((o, i) => ({ dealId: d!.id, label: o.label, priceCents: o.priceCents, sort: i })));
    return d!;
  },

  /** Updates a deal; existing options are updated in place, options with sales cannot be removed. */
  async update(db: DbOrTx, dealId: string, input: DealInput) {
    await db
      .update(deals)
      .set({
        categoryId: input.categoryId,
        cityId: input.cityId,
        area: { fi: input.area, sv: input.area, en: input.area },
        street: input.street,
        zip: input.zip,
        title: input.title,
        description: input.description,
        restrictions: input.restrictions,
        inclusions: input.inclusions,
        terms: input.terms,
        howTo: input.howTo,
        vatBps: input.vatBps,
        referencePriceCents: input.referencePriceCents,
        imageUrl: input.imageUrl,
        status: "pending",
        updatedAt: new Date(),
      })
      .where(eq(deals.id, dealId));

    const existing = await db.select().from(dealOptions).where(eq(dealOptions.dealId, dealId));
    const keep = new Set(input.options.map((o) => o.id).filter(Boolean));
    const removed = existing.filter((o) => !keep.has(o.id));
    if (removed.length) {
      const [used] = await db.select({ n: count() }).from(orderItems).where(inArray(orderItems.optionId, removed.map((o) => o.id)));
      if (Number(used?.n ?? 0) > 0) throw conflict("option_in_use", "Options with sales cannot be removed");
      await db.delete(dealOptions).where(inArray(dealOptions.id, removed.map((o) => o.id)));
    }
    for (const [i, o] of input.options.entries()) {
      if (o.id && existing.some((e) => e.id === o.id)) {
        await db.update(dealOptions).set({ label: o.label, priceCents: o.priceCents, sort: i }).where(eq(dealOptions.id, o.id));
      } else {
        await db.insert(dealOptions).values({ dealId, label: o.label, priceCents: o.priceCents, sort: i });
      }
    }
  },

  async setStatus(db: DbOrTx, dealId: string, status: DealStatus, reviewNote?: string) {
    await db.update(deals).set({ status, reviewNote: reviewNote ?? null, updatedAt: new Date() }).where(eq(deals.id, dealId));
  },

  async meta(db: DbOrTx) {
    const [cityRows, catRows, counts] = await Promise.all([
      db.select().from(cities).orderBy(asc(cities.sort)),
      db.select().from(categories).orderBy(asc(categories.sort)),
      db
        .select({ categoryId: deals.categoryId, n: count() })
        .from(deals)
        .innerJoin(merchants, eq(merchants.id, deals.merchantId))
        .where(and(eq(deals.status, "live"), eq(merchants.status, "active")))
        .groupBy(deals.categoryId),
    ]);
    const countMap = new Map(counts.map((c) => [c.categoryId, Number(c.n)]));
    return {
      cities: cityRows.map((c) => ({ id: c.id, name: c.name, abbr: c.abbr })),
      categories: catRows.map((c) => ({ id: c.id, name: c.name, icon: c.icon, dealCount: countMap.get(c.id) ?? 0 })),
    };
  },

  async getOptionsWithDeals(db: DbOrTx, optionIds: string[]) {
    if (!optionIds.length) return [];
    return db
      .select({ option: dealOptions, deal: deals, merchant: merchants })
      .from(dealOptions)
      .innerJoin(deals, eq(deals.id, dealOptions.dealId))
      .innerJoin(merchants, eq(merchants.id, deals.merchantId))
      .where(inArray(dealOptions.id, optionIds));
  },
};
