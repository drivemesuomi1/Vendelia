import { after, before, describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import postgres, { type Sql } from "postgres";
import { cartQuoteSchema, dealQuerySchema, type DealDetailDTO, type MetaDTO, type CartQuoteDTO } from "@vendelia/shared";
import { buildApp } from "../src/app.js";
import { platformConfig } from "../src/config.js";

const dealId = "c1ea7a00-0000-4000-8000-000000000001";
const optionId = "c1ea7a00-0000-4000-8000-000000000101";
const slug = "cleava-kotisiivous-ja-muuttosiivous";
const item = { dealId, optionId, qty: 2 };

it("validates cart quantities, identifiers, duplicates and featured=false", () => {
  assert.equal(dealQuerySchema.parse({ featured: "false" }).featured, false);
  assert.equal(dealQuerySchema.safeParse({ featured: "arbitrary" }).success, false);
  for (const items of [[{ ...item, qty: 0 }], [{ ...item, qty: 1.5 }], [{ ...item, qty: 11 }],
    [{ ...item, dealId: "bad" }], [item, item], Array(21).fill(item)]) {
    assert.equal(cartQuoteSchema.safeParse({ items }).success, false);
  }
  assert.equal(cartQuoteSchema.safeParse({ items: [] }).success, true);
});

it("loads and validates platform policy from backend configuration", () => {
  assert.equal(platformConfig({ COMMISSION_BPS: "2000" }).commissionBps, 2000);
  assert.throws(() => platformConfig({ VOUCHER_VALIDITY_MONTHS: "0" }));
});

it("reports database failure without returning stale data or connection details", async () => {
  const database = postgres({ host: "127.0.0.1", port: 1 });
  await database.end(); // Ended pools fail immediately; no network connection is attempted.
  const app = buildApp(database);
  try {
    for (const path of ["/api/health", "/api/meta", "/api/deals", `/api/deals/${slug}`]) {
      const response = await app.inject(path);
      assert.equal(response.statusCode, 503);
      assert.equal(response.json().error, "service_unavailable");
      assert.doesNotMatch(response.body, /127\.0\.0\.1|CONNECTION_ENDED/);
    }
  } finally { await app.close(); }
});

// This suite NEVER uses DATABASE_URL. Use a fresh dedicated vendelia_test database.
const testUrl = process.env.TEST_DATABASE_URL;
describe("PostgreSQL catalogue API", { skip: !testUrl }, () => {
  let database: Sql;
  let app: ReturnType<typeof buildApp>;
  before(async () => {
    assert.match(new URL(testUrl!).pathname, /^\/vendelia_test(?:_[a-z0-9]+)?$/, "Use a fresh dedicated vendelia_test database");
    database = postgres(testUrl!, { max: 2, connect_timeout: 5 });
    // CREATE TABLE fails on an existing schema. There is no reset/drop logic.
    await database.unsafe(await readFile(new URL("./fixtures/catalogue-schema.sql", import.meta.url), "utf8"));
    await database.unsafe(await readFile(new URL("../sql/seed-catalogue.sql", import.meta.url), "utf8"));
    app = buildApp(database);
    await app.ready();
  });
  after(async () => { if (app) await app.close(); else if (database) await database.end(); });

  const get = (path: string) => app.inject({ method: "GET", url: path });
  const cart = (items: unknown[]) => app.inject({ method: "POST", url: "/api/cart/quote", payload: { items } });

  it("reads reference rows and counts a deal once across four coverage cities", async () => {
    assert.equal((await get("/api/health")).json().database, "connected");
    const response = await get("/api/meta");
    assert.equal(response.headers["cache-control"], "no-store");
    const meta = response.json<MetaDTO>();
    assert.equal(meta.cities.length, 4);
    assert.equal(meta.categories.length, 5);
    assert.equal(meta.categories.find((c) => c.id === "cleaning")?.dealCount, 1);
    assert.equal(meta.categories.find((c) => c.id === "food")?.dealCount, 0);
    await database`UPDATE public.cities SET name = jsonb_set(name, '{en}', '"Database city name"') WHERE id = 'espoo'`;
    try {
      assert.equal((await get("/api/meta")).json<MetaDTO>().cities.find((c) => c.id === "espoo")?.name.en, "Database city name");
    } finally {
      await database`UPDATE public.cities SET name = jsonb_set(name, '{en}', '"Espoo"') WHERE id = 'espoo'`;
    }
  });

  it("supports coverage, category, localized search and literal search characters", async () => {
    for (const city of ["helsinki", "espoo", "vantaa", "kauniainen"]) {
      assert.equal((await get(`/api/deals?city=${city}`)).json().deals.length, 1);
    }
    assert.equal((await get("/api/deals?category=food")).json().deals.length, 0);
    assert.equal((await get(`/api/deals?q=${encodeURIComponent("muuttosiivous")}`)).json().deals.length, 1);
    assert.equal((await get("/api/deals?q=%25_%27")).json().deals.length, 0);
    await database`UPDATE public.deals SET featured = false WHERE id = ${dealId}`;
    try {
      assert.equal((await get("/api/deals?featured=true")).json().deals.length, 0);
      assert.equal((await get("/api/deals?featured=false")).json().deals.length, 1);
    } finally { await database`UPDATE public.deals SET featured = true WHERE id = ${dealId}`; }
  });

  it("maps translations, merchant, gallery, option groups and service areas", async () => {
    const detail = (await get(`/api/deals/${slug}`)).json<DealDetailDTO>();
    assert.equal(detail.options.length, 10);
    assert.equal(detail.options[0]?.priceCents, 8900);
    assert.equal(detail.options[0]?.shortLabel?.en, "3 h");
    assert.equal(detail.options[5]?.group?.en, "Move-out cleaning");
    assert.equal(detail.options[5]?.referencePriceCents, null);
    assert.equal(detail.gallery?.length, 2);
    assert.match(detail.serviceArea!.en, /Helsinki/);
    assert.equal(detail.street, "");
    assert.equal(detail.merchant.email, "info@cleava.fi");
    assert.ok(detail.title.sv);
    assert.ok(detail.terms.fi.length);
  });

  it("reflects edited DB prices in cards and cart; ignores client price fields", async () => {
    await database`UPDATE public.deal_options SET price_cents = 9900 WHERE id = ${optionId}`;
    try {
      assert.equal((await get("/api/deals")).json().deals[0].fromPriceCents, 9900);
      assert.equal((await get(`/api/deals/${slug}`)).json().options[0].priceCents, 9900);
      const quoted = (await cart([{ ...item, unitPriceCents: 1 }])).json<CartQuoteDTO>();
      assert.equal(quoted.totalCents, 19800);
      assert.equal(quoted.lines[0]?.unitPriceCents, 9900);
      assert.equal(quoted.vatByRate[2550], Math.round(19800 * 2550 / 12550));
    } finally { await database`UPDATE public.deal_options SET price_cents = 8900 WHERE id = ${optionId}`; }
  });

  it("hides unpublished, suspended, disabled and unpurchasable deals consistently", async () => {
    const cases = [
      [() => database`UPDATE public.deals SET status = 'draft' WHERE id = ${dealId}`,
        () => database`UPDATE public.deals SET status = 'live' WHERE id = ${dealId}`],
      [() => database`UPDATE public.merchants SET status = 'suspended'`,
        () => database`UPDATE public.merchants SET status = 'active'`],
      [() => database`UPDATE public.categories SET active = false WHERE id = 'cleaning'`,
        () => database`UPDATE public.categories SET active = true WHERE id = 'cleaning'`],
      [() => database`UPDATE public.cities SET active = false WHERE id = 'helsinki'`,
        () => database`UPDATE public.cities SET active = true WHERE id = 'helsinki'`],
      [() => database`UPDATE public.deal_options SET active = false WHERE deal_id = ${dealId}`,
        () => database`UPDATE public.deal_options SET active = true WHERE deal_id = ${dealId}`],
    ];
    for (const [hide, restore] of cases) {
      await hide!();
      try {
        assert.equal((await get("/api/deals")).json().deals.length, 0);
        assert.equal((await get(`/api/deals/${slug}`)).statusCode, 404);
        assert.equal((await cart([item])).json<CartQuoteDTO>().unavailable.length, 1);
        const meta = (await get("/api/meta")).json<MetaDTO>();
        assert.equal(meta.categories.find((c) => c.id === "cleaning")?.dealCount ?? 0, 0);
      } finally { await restore!(); }
    }
  });

  it("rejects stale options, wrong deal/option pairs and invalid request bodies", async () => {
    await database`UPDATE public.deal_options SET active = false WHERE id = ${optionId}`;
    try {
      assert.equal((await cart([item])).json<CartQuoteDTO>().unavailable.length, 1);
      assert.equal((await get(`/api/deals/${slug}`)).json().optionCount, 9);
    } finally { await database`UPDATE public.deal_options SET active = true WHERE id = ${optionId}`; }
    const wrongPair = { ...item, dealId: "00000000-0000-4000-8000-000000000000" };
    assert.equal((await cart([wrongPair])).json<CartQuoteDTO>().unavailable.length, 1);
    for (const items of [[{ ...item, qty: -1 }], [item, item], [{ ...item, optionId: "bad" }]]) {
      assert.equal((await cart(items)).statusCode, 400);
    }
    assert.equal((await get("/api/deals?featured=invalid")).statusCode, 400);
    assert.equal((await cart([])).json<CartQuoteDTO>().totalCents, 0);
  });
});
