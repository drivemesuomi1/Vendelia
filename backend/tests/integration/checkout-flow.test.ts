import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { CreateOrderResponse, DealDetailDTO, DealSummaryDTO, OrderDTO, VoucherDTO } from "@vendelia/shared";
import { client, createTestApp } from "./helpers";

let t: Awaited<ReturnType<typeof createTestApp>>;
beforeAll(async () => { t = await createTestApp(); });
afterAll(async () => { await t.app.close(); });

const checkoutBody = (items: { dealId: string; optionId: string; qty: number }[]) => ({
  items,
  contact: { email: "guest@example.fi", firstName: "Testi", lastName: "Ostaja", phone: "" },
  gift: { enabled: false },
  payment: { method: "bank", bank: "OP" },
  acceptTerms: true,
  newsletter: false,
});

async function massageDeal() {
  const c = client(t.app);
  const list = (await c.get("/api/deals?q=kuumakivi")).body.deals as DealSummaryDTO[];
  return (await c.get(`/api/deals/${list[0]!.slug}`)).body as DealDetailDTO;
}

describe("catalogue", () => {
  it("lists only live deals and filters by city", async () => {
    const c = client(t.app);
    const all = (await c.get("/api/deals")).body.deals as DealSummaryDTO[];
    expect(all).toHaveLength(8);
    const espoo = (await c.get("/api/deals?city=espoo")).body.deals as DealSummaryDTO[];
    expect(espoo.every((d) => d.cityId === "espoo")).toBe(true);
  });

  it("prices the cart on the server, with VAT per rate", async () => {
    const deal = await massageDeal();
    const res = await client(t.app).post("/api/cart/quote", { items: [{ dealId: deal.id, optionId: deal.options[1]!.id, qty: 2 }] });
    expect(res.body.totalCents).toBe(2 * deal.options[1]!.priceCents);
    expect(res.body.vatByRate["2550"]).toBe(3210); // VAT in 158,00 € at 25,5 %
  });
});

describe("guest checkout → payment → vouchers → redeem → payout", () => {
  let order: CreateOrderResponse;
  let vouchers: VoucherDTO[];

  it("rejects invalid checkout input with field codes", async () => {
    const res = await client(t.app).post("/api/orders", { ...checkoutBody([]), acceptTerms: false, payment: { method: "bank" } });
    expect(res.status).toBe(400);
    expect(res.body.fields).toMatchObject({ items: "cartEmpty", acceptTerms: "acceptTerms", "payment.bank": "chooseBank" });
  });

  it("creates a pending order and confirms the (mock) payment", async () => {
    const deal = await massageDeal();
    const guest = client(t.app);
    const created = await guest.post("/api/orders", checkoutBody([{ dealId: deal.id, optionId: deal.options[0]!.id, qty: 2 }]));
    expect(created.status).toBe(201);
    order = created.body;
    expect(order.totalCents).toBe(11800);

    expect((await guest.post(`/api/payments/${order.orderId}/mock-confirm`, {}, { "x-order-token": "wrong" })).status).toBe(403);
    expect((await guest.post(`/api/payments/${order.orderId}/mock-confirm`, {}, { "x-order-token": order.accessToken })).status).toBe(200);
    // Idempotent: confirming twice does not issue more vouchers.
    await guest.post(`/api/payments/${order.orderId}/mock-confirm`, {}, { "x-order-token": order.accessToken });

    const fetched = (await guest.get(`/api/orders/${order.orderId}`, { "x-order-token": order.accessToken })).body as OrderDTO;
    expect(fetched.status).toBe("paid");
    vouchers = fetched.vouchers;
    expect(vouchers).toHaveLength(2);
    expect(vouchers[0]!.expiresAt.slice(0, 10)).toBe("2027-01-14");
    expect(t.sent.some((m) => m.to === "guest@example.fi" && m.template === "orderConfirmation")).toBe(true);
  });

  it("hides the order from other people", async () => {
    expect((await client(t.app).get(`/api/orders/${order.orderId}`)).status).toBe(403);
  });

  it("lets the merchant redeem a voucher exactly once", async () => {
    const m = client(t.app);
    expect((await m.login("yritys@vendelia.test")).status).toBe(200);
    const code = vouchers[0]!.code;
    expect((await m.post("/api/merchant/vouchers/lookup", { code })).body.result).toBe("valid");
    const first = await m.post("/api/merchant/vouchers/redeem", { code });
    expect(first.status).toBe(200);
    expect(first.body.payoutCents).toBe(5015);
    const second = await m.post("/api/merchant/vouchers/redeem", { code });
    expect(second.status).toBe(409);
    expect((await m.post("/api/merchant/vouchers/lookup", { code })).body.result).toBe("redeemed");
  });

  it("rejects a voucher that belongs to another merchant", async () => {
    const m = client(t.app);
    await m.login("yritys@vendelia.test");
    const deals = (await m.get("/api/deals?q=brunssi")).body.deals as DealSummaryDTO[];
    const brunch = (await m.get(`/api/deals/${deals[0]!.slug}`)).body as DealDetailDTO;
    const other = (await client(t.app).post("/api/orders", checkoutBody([{ dealId: brunch.id, optionId: brunch.options[0]!.id, qty: 1 }]))).body as CreateOrderResponse;
    await client(t.app).post(`/api/payments/${other.orderId}/mock-confirm`, {}, { "x-order-token": other.accessToken });
    const o = (await client(t.app).get(`/api/orders/${other.orderId}`, { "x-order-token": other.accessToken })).body as OrderDTO;
    expect((await m.post("/api/merchant/vouchers/lookup", { code: o.vouchers[0]!.code })).body.result).toBe("other_merchant");
  });

  it("shows every statement line and pays out only redeemed vouchers", async () => {
    const m = client(t.app);
    await m.login("yritys@vendelia.test");
    const st = (await m.get("/api/merchant/payouts")).body;
    const row = st.rows.find((r: { sold: number }) => r.sold === 2);
    expect(row).toMatchObject({ grossCents: 11800, netCents: 9402, saleVatCents: 2398, commissionCents: 1410, commissionVatCents: 360, payoutCents: 10030 });
    expect(st.pendingPayoutCents).toBe(5015);

    const admin = client(t.app);
    await admin.login("admin@vendelia.test");
    const run = await admin.post("/api/admin/jobs/payout-run/run");
    expect(run.body.result.payouts).toBeGreaterThanOrEqual(1);
    expect((await m.get("/api/merchant/payouts")).body.pendingPayoutCents).toBe(0);
  });
});

describe("customer cancellation (14-day refund)", () => {
  it("refunds an unused voucher inside the window and reverses the ledger", async () => {
    const c = client(t.app);
    await c.login("asiakas@vendelia.test");
    const mine = (await c.get("/api/me/vouchers")).body.vouchers as VoucherDTO[];
    const active = mine.find((v) => v.status === "active" && v.cancellableUntil)!;
    const res = await c.post("/api/me/vouchers/cancel", { code: active.code });
    expect(res.status).toBe(200);
    expect(res.body.status).toBe("refunded");
    expect((await c.post("/api/me/vouchers/cancel", { code: active.code })).status).toBe(409);
    expect(t.sent.some((m) => m.template === "refundAcknowledgement")).toBe(true);
  });

  it("blocks cancellation after 14 days", async () => {
    const deal = await massageDeal();
    const c = client(t.app);
    await c.login("asiakas@vendelia.test");
    const o = (await c.post("/api/orders", { ...checkoutBody([{ dealId: deal.id, optionId: deal.options[0]!.id, qty: 1 }]), contact: { email: "asiakas@vendelia.test", firstName: "A", lastName: "E" } })).body as CreateOrderResponse;
    await c.post(`/api/payments/${o.orderId}/mock-confirm`, {}, { "x-order-token": o.accessToken });
    const code = ((await c.get(`/api/orders/${o.orderId}`)).body as OrderDTO).vouchers[0]!.code;
    t.advanceDays(15);
    expect((await c.post("/api/me/vouchers/cancel", { code })).body.error).toBe("window_passed");
    t.advanceDays(-15);
  });
});

describe("access control", () => {
  it("keeps merchant and admin APIs closed", async () => {
    const anon = client(t.app);
    expect((await anon.get("/api/merchant/overview")).status).toBe(401);
    const customer = client(t.app);
    await customer.login("asiakas@vendelia.test");
    expect((await customer.get("/api/merchant/overview")).status).toBe(403);
    expect((await customer.get("/api/admin/deals")).status).toBe(403);
  });

  it("rejects wrong passwords with one generic error", async () => {
    const res = await client(t.app).login("asiakas@vendelia.test", "nope-nope");
    expect(res.status).toBe(401);
    expect(res.body.error).toBe("invalid_credentials");
  });
});

describe("merchant deal lifecycle", () => {
  it("creates a pending deal that only goes live after admin approval", async () => {
    const m = client(t.app);
    await m.login("yritys@vendelia.test");
    const t1 = { fi: "Selkähieronta 30 min", sv: "", en: "" };
    const created = await m.post("/api/merchant/deals", {
      title: t1, description: { fi: "Kuvaus" }, restrictions: { fi: "ma–pe" },
      inclusions: { fi: ["30 min hieronta"] }, terms: { fi: ["Voimassa ma–pe"] }, howTo: { fi: ["Saat lahjakortin", "Varaa aika", "Näytä koodi"] },
      categoryId: "wellness", cityId: "helsinki", area: "Kallio", street: "Esimerkkikatu 12", zip: "00530",
      vatBps: 2550, referencePriceCents: null, imageUrl: "/uploads/test.jpg", options: [{ label: null, priceCents: 3500 }],
    });
    expect(created.status).toBe(201);
    expect(created.body.status).toBe("pending");
    expect((await client(t.app).get(`/api/deals/${created.body.slug}`)).status).toBe(404);

    const preview = await m.post("/api/merchant/commission-preview", { priceCents: 3500, vatBps: 2550 });
    expect(preview.body.split.payoutCents).toBe(2975);

    const admin = client(t.app);
    await admin.login("admin@vendelia.test");
    await admin.post(`/api/admin/deals/${created.body.id}/review`, { decision: "approve" });
    expect((await client(t.app).get(`/api/deals/${created.body.slug}`)).status).toBe(200);
  });
});
