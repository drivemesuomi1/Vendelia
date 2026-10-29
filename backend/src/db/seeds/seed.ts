import { count, eq } from "drizzle-orm";
import type { Db } from "../client";
import { categories, cities, settings, users } from "../schema";
import { DEFAULT_COMMISSION_BPS } from "../../domain/commission";
import { hashPassword } from "../../modules/auth/password";

/** Local demo accounts. Both use DEMO_PASSWORD (see backend/.env.example). Never seeded in production. */
export const DEMO_ACCOUNTS = {
  admin: "admin@vendelia.test",
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

/**
 * Reference data every environment needs: launch cities, categories and the default commission.
 * Idempotent — does nothing once cities exist. No merchants or deals are created; those come from real sign-ups.
 */
export async function seedReferenceData(db: Db) {
  const [existing] = await db.select({ n: count() }).from(cities);
  if (Number(existing?.n ?? 0) > 0) return { seeded: false };
  await db.insert(cities).values(CITIES.map((c, i) => ({ ...c, sort: i })));
  await db.insert(categories).values(CATEGORIES.map((c, i) => ({ ...c, sort: i })));
  await db.insert(settings).values({ key: "commission_bps", value: DEFAULT_COMMISSION_BPS }).onConflictDoNothing();
  return { seeded: true };
}

/** Development only: an admin (to approve real merchant sign-ups) and a customer login. Idempotent. */
export async function seedDemoAccounts(db: Db, demoPassword: string) {
  const [admin] = await db.select({ id: users.id }).from(users).where(eq(users.email, DEMO_ACCOUNTS.admin)).limit(1);
  if (admin) return { seeded: false };
  const passwordHash = await hashPassword(demoPassword);
  await db.insert(users).values([
    { email: DEMO_ACCOUNTS.admin, name: "Vendelia Admin", role: "admin", passwordHash },
    { email: DEMO_ACCOUNTS.customer, name: "Asiakas", role: "customer", passwordHash },
  ]);
  return { seeded: true };
}
