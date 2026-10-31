import type { AdminDealRowDTO, AdminMerchantRowDTO, AdminRefundRowDTO, DealStatus, LocalizedText } from "@vendelia/shared";

/**
 * DEMO DATA for the admin portal while the admin API does not exist yet.
 * Deterministic (seeded) so the server and browser render the same numbers. Replace each use with a real
 * `/api/admin/*` call once the backend provides it; nothing here is written to the database.
 */

export const DEMO_DAYS = 180;

function rng(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const T = (fi: string, sv: string, en: string): LocalizedText => ({ fi, sv, en });

export interface DemoMerchant {
  id: string;
  name: string;
  companyName: string;
  businessId: string;
  email: string;
  cityId: string;
  status: "active" | "pending" | "suspended";
  joinedDaysAgo: number;
}

export interface DemoDeal {
  id: string;
  slug: string;
  title: LocalizedText;
  merchantId: string;
  categoryId: string;
  cityId: string;
  status: DealStatus;
  priceCents: number;
  vatBps: number;
  /** Average vouchers sold per day at full popularity. */
  rate: number;
  /** How many days ago the deal went live (sales only after that). */
  liveDaysAgo: number;
}

const M = (id: string, name: string, cityId: string, status: DemoMerchant["status"], joinedDaysAgo: number, n: number): DemoMerchant => ({
  id,
  name,
  companyName: `${name} Oy`,
  businessId: `${3100000 + n * 7919}-${n % 10}`,
  email: `info@${name.toLowerCase().replace(/[^a-z]/g, "")}.fi`,
  cityId,
  status,
  joinedDaysAgo,
});

export const DEMO_MERCHANTS: DemoMerchant[] = [
  M("m01", "Cleava", "helsinki", "active", 175, 1),
  M("m02", "Ravintola Sävy", "helsinki", "active", 172, 2),
  M("m03", "Kampaamo Lumo", "espoo", "active", 168, 3),
  M("m04", "Sauna Löyly", "helsinki", "active", 160, 4),
  M("m05", "Hieronta Kide", "vantaa", "active", 150, 5),
  M("m06", "Sushi Kaiku", "espoo", "active", 140, 6),
  M("m07", "Kuljetus Nova", "vantaa", "active", 130, 7),
  M("m08", "Ikkunapesu Kirkas", "espoo", "active", 120, 8),
  M("m09", "Kynsistudio Helmi", "helsinki", "active", 110, 9),
  M("m10", "Bistro Ranta", "kauniainen", "active", 95, 10),
  M("m11", "Spa Aalto", "espoo", "active", 80, 11),
  M("m12", "Ripset & Kulmat", "vantaa", "active", 60, 12),
  M("m13", "Chauffeur Elite", "helsinki", "active", 45, 13),
  M("m14", "Muuttosiivous Puhdas", "vantaa", "suspended", 100, 14),
  M("m15", "Pizzeria Fuoco", "vantaa", "pending", 3, 15),
  M("m16", "Joogastudio Vire", "kauniainen", "pending", 2, 16),
  M("m17", "Kauneushoitola Siro", "kauniainen", "active", 20, 17),
  M("m18", "Burger Kulma", "helsinki", "active", 25, 18),
];

const D = (
  n: number,
  merchantId: string,
  categoryId: string,
  cityId: string,
  title: LocalizedText,
  priceCents: number,
  vatBps: number,
  rate: number,
  liveDaysAgo: number,
  status: DealStatus = "live",
): DemoDeal => ({
  id: `d${String(n).padStart(2, "0")}`,
  slug: title.en.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""),
  title,
  merchantId,
  categoryId,
  cityId,
  status,
  priceCents,
  vatBps,
  rate,
  liveDaysAgo,
});

export const DEMO_DEALS: DemoDeal[] = [
  D(1, "m01", "cleaning", "helsinki", T("Kotisiivous 3–8 h", "Hemstädning 3–8 h", "Home cleaning 3–8 h"), 8900, 2550, 3.2, 175),
  D(2, "m02", "food", "helsinki", T("Kolmen ruokalajin illallinen kahdelle", "Trerättersmiddag för två", "Three-course dinner for two"), 7900, 1400, 4.1, 172),
  D(3, "m03", "beauty", "espoo", T("Hiustenleikkaus ja hoito", "Klippning och behandling", "Haircut and treatment"), 4900, 2550, 2.6, 168),
  D(4, "m04", "wellness", "helsinki", T("Saunapäivä kahdelle", "Bastudag för två", "Sauna day for two"), 2400, 1000, 5.3, 160),
  D(5, "m05", "wellness", "vantaa", T("Klassinen hieronta 60 min", "Klassisk massage 60 min", "Classic massage 60 min"), 5500, 2550, 2.2, 150),
  D(6, "m06", "food", "espoo", T("Sushibuffet-lounas", "Sushibuffé lunch", "Sushi buffet lunch"), 2290, 1400, 4.8, 140),
  D(7, "m07", "chauffeur", "vantaa", T("Lentokenttäkuljetus", "Flygplatstransfer", "Airport transfer"), 6900, 1400, 1.7, 130),
  D(8, "m08", "cleaning", "espoo", T("Ikkunanpesu omakotitaloon", "Fönstertvätt för egnahemshus", "Window cleaning for a house"), 9900, 2550, 1.4, 120),
  D(9, "m09", "beauty", "helsinki", T("Geelikynnet", "Gelénaglar", "Gel nails"), 3900, 2550, 2.9, 110),
  D(10, "m10", "food", "kauniainen", T("Viikonloppubrunssi", "Helgbrunch", "Weekend brunch"), 3200, 1400, 2.4, 95),
  D(11, "m11", "wellness", "espoo", T("Pariskunnan spa-päivä", "Spadag för par", "Couples spa day"), 11900, 2550, 1.1, 80),
  D(12, "m12", "beauty", "vantaa", T("Ripsien kestotaivutus", "Fransböjning", "Lash lift"), 4500, 2550, 1.9, 60),
  D(13, "m13", "chauffeur", "helsinki", T("Kaupunkikierros autonkuljettajalla", "Stadstur med chaufför", "City tour with a chauffeur"), 14900, 1400, 0.6, 45),
  D(14, "m14", "cleaning", "vantaa", T("Muuttosiivous", "Flyttstädning", "Move-out cleaning"), 19900, 2550, 0.5, 100, "draft"),
  D(15, "m15", "food", "vantaa", T("Pizza ja juomat kahdelle", "Pizza och dryck för två", "Pizza and drinks for two"), 2990, 1400, 0, 0, "pending"),
  D(16, "m16", "wellness", "kauniainen", T("Joogakortti 10 kertaa", "Yogakort 10 gånger", "Yoga card, 10 classes"), 9900, 1000, 0, 0, "pending"),
  D(17, "m17", "beauty", "kauniainen", T("Kasvohoito 75 min", "Ansiktsbehandling 75 min", "Facial 75 min"), 6900, 2550, 0, 0, "pending"),
  D(18, "m18", "food", "helsinki", T("Hampurilaisateria kahdelle", "Hamburgermeny för två", "Burger meal for two"), 2590, 1400, 0, 0, "rejected"),
];

export interface DemoOrder {
  number: string;
  minutesAgo: number;
  email: string;
  dealId: string;
  qty: number;
  totalCents: number;
  method: "card" | "mobilepay" | "bank";
  status: "paid" | "pending" | "failed" | "refunded";
}

export interface DemoActivity {
  minutesAgo: number;
  actor: string;
  action: "approved" | "rejected" | "merchantActivated" | "refund" | "commission" | "payout" | "suspended";
  target: string;
}

export interface DemoPayout {
  merchantId: string;
  amountCents: number;
  status: "scheduled" | "paid" | "failed";
  daysAgo: number;
}

export interface AdminDemoData {
  /** ISO dates, oldest first, DEMO_DAYS long; the last one is today. */
  days: string[];
  /** Vouchers sold per deal per day, aligned with `days`. */
  sales: Record<string, number[]>;
  deals: DemoDeal[];
  merchants: DemoMerchant[];
  orders: DemoOrder[];
  activity: DemoActivity[];
  payouts: DemoPayout[];
  openTickets: number;
}

const WEEKDAY = [1.15, 0.8, 0.85, 0.9, 1.0, 1.35, 1.4]; // Sun..Sat

/** Builds the full demo dataset, ending on `today`. */
export function buildAdminDemo(today = new Date()): AdminDemoData {
  const r = rng(20261031);
  const end = Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate());
  const days = Array.from({ length: DEMO_DAYS }, (_, i) => new Date(end - (DEMO_DAYS - 1 - i) * 864e5).toISOString().slice(0, 10));

  const sales: Record<string, number[]> = {};
  for (const deal of DEMO_DEALS) {
    sales[deal.id] = days.map((iso, i) => {
      const age = DEMO_DAYS - 1 - i;
      if (deal.rate === 0 || age > deal.liveDaysAgo) return 0;
      const growth = 0.55 + 0.45 * (1 - age / DEMO_DAYS);
      const ramp = Math.min(1, (deal.liveDaysAgo - age + 1) / 14); // new deals take two weeks to pick up
      const lambda = deal.rate * growth * ramp * WEEKDAY[new Date(iso).getUTCDay()]!;
      return Math.max(0, Math.round(lambda * (0.55 + r() * 0.9)));
    });
  }

  const live = DEMO_DEALS.filter((d) => d.rate > 0);
  const emails = ["anna.k", "mikko", "sara.l", "jussi.v", "emma", "oskari", "laura.n", "ville", "noora", "elias.h", "aino", "tuomas"];
  const domains = ["gmail.com", "outlook.com", "elisanet.fi", "icloud.com"];
  const orders: DemoOrder[] = Array.from({ length: 48 }, (_, i) => {
    const deal = live[Math.floor(r() * live.length)]!;
    const qty = r() < 0.75 ? 1 : 2;
    const roll = r();
    const status: DemoOrder["status"] = i < 2 && roll < 0.5 ? "pending" : roll < 0.04 ? "failed" : roll < 0.08 ? "refunded" : "paid";
    const methodRoll = r();
    return {
      number: `VD-${String(48213 - i).padStart(6, "0")}`,
      minutesAgo: Math.round(i * 38 + r() * 30),
      email: `${emails[i % emails.length]![0]}***@${domains[Math.floor(r() * domains.length)]}`,
      dealId: deal.id,
      qty,
      totalCents: deal.priceCents * qty,
      method: methodRoll < 0.45 ? "mobilepay" : methodRoll < 0.85 ? "card" : "bank",
      status,
    };
  });

  const activity: DemoActivity[] = [
    { minutesAgo: 25, actor: "admin@vendelia.fi", action: "approved", target: "Kasvohoito 75 min" },
    { minutesAgo: 140, actor: "admin@vendelia.fi", action: "rejected", target: "Hampurilaisateria kahdelle" },
    { minutesAgo: 320, actor: "support@vendelia.fi", action: "refund", target: "VD7K-2QXM" },
    { minutesAgo: 1440, actor: "system", action: "payout", target: "13" },
    { minutesAgo: 1700, actor: "admin@vendelia.fi", action: "merchantActivated", target: "Kauneushoitola Siro" },
    { minutesAgo: 2900, actor: "admin@vendelia.fi", action: "suspended", target: "Muuttosiivous Puhdas" },
    { minutesAgo: 8600, actor: "admin@vendelia.fi", action: "commission", target: "15 %" },
  ];

  // Payout per active merchant: what its deals earned in the last 14 days, after commission and its VAT.
  const payouts: DemoPayout[] = DEMO_MERCHANTS.filter((m) => m.status === "active").map((m, i): DemoPayout => {
    let amount = 0;
    for (const deal of DEMO_DEALS.filter((d) => d.merchantId === m.id)) {
      const sold = sales[deal.id]!.slice(-14).reduce((a, b) => a + b, 0);
      amount += splitMoney(sold * deal.priceCents, deal.vatBps).payout;
    }
    return { merchantId: m.id, amountCents: amount, status: i === 6 ? "failed" : i % 3 === 0 ? "paid" : "scheduled", daysAgo: i % 3 === 0 ? 1 : 0 };
  }).filter((p) => p.amountCents > 0);

  return { days, sales, deals: DEMO_DEALS, merchants: DEMO_MERCHANTS, orders, activity, payouts, openTickets: 4 };
}

export const COMMISSION_BPS = 1500;
export const COMMISSION_VAT_BPS = 2550;

/** Splits a VAT-inclusive sale per the platform rules: 15 % commission on the VAT-exclusive price, 25.5 % VAT on it. */
export function splitMoney(grossCents: number, vatBps: number) {
  const net = Math.round((grossCents * 10000) / (10000 + vatBps));
  const commission = Math.round((net * COMMISSION_BPS) / 10000);
  const commissionVat = Math.round((commission * COMMISSION_VAT_BPS) / 10000);
  return { gross: grossCents, saleVat: grossCents - net, net, commission, commissionVat, payout: grossCents - commission - commissionVat };
}

const merchantName = (id: string) => DEMO_MERCHANTS.find((m) => m.id === id)?.name ?? "";

/** Rows for the existing deal review table. */
export function demoDealRows(data: AdminDemoData): AdminDealRowDTO[] {
  return data.deals.map((d) => ({
    id: d.id,
    slug: d.slug,
    title: d.title,
    merchantName: merchantName(d.merchantId),
    status: d.status,
    fromPriceCents: d.priceCents,
    createdAt: data.days[Math.max(0, DEMO_DAYS - 1 - Math.max(d.liveDaysAgo, d.status === "pending" ? 1 : 3))]!,
  }));
}

/** Rows for the existing businesses table. */
export function demoMerchantRows(data: AdminDemoData): AdminMerchantRowDTO[] {
  return data.merchants.map((m) => ({
    id: m.id,
    name: m.name,
    companyName: m.companyName,
    businessId: m.businessId,
    status: m.status,
    email: m.email,
    liveDeals: data.deals.filter((d) => d.merchantId === m.id && d.status === "live").length,
    createdAt: data.days[DEMO_DAYS - 1 - m.joinedDaysAgo]!,
  }));
}

/** Rows for the existing refunds panel. */
export function demoRefundRows(data: AdminDemoData): AdminRefundRowDTO[] {
  return data.orders
    .filter((o) => o.status === "refunded")
    .concat(data.orders.slice(10, 13))
    .map((o, i) => {
      const deal = data.deals.find((d) => d.id === o.dealId)!;
      return {
        code: `VD${(7 + i).toString(36).toUpperCase()}K-${(1234 + i * 977).toString(36).toUpperCase()}`,
        title: deal.title,
        merchantName: merchantName(deal.merchantId),
        priceCents: deal.priceCents,
        refundedAt: new Date(Date.now() - (o.minutesAgo + i * 600) * 6e4).toISOString(),
        orderNumber: o.number,
        email: o.email,
      };
    });
}

export function demoSupport(data: AdminDemoData) {
  const now = Date.now();
  return {
    emails: data.orders.slice(0, 6).map((o, i) => ({
      id: `e${i}`,
      to: o.email,
      subject: i % 3 === 2 ? "Lahjakorttisi vanhenee pian" : `Tilausvahvistus ${o.number}`,
      body: "",
      template: i % 3 === 2 ? "expiry-reminder" : "order-confirmation",
      createdAt: new Date(now - o.minutesAgo * 6e4).toISOString(),
    })),
    entries: data.activity.map((a, i) => ({
      id: `a${i}`,
      action: a.action,
      entity: a.action === "refund" ? "voucher" : a.action === "merchantActivated" || a.action === "suspended" ? "merchant" : "deal",
      entityId: a.target,
      createdAt: new Date(now - a.minutesAgo * 6e4).toISOString(),
    })),
  };
}
