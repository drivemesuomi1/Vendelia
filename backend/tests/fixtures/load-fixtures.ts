import { eq } from "drizzle-orm";
import type { LocalizedList, LocalizedText } from "@vendelia/shared";
import type { Db } from "../../src/db/client";
import { dealOptions, deals, merchants, users, vouchers } from "../../src/db/schema";
import { generateToken, slugify } from "../../src/domain/codes";
import { DEFAULT_COMMISSION_BPS } from "../../src/domain/commission";
import { addDays } from "../../src/domain/dates";
import { hashToken } from "../../src/middleware/auth";
import { hashPassword } from "../../src/modules/auth/password";
import { ordersRepository } from "../../src/modules/orders/orders.repository";
import { vouchersService } from "../../src/modules/vouchers/vouchers.service";
import sample from "./sample-deals.json" with { type: "json" };

/** Test-only data: fictional merchants and deals (from the prototype), never loaded by the app. */
export const TEST_MERCHANT_EMAIL = "yritys@vendelia.test";

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

export async function loadFixtures(db: Db, opts: { password: string; customerEmail: string; now: Date }) {
  const merchantIds = new Map<string, string>();
  for (const [i, m] of sample.merchants.entries()) {
    const [row] = await db
      .insert(merchants)
      .values({ ...m, status: "active", payoutAccountMasked: `FI•• •••• •••• ${1234 + i}`, payoutVerified: true })
      .returning();
    merchantIds.set(m.businessId, row!.id);
  }

  const optionIds = new Map<string, string[]>();
  for (const d of sample.deals as SampleDeal[]) {
    const { key, businessId, options, ...rest } = d;
    const [row] = await db
      .insert(deals)
      .values({ ...rest, slug: slugify(d.title.fi), merchantId: merchantIds.get(businessId)!, status: "live" })
      .returning();
    const opts = await db
      .insert(dealOptions)
      .values(options.map((o, i) => ({ dealId: row!.id, label: o.label, priceCents: o.priceCents, sort: i })))
      .returning();
    optionIds.set(key, opts.map((o) => o.id));
  }

  await db.insert(users).values({
    email: TEST_MERCHANT_EMAIL,
    name: "Näyte Wellness",
    role: "merchant",
    merchantId: merchantIds.get("1234567-8")!,
    passwordHash: await hashPassword(opts.password),
  });
  const [customer] = await db.select().from(users).where(eq(users.email, opts.customerEmail)).limit(1);

  // Customer history: one used dinner voucher, one active massage voucher (still cancellable).
  await purchase(db, optionIds.get("d3")![0]!, customer!, addDays(opts.now, -20), addDays(opts.now, -6));
  await purchase(db, optionIds.get("d1")![0]!, customer!, addDays(opts.now, -5));
}

async function purchase(db: Db, optionId: string, customer: { id: string; email: string }, boughtAt: Date, redeemedAt?: Date) {
  const [opt] = await db.select().from(dealOptions).where(eq(dealOptions.id, optionId)).limit(1);
  const [deal] = await db.select().from(deals).where(eq(deals.id, opt!.dealId)).limit(1);
  const order = await ordersRepository.insert(
    db,
    {
      number: `VD-${200000 + Math.floor(Math.random() * 99999)}`,
      accessTokenHash: hashToken(generateToken()),
      userId: customer.id,
      email: customer.email,
      firstName: "Testi",
      lastName: "Asiakas",
      paymentMethod: "bank",
      bank: "OP",
      paymentProvider: "fixture",
      status: "paid",
      totalCents: opt!.priceCents,
      createdAt: boughtAt,
      paidAt: boughtAt,
    },
    [{ dealId: deal!.id, optionId, qty: 1, unitPriceCents: opt!.priceCents, vatBps: deal!.vatBps, commissionBps: DEFAULT_COMMISSION_BPS, titleSnapshot: deal!.title }],
  );
  const items = await ordersRepository.itemsWithMerchant(db, order.id);
  const [v] = await vouchersService.issueForOrder(db, order, items, boughtAt);
  if (redeemedAt) await db.update(vouchers).set({ status: "redeemed", redeemedAt }).where(eq(vouchers.id, v!.id));
}
