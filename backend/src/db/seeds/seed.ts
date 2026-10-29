import { count, eq } from "drizzle-orm";
import type { LocalizedList, LocalizedText } from "@vendelia/shared";
import type { Db } from "../client";
import { categories, cities, dealOptions, deals, merchants, settings, users, vouchers } from "../schema";
import { generateToken } from "../../domain/codes";
import { addDays } from "../../domain/dates";
import { DEFAULT_COMMISSION_BPS } from "../../domain/commission";
import { hashPassword } from "../../modules/auth/password";
import { hashToken } from "../../middleware/auth";
import { ordersRepository } from "../../modules/orders/orders.repository";
import { vouchersService } from "../../modules/vouchers/vouchers.service";
import sample from "./sample-deals.json" with { type: "json" };

/** Local demo accounts. All use DEMO_PASSWORD (see backend/.env.example). Never seed these in production. */
export const DEMO_ACCOUNTS = {
  admin: "admin@vendelia.test",
  merchant: "yritys@vendelia.test",
  customer: "asiakas@vendelia.test",
} as const;

const CITIES = [
  { id: "helsinki", abbr: "HKI", name: { fi: "Helsinki", sv: "Helsingfors", en: "Helsinki" } },
  { id: "espoo", abbr: "ESP", name: { fi: "Espoo", sv: "Esbo", en: "Espoo" } },
  { id: "vantaa", abbr: "VAN", name: { fi: "Vantaa", sv: "Vanda", en: "Vantaa" } },
  { id: "kauniainen", abbr: "KAU", name: { fi: "Kauniainen", sv: "Grankulla", en: "Kauniainen" } },
];

const CATEGORIES = [
  { id: "wellness", icon: "spa", name: { fi: "Hyvinvointi ja kauneus", sv: "Välmående och skönhet", en: "Wellness & beauty" } },
  { id: "food", icon: "food", name: { fi: "Ruoka ja juoma", sv: "Mat och dryck", en: "Food & drink" } },
  { id: "activities", icon: "compass", name: { fi: "Tekeminen", sv: "Aktiviteter", en: "Activities" } },
];

interface SampleDeal {
  key: string;
  businessId: string;
  categoryId: string;
  cityId: string;
  area: LocalizedText;
  street: string;
  zip: string;
  meetingPoint: boolean;
  title: LocalizedText;
  baseTitle: LocalizedText | null;
  description: LocalizedText;
  restrictions: LocalizedText;
  inclusions: LocalizedList;
  terms: LocalizedList;
  howTo: LocalizedList;
  vatBps: number;
  referencePriceCents: number | null;
  imageUrl: string;
  featured: boolean;
  options: { label: LocalizedText | null; priceCents: number }[];
}

/** Idempotent: does nothing if the database already has cities. */
export async function seedDatabase(db: Db, opts: { demoPassword: string; now?: Date }) {
  const [existing] = await db.select({ n: count() }).from(cities);
  if (Number(existing?.n ?? 0) > 0) return { seeded: false };
  const now = opts.now ?? new Date();

  await db.insert(cities).values(CITIES.map((c, i) => ({ ...c, sort: i })));
  await db.insert(categories).values(CATEGORIES.map((c, i) => ({ ...c, sort: i })));
  await db.insert(settings).values({ key: "commission_bps", value: DEFAULT_COMMISSION_BPS });

  const merchantIds = new Map<string, string>();
  for (const [i, m] of sample.merchants.entries()) {
    const [row] = await db
      .insert(merchants)
      .values({ ...m, status: "active", payoutAccountMasked: `FI•• •••• •••• ${String(1234 + i)}`, payoutVerified: true })
      .returning();
    merchantIds.set(m.businessId, row!.id);
  }

  const optionIds = new Map<string, string[]>();
  for (const d of sample.deals as SampleDeal[]) {
    const { key, businessId, options, ...rest } = d;
    const [row] = await db
      .insert(deals)
      .values({ ...rest, slug: slugFor(d), merchantId: merchantIds.get(businessId)!, status: "live" })
      .returning();
    const opts = await db
      .insert(dealOptions)
      .values(options.map((o, i) => ({ dealId: row!.id, label: o.label, priceCents: o.priceCents, sort: i })))
      .returning();
    optionIds.set(key, opts.map((o) => o.id));
  }

  const passwordHash = await hashPassword(opts.demoPassword);
  const firstMerchant = merchantIds.get("1234567-8")!;
  await db.insert(users).values({ email: DEMO_ACCOUNTS.admin, name: "Vendelia Admin", role: "admin", passwordHash });
  await db.insert(users).values({ email: DEMO_ACCOUNTS.merchant, name: "Näyte Wellness", role: "merchant", merchantId: firstMerchant, passwordHash });
  const [customer] = await db.insert(users).values({ email: DEMO_ACCOUNTS.customer, name: "Asiakas Esimerkki", role: "customer", passwordHash }).returning();

  // Purchase history for the demo customer: one used dinner voucher, one active massage voucher.
  await seedPurchase(db, { userId: customer!.id, email: DEMO_ACCOUNTS.customer, dealKey: "d3", optionIndex: 0, boughtAt: addDays(now, -20), redeemedAt: addDays(now, -6) }, optionIds);
  await seedPurchase(db, { userId: customer!.id, email: DEMO_ACCOUNTS.customer, dealKey: "d1", optionIndex: 0, boughtAt: addDays(now, -5) }, optionIds);
  return { seeded: true };
}

function slugFor(d: SampleDeal) {
  return d.title.fi
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

async function seedPurchase(
  db: Db,
  p: { userId: string; email: string; dealKey: string; optionIndex: number; boughtAt: Date; redeemedAt?: Date },
  optionIds: Map<string, string[]>,
) {
  const optionId = optionIds.get(p.dealKey)![p.optionIndex]!;
  const [opt] = await db.select().from(dealOptions).where(eq(dealOptions.id, optionId)).limit(1);
  const [deal] = await db.select().from(deals).where(eq(deals.id, opt!.dealId)).limit(1);
  const order = await ordersRepository.insert(
    db,
    {
      number: `VD-${200000 + Math.floor(Math.random() * 99999)}`,
      accessTokenHash: hashToken(generateToken()),
      userId: p.userId,
      email: p.email,
      firstName: "Asiakas",
      lastName: "Esimerkki",
      paymentMethod: "bank",
      bank: "OP",
      paymentProvider: "seed",
      status: "paid",
      totalCents: opt!.priceCents,
      createdAt: p.boughtAt,
      paidAt: p.boughtAt,
    },
    [{ dealId: deal!.id, optionId, qty: 1, unitPriceCents: opt!.priceCents, vatBps: deal!.vatBps, commissionBps: DEFAULT_COMMISSION_BPS, titleSnapshot: deal!.title }],
  );
  const items = await ordersRepository.itemsWithMerchant(db, order.id);
  const [v] = await vouchersService.issueForOrder(db, order, items, p.boughtAt);
  if (p.redeemedAt) {
    await db.update(vouchers).set({ status: "redeemed", redeemedAt: p.redeemedAt }).where(eq(vouchers.id, v!.id));
  }
}
