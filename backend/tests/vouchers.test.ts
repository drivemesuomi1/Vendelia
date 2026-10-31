import { it } from "node:test";
import assert from "node:assert/strict";
import postgres from "postgres";
import { PDFDocument } from "pdf-lib";
import { VOUCHER_CODE_RE, voucherQrPayload } from "@vendelia/shared";
import { buildApp } from "../src/app.js";
import { orderConfig } from "../src/config.js";
import { newOrderNumber, newVoucherCode, voucherExpiry } from "../src/modules/orders/service.js";
import { buildVoucherEmail } from "../src/modules/vouchers/email.js";
import { renderVoucherPdf, type VoucherDocument } from "../src/modules/vouchers/pdf.js";

const voucher: VoucherDocument = {
  code: "VND-7KQ2-M9XA", qrPayload: voucherQrPayload("https://www.vendelia.fi/", "VND-7KQ2-M9XA"), test: true,
  title: { fi: "Kotisiivous 3–8 h", sv: "Hemstädning 3–8 h", en: "Home cleaning 3–8 h" },
  optionLabel: { fi: "3 h kotisiivous", sv: "", en: "3 h home cleaning" },
  merchant: { name: "Cleava Siivouspalvelut", companyName: "Cleava Oy", businessId: "3631044-9", phone: "045 187 8083" },
  address: null, serviceArea: { fi: "Helsinki ja Espoo", sv: "", en: "" }, cities: ["Helsinki", "Espoo"],
  howTo: { fi: ["Varaa aika puhelimitse → kerro koodi"], sv: [], en: [] }, terms: { fi: ["Ei voi vaihtaa rahaksi"], sv: [], en: [] },
  dealUrl: "https://www.vendelia.fi/fi/deals/cleava", priceCents: 8900, vatBps: 2550,
  issuedAt: "2026-10-31T09:00:00.000Z", expiresAt: "2027-01-31T21:59:59.999Z",
  orderNumber: "VD-7H3KQP", buyerName: "Testi Ostaja", recipientName: "Maija Meikäläinen", giftMessage: "Hyvää syntymäpäivää!",
};

it("generates voucher codes and order numbers in the documented formats", () => {
  const codes = new Set(Array.from({ length: 500 }, newVoucherCode));
  assert.equal(codes.size, 500);
  for (const code of codes) {
    assert.match(code, VOUCHER_CODE_RE);
    assert.doesNotMatch(code.slice(4), /[01OIL]/);
  }
  assert.match(newOrderNumber(), /^VD-[A-Z2-9]{6}$/);
});

it("points the QR code at the public voucher check page", () => {
  assert.equal(voucherQrPayload("https://www.vendelia.fi/", "VND-7KQ2-M9XA"), "https://www.vendelia.fi/fi/voucher/VND-7KQ2-M9XA");
});

it("expires vouchers at the end of the same day N months later in Helsinki, clamped to month length", () => {
  assert.equal(voucherExpiry(new Date("2026-10-31T09:44:00Z"), 3).toISOString(), "2027-01-31T21:59:59.999Z");
  assert.equal(voucherExpiry(new Date("2026-11-30T10:00:00Z"), 3).toISOString(), "2027-02-28T21:59:59.999Z");
  // 22:30 UTC on 29 March is already 30 March in Helsinki; June is summer time (UTC+3).
  assert.equal(voucherExpiry(new Date("2026-03-29T22:30:00Z"), 3).toISOString(), "2026-06-30T20:59:59.999Z");
});

it("reads the payment bypass and mail settings from the environment", () => {
  assert.equal(orderConfig({}).paymentBypass, false);
  assert.equal(orderConfig({ PAYMENT_BYPASS: "true" }).paymentBypass, true);
  assert.equal(orderConfig({ PAYMENT_BYPASS: "false" }).paymentBypass, false);
  assert.throws(() => orderConfig({ PAYMENT_BYPASS: "yes please" }));
  assert.deepEqual(orderConfig({ PAYMENT_BYPASS_ALLOWED_EMAILS: " A@x.fi, @vendelia.fi ," }).bypassAllowedEmails, ["a@x.fi", "@vendelia.fi"]);
  assert.equal(orderConfig({ SMTP_HOST: "smtp.example.com", SMTP_PORT: "465" }).mail.smtp?.secure, true);
  assert.equal(orderConfig({}).mail.smtp, null);
  assert.equal(orderConfig({ NODE_ENV: "production" }).mail.outboxDir, null);
  assert.equal(orderConfig({ PUBLIC_SITE_URL: "https://example.fi///" }).siteUrl, "https://example.fi");
});

it("renders one PDF page per voucher, in every language, including characters standard fonts lack", async () => {
  for (const locale of ["fi", "sv", "en"] as const) {
    const bytes = await renderVoucherPdf([voucher, { ...voucher, code: "VND-P4ZT-8WRB", test: false, recipientName: null }], {
      locale, validityMonths: 3, refundWindowDays: 14, supportEmail: "info@vendelia.fi", siteUrl: "https://www.vendelia.fi",
    });
    assert.equal(Buffer.from(bytes.slice(0, 5)).toString(), "%PDF-");
    assert.equal((await PDFDocument.load(bytes)).getPageCount(), 2);
  }
});

it("marks test orders in the email subject and body", () => {
  const mail = buildVoucherEmail({
    locale: "fi", firstName: "Testi", orderNumber: "VD-7H3KQP", test: true, vouchers: [voucher],
    supportEmail: "info@vendelia.fi", siteUrl: "https://www.vendelia.fi",
  });
  assert.match(mail.subject, /^\[TESTI\] Vendelia-lahjakorttisi: Kotisiivous 3–8 h$/);
  assert.match(mail.text, /VND-7KQ2-M9XA/);
  assert.match(mail.html, /testitilaus/i);
  assert.doesNotMatch(buildVoucherEmail({ ...{ locale: "en", firstName: "<b>x</b>", orderNumber: "VD-1", test: false, vouchers: [voucher], supportEmail: "a@b.fi", siteUrl: "https://v.fi" } }).html, /<b>x<\/b>/);
});

it("refuses checkout without touching the database while the payment bypass is off", async () => {
  const database = postgres({ host: "127.0.0.1", port: 1 });
  await database.end();
  const app = buildApp(database, { orders: orderConfig({}) });
  try {
    const response = await app.inject({
      method: "POST", url: "/api/orders",
      payload: {
        items: [{ dealId: "c1ea7a00-0000-4000-8000-000000000001", optionId: "c1ea7a00-0000-4000-8000-000000000101", qty: 1 }],
        contact: { email: "a@example.com", firstName: "A", lastName: "B" },
        gift: { enabled: false }, payment: { method: "test" }, acceptTerms: true,
      },
    });
    assert.equal(response.statusCode, 503);
    assert.equal(response.json().error, "paymentUnavailable");
    const redeem = await app.inject({ method: "POST", url: "/api/merchant/vouchers/redeem", payload: { code: "VND-7KQ2-M9XA" } });
    assert.equal(redeem.statusCode, 501);
  } finally { await app.close(); }
});
