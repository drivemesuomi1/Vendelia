import { createHash, randomBytes, randomInt } from "node:crypto";
import type { Sql } from "postgres";
import {
  TEST_PAYMENT_METHOD, uuidSchema, voucherCodeSchema, voucherQrPayload,
  type AdminFinanceDayDTO, type AdminFinanceDTO, type AdminFinanceMerchantDTO, type AdminOrderDTO, type AdminVoucherDTO, type CheckoutInput, type CreateOrderResponse, type Locale, type LocalizedList, type LocalizedText,
  type OrderDTO, type PaymentMethod, type RedeemLookupDTO, type VoucherDTO, type VoucherStatus, type MerchantPayoutPreviewDTO,
} from "@vendelia/shared";
import type { OrderConfig, PlatformConfig } from "../../config";
import { HttpProblem } from "../../errors";
import type { CatalogueService } from "../catalogue/service";
import { buildVoucherEmail } from "../vouchers/email";
import type { Mailer } from "../vouchers/mailer";
import { renderVoucherPdf, type VoucherDocument } from "../vouchers/pdf";
import { pick, voucherText } from "../vouchers/text";

// No 0/O or 1/I/L, so codes read back unambiguously; a subset of VOUCHER_CODE_RE.
const ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
const randomChars = (n: number) => Array.from({ length: n }, () => ALPHABET[randomInt(ALPHABET.length)]).join("");
export const newVoucherCode = () => `VND-${randomChars(4)}-${randomChars(4)}`;
export const newOrderNumber = () => `VD-${randomChars(6)}`;
const hashToken = (token: string) => createHash("sha256").update(token).digest("hex");

/** Calendar date in Finland (where vouchers are used) as [year, monthIndex, day]. */
function helsinkiDate(date: Date): [number, number, number] {
  const parts = Object.fromEntries(new Intl.DateTimeFormat("en-GB", {
    year: "numeric", month: "numeric", day: "numeric", timeZone: "Europe/Helsinki",
  }).formatToParts(date).map((part) => [part.type, Number(part.value)]));
  return [parts.year!, parts.month! - 1, parts.day!];
}

/**
 * Last moment of the voucher's final day, Helsinki time. Same rule as the site's expiryFromToday:
 * the same day of the month `months` later, clamped to that month's length (30 Nov + 3 → 28 Feb).
 */
export function voucherExpiry(issued: Date, months: number): Date {
  const [year, month, day] = helsinkiDate(issued);
  const last = new Date(Date.UTC(year, month + months + 1, 0)).getUTCDate();
  const target = new Date(Date.UTC(year, month + months, Math.min(day, last)));
  // 23:59:59.999 in Helsinki: start from UTC and subtract Helsinki's offset on that date (+2 or +3).
  const endUtc = Date.UTC(target.getUTCFullYear(), target.getUTCMonth(), target.getUTCDate(), 23, 59, 59, 999);
  const offset = /GMT([+-]\d+)/.exec(new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/Helsinki", timeZoneName: "shortOffset" })
    .format(new Date(endUtc)))?.[1];
  return new Date(endUtc - Number(offset ?? 2) * 3_600_000);
}
const addDays = (date: Date, days: number) => new Date(date.getTime() + days * 86_400_000);
/** Normalizes a timestamp read with to_json(...) to "…Z" ISO form. */
const iso = (value: string) => new Date(value).toISOString();
const isoOrNull = (value: string | null) => (value ? iso(value) : null);

interface OrderRow {
  id: string; number: string; status: OrderDTO["status"]; is_test: boolean; locale: Locale;
  email: string; first_name: string; last_name: string; payment_method: PaymentMethod;
  total_cents: number; created_at: string; email_status: OrderDTO["emailStatus"];
  gift_message: string | null;
}

interface VoucherRow {
  code: string; qr_payload: string; status: VoucherStatus; is_test: boolean; price_cents: number;
  recipient_name: string | null; issued_at: string; expires_at: string; cancellable_until: string | null;
  redeemed_at: string | null; refunded_at: string | null;
  title: LocalizedText; option_label: LocalizedText | null; vat_bps: number; merchant_name: string;
  slug: string; image_url: string; how_to: LocalizedList; terms: LocalizedList;
  street: string | null; zip: string | null; city_id: string; city_name: LocalizedText | null;
  meeting_point: boolean; service_area: LocalizedText | null; coverage: LocalizedText[];
  company_name: string; business_id: string; public_phone: string | null; public_email: string | null; website: string | null;
}

export class OrderService {
  constructor(
    private readonly sql: Sql,
    private readonly catalogue: CatalogueService,
    private readonly policy: PlatformConfig,
    private readonly config: OrderConfig,
    private readonly mailer: Mailer,
  ) {}

  /**
   * Checkout. Real payments are not integrated yet, so only the temporary test checkout
   * (PAYMENT_BYPASS) can create orders: they are stored and emailed as test/unpaid.
   */
  async create(input: CheckoutInput, locale: Locale): Promise<CreateOrderResponse> {
    if (!this.config.paymentBypass || input.payment.method !== TEST_PAYMENT_METHOD) {
      throw new HttpProblem(503, "paymentUnavailable");
    }
    const email = input.contact.email.toLowerCase();
    const allowed = this.config.bypassAllowedEmails;
    if (allowed.length && !allowed.some((entry) => entry.startsWith("@") ? email.endsWith(entry) : email === entry)) {
      throw new HttpProblem(403, "testCheckoutNotAllowed");
    }

    // Prices come from the database, never from the browser (same rules as cart quotes).
    const { quote: priced, merchantOf } = await this.catalogue.priceOrder(input.items);
    if (priced.unavailable.length || !priced.lines.length) throw new HttpProblem(409, "itemsUnavailable");

    const accessToken = randomBytes(32).toString("base64url");
    // Timestamps go in as ISO text too: the shared client is wrapped by Drizzle, which turns off
    // postgres.js date serialization, so Date objects would not be converted.
    const now = new Date();
    const issuedAt = now.toISOString();
    const expiresAt = voucherExpiry(now, this.policy.voucherValidityMonths).toISOString();
    const cancellableUntil = addDays(now, this.policy.refundWindowDays).toISOString();
    const recipient = input.gift.enabled ? input.gift.recipientName : null;

    // JSON goes in as text for the same reason (Drizzle also turns off json/jsonb serialization).
    const order = await this.withUniqueRetry(() => this.sql.begin(async (tx) => {
      const [created] = await tx<{ id: string; number: string }[]>`
        INSERT INTO public.orders (number, status, is_test, locale, email, first_name, last_name, phone,
          gift_recipient_name, gift_message, newsletter, payment_method, total_cents, vat_by_rate, access_token_hash, created_at)
        VALUES (${newOrderNumber()}, 'test_unpaid', true, ${locale}, ${email}, ${input.contact.firstName},
          ${input.contact.lastName}, ${input.contact.phone || null}, ${recipient},
          ${input.gift.enabled ? input.gift.message || null : null}, ${input.newsletter},
          ${TEST_PAYMENT_METHOD}, ${priced.totalCents}, ${JSON.stringify(priced.vatByRate)}, ${hashToken(accessToken)}, ${issuedAt})
        RETURNING id, number`;
      for (const [index, line] of priced.lines.entries()) {
        const [item] = await tx<{ id: string }[]>`
          INSERT INTO public.order_items (order_id, line_no, deal_id, option_id, qty, unit_price_cents, total_cents,
            vat_bps, title, option_label, merchant_name)
          VALUES (${created!.id}, ${index + 1}, ${line.dealId}, ${line.optionId}, ${line.qty}, ${line.unitPriceCents},
            ${line.totalCents}, ${line.vatBps}, ${JSON.stringify(line.baseTitle ?? line.title)},
            ${line.optionLabel ? JSON.stringify(line.optionLabel) : null}, ${line.merchantName})
          RETURNING id`;
        // One voucher, code and QR per unit bought.
        for (let unit = 0; unit < line.qty; unit++) {
          const code = newVoucherCode();
          await tx`
            INSERT INTO public.vouchers (code, qr_payload, order_id, order_item_id, deal_id, option_id, merchant_id,
              is_test, price_cents, recipient_name, issued_at, expires_at, cancellable_until)
            VALUES (${code}, ${voucherQrPayload(this.config.siteUrl, code)}, ${created!.id}, ${item!.id}, ${line.dealId},
              ${line.optionId}, ${merchantOf.get(line.dealId)!}, true, ${line.unitPriceCents}, ${recipient},
              ${issuedAt}, ${expiresAt}, ${cancellableUntil})`;
        }
      }
      return created!;
    }));

    const emailSent = await this.sendVoucherEmail(order.id);
    return {
      orderId: order.id, number: order.number, accessToken, totalCents: priced.totalCents,
      payment: { provider: "test", action: "none" }, test: true, emailSent,
    };
  }

  /** Builds the PDF from what was saved, emails it, and records the outcome on the order. */
  async sendVoucherEmail(orderId: string): Promise<boolean> {
    const loaded = await this.load(orderId);
    if (!loaded) return false;
    const { order } = loaded;
    try {
      const pdf = await this.pdfFor(loaded);
      const message = buildVoucherEmail({
        locale: order.locale, firstName: order.first_name, orderNumber: order.number,
        vouchers: loaded.documents, supportEmail: this.config.mail.replyTo, siteUrl: this.config.siteUrl,
      });
      await this.mailer.send({
        to: order.email, ...message,
        attachments: [{ filename: pdf.filename, content: pdf.bytes, contentType: "application/pdf" }],
      });
      await this.sql`UPDATE public.orders SET email_status = 'sent', email_sent_at = now(), email_error = NULL WHERE id = ${orderId}`;
      return true;
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error);
      console.error(`Voucher email failed for order ${order.number}:`, reason);
      await this.sql`UPDATE public.orders SET email_status = 'failed', email_error = ${reason.slice(0, 500)} WHERE id = ${orderId}`;
      return false;
    }
  }

  /** Order with its vouchers, for the guest holding the order's access token. */
  async get(orderId: string, token: string | undefined): Promise<OrderDTO | null> {
    const loaded = await this.authorized(orderId, token);
    if (!loaded) return null;
    return this.toDto(loaded);
  }

  private toDto(loaded: NonNullable<Awaited<ReturnType<OrderService["load"]>>>): OrderDTO {
    const { order, rows } = loaded;
    return {
      id: order.id, number: order.number, status: order.status, test: order.is_test, emailStatus: order.email_status,
      email: order.email, totalCents: order.total_cents, paymentMethod: order.payment_method,
      createdAt: iso(order.created_at),
      vouchers: rows.map((row): VoucherDTO => ({
        code: row.code, status: row.status, dealSlug: row.slug, title: row.title, optionLabel: row.option_label,
        merchantName: row.merchant_name, street: row.street ?? "", zip: row.zip ?? "", cityId: row.city_id,
        meetingPoint: row.meeting_point, howTo: howToText(row.how_to), priceCents: row.price_cents,
        issuedAt: iso(row.issued_at), expiresAt: iso(row.expires_at),
        redeemedAt: isoOrNull(row.redeemed_at), refundedAt: isoOrNull(row.refunded_at),
        cancellableUntil: isoOrNull(row.cancellable_until), recipientName: row.recipient_name,
        orderNumber: order.number, imageUrl: row.image_url, qrPayload: row.qr_payload, test: row.is_test,
      })),
    };
  }

  /** Confirmed Auth email owns guest purchases made to that exact email. */
  async forCustomer(email: string): Promise<VoucherDTO[]> {
    const orders = await this.sql<{ id: string }[]>`
      SELECT id FROM public.orders WHERE lower(email) = ${email.toLowerCase()} ORDER BY created_at DESC`;
    const vouchers: VoucherDTO[] = [];
    for (const order of orders) {
      const loaded = await this.load(order.id);
      if (loaded) vouchers.push(...this.toDto(loaded).vouchers);
    }
    return vouchers;
  }

  /** The same PDF that was emailed, for downloading from the confirmation page. */
  async pdf(orderId: string, token: string | undefined) {
    const loaded = await this.authorized(orderId, token);
    return loaded ? this.pdfFor(loaded) : null;
  }

  /**
   * Marks one of the business's own vouchers as used. A single conditional UPDATE does it, so the voucher must
   * still be active and unexpired at that moment and two tills cannot both redeem it. Refusals return why,
   * with the same results as the lookup. The payout uses the current commission, like the portal's payout box.
   */
  async redeemForMerchant(rawCode: string, merchantId: string): Promise<{ redeemed: boolean; voucher: RedeemLookupDTO }> {
    const parsed = voucherCodeSchema.safeParse(rawCode);
    if (!parsed.success) return { redeemed: false, voucher: { code: rawCode.trim().toUpperCase(), result: 'not_found' } };
    const [row] = await this.sql<{ price_cents: number; vat_bps: number }[]>`
      UPDATE public.vouchers v SET status = 'redeemed', redeemed_at = now()
      FROM public.order_items oi
      WHERE oi.id = v.order_item_id AND v.code = ${parsed.data} AND v.merchant_id = ${merchantId}
        AND v.status = 'active' AND v.expires_at > now()
      RETURNING v.price_cents, oi.vat_bps`;
    const voucher = await this.lookupForMerchant(parsed.data, merchantId);
    if (!row) return { redeemed: false, voucher };
    return { redeemed: true, voucher: { ...voucher, payoutCents: payoutCents(row.price_cents, row.vat_bps, this.policy) } };
  }

  /** Current-rate earnings preview for the session's merchant, with no buyer contact information. */
  async merchantPayoutPreview(merchantId: string): Promise<MerchantPayoutPreviewDTO> {
    const rows = await this.sql<{
      code: string; title: LocalizedText; option_label: LocalizedText | null; slug: string; number: string;
      redeemed_at: string; issued_at: string; is_test: boolean; price_cents: number; vat_bps: number;
    }[]>`
      SELECT v.code, oi.title, oi.option_label, d.slug, o.number,
        to_json(v.redeemed_at) AS redeemed_at, to_json(v.issued_at) AS issued_at,
        (v.is_test OR o.is_test) AS is_test, v.price_cents, oi.vat_bps
      FROM public.vouchers v
      JOIN public.order_items oi ON oi.id = v.order_item_id
      JOIN public.orders o ON o.id = v.order_id
      JOIN public.deals d ON d.id = v.deal_id
      WHERE v.merchant_id = ${merchantId} AND v.status = 'redeemed' AND v.redeemed_at IS NOT NULL
      ORDER BY v.redeemed_at DESC, v.id DESC LIMIT 201`;
    return {
      preview: true, commissionBps: this.policy.commissionBps, commissionVatBps: this.policy.commissionVatBps,
      hasMore: rows.length > 200,
      rows: rows.slice(0, 200).map(r => ({
        code: r.code, title: r.title, optionLabel: r.option_label, dealSlug: r.slug, orderNumber: r.number,
        redeemedAt: iso(r.redeemed_at), issuedAt: iso(r.issued_at), test: r.is_test, vatBps: r.vat_bps,
        ...voucherSplit(r.price_cents, r.vat_bps, this.policy),
      })),
    };
  }

  /** Support can refund an unused voucher even after cancellation/expiry; no provider money movement. */
  async refundForAdmin(rawCode: string): Promise<AdminVoucherDTO> {
    const parsed = voucherCodeSchema.safeParse(rawCode);
    if (!parsed.success) throw new HttpProblem(400, 'invalidVoucherCode');
    const [updated] = await this.sql<{ code: string }[]>`
      UPDATE public.vouchers SET status = 'refunded', refunded_at = now()
      WHERE code = ${parsed.data} AND status IN ('active', 'expired')
        AND redeemed_at IS NULL AND refunded_at IS NULL
      RETURNING code`;
    const voucher = await this.adminVoucher(parsed.data);
    if (!voucher) throw new HttpProblem(404, 'voucher_not_found');
    if (!updated) throw new HttpProblem(409, voucher.status === 'redeemed' || voucher.redeemedAt
      ? 'refundAlreadyRedeemed' : voucher.status === 'refunded' || voucher.refundedAt ? 'refundAlreadyRefunded' : 'refundNotEligible');
    return voucher;
  }

  async adminRefunds() {
    const rows = await this.adminVouchersWhere(this.sql`v.status = 'refunded' AND v.refunded_at IS NOT NULL`,
      this.sql`v.refunded_at DESC, v.id DESC`, 101);
    return { refunds: rows.slice(0, 100), hasMore: rows.length > 100 };
  }

  /** Full detail of one voucher for admins (support questions, disputes). */
  async adminVoucher(rawCode: string): Promise<AdminVoucherDTO | null> {
    const parsed = voucherCodeSchema.safeParse(rawCode);
    if (!parsed.success) return null;
    const [row] = await this.adminVouchersWhere(this.sql`v.code = ${parsed.data}`, this.sql`v.issued_at DESC`, 1);
    return row ?? null;
  }

  /** The latest orders across all businesses, newest first, with their lines. */
  async adminOrders(limit = 500): Promise<AdminOrderDTO[]> {
    const rows = await this.sql<{
      id: string; number: string; status: string; email: string; payment_method: string; total_cents: number;
      created_at: string; paid_at: string | null; vouchers: number; refunded: number;
      items: { qty: number; title: LocalizedText; option_label: LocalizedText | null; merchant_name: string }[];
    }[]>`
      SELECT o.id, o.number, o.status, o.email, o.payment_method, o.total_cents,
        to_json(o.created_at) AS created_at, to_json(o.paid_at) AS paid_at,
        (SELECT count(*)::int FROM public.vouchers v WHERE v.order_id = o.id) AS vouchers,
        (SELECT count(*)::int FROM public.vouchers v WHERE v.order_id = o.id AND v.status = 'refunded') AS refunded,
        coalesce((SELECT jsonb_agg(jsonb_build_object('qty', oi.qty, 'title', oi.title, 'option_label', oi.option_label,
          'merchant_name', oi.merchant_name) ORDER BY oi.line_no)
          FROM public.order_items oi WHERE oi.order_id = o.id), '[]'::jsonb) AS items
      FROM public.orders o
      ORDER BY o.created_at DESC LIMIT ${limit}`;
    return rows.map((r) => ({
      id: r.id, number: r.number,
      status: r.status === 'test_unpaid' ? 'test'
        : r.status === 'paid' && r.vouchers > 0 && r.refunded === r.vouchers ? 'refunded'
        : r.status as 'paid' | 'pending' | 'failed',
      email: r.email, paymentMethod: r.payment_method, totalCents: r.total_cents,
      createdAt: iso(r.created_at), paidAt: isoOrNull(r.paid_at),
      items: r.items.map((i) => ({ qty: i.qty, title: i.title, optionLabel: i.option_label, merchantName: i.merchant_name })),
    }));
  }

  /**
   * Platform money from the database: sold vouchers per Helsinki day (last ~13 months), what each business has earned,
   * and refunds. A sale is a voucher on a paid order that was not refunded; test orders only when `includeTest`.
   * Each voucher is split on its own (same rounding as the business payout view), at the current commission rates.
   */
  async adminFinance(includeTest: boolean): Promise<AdminFinanceDTO> {
    const sold = includeTest
      ? this.sql`(o.status = 'paid' OR o.status = 'test_unpaid')`
      : this.sql`(o.status = 'paid' AND NOT o.is_test AND NOT v.is_test)`;
    const [dayRows, merchantRows, [refunded]] = await Promise.all([
      this.sql<{ day: string; vat_bps: number; price_cents: number; n: number }[]>`
        SELECT to_char((v.issued_at AT TIME ZONE 'Europe/Helsinki')::date, 'YYYY-MM-DD') AS day,
          oi.vat_bps, v.price_cents, count(*)::int AS n
        FROM public.vouchers v
        JOIN public.order_items oi ON oi.id = v.order_item_id
        JOIN public.orders o ON o.id = v.order_id
        WHERE ${sold} AND v.status <> 'refunded' AND v.issued_at >= now() - interval '400 days'
        GROUP BY 1, 2, 3 ORDER BY 1`,
      this.sql<{ merchant_id: string; name: string; state: 'redeemed' | 'open'; vat_bps: number; price_cents: number; n: number; last_redeemed_at: string | null }[]>`
        SELECT v.merchant_id, m.display_name AS name,
          CASE WHEN v.status = 'redeemed' THEN 'redeemed' ELSE 'open' END AS state,
          oi.vat_bps, v.price_cents, count(*)::int AS n, to_json(max(v.redeemed_at)) AS last_redeemed_at
        FROM public.vouchers v
        JOIN public.order_items oi ON oi.id = v.order_item_id
        JOIN public.orders o ON o.id = v.order_id
        JOIN public.merchants m ON m.id = v.merchant_id
        WHERE ${sold} AND (v.status = 'redeemed' OR (v.status = 'active' AND v.expires_at > now()))
        GROUP BY 1, 2, 3, 4, 5`,
      this.sql<{ n: number; gross: number }[]>`
        SELECT count(*)::int AS n, coalesce(sum(v.price_cents), 0)::int AS gross
        FROM public.vouchers v JOIN public.orders o ON o.id = v.order_id
        WHERE v.status = 'refunded' AND ${includeTest ? this.sql`true` : this.sql`NOT o.is_test AND NOT v.is_test`}`,
    ]);

    const days = new Map<string, AdminFinanceDayDTO>();
    for (const r of dayRows) {
      const day = days.get(r.day) ?? { date: r.day, vouchers: 0, grossCents: 0, netCents: 0, saleVatCents: 0,
        commissionCents: 0, commissionVatCents: 0, feeCents: 0, payoutCents: 0 };
      const split = voucherSplit(r.price_cents, r.vat_bps, this.policy);
      for (const k of ['grossCents', 'netCents', 'saleVatCents', 'commissionCents', 'commissionVatCents', 'feeCents', 'payoutCents'] as const) {
        day[k] += split[k] * r.n;
      }
      day.vouchers += r.n;
      days.set(r.day, day);
    }

    const merchants = new Map<string, AdminFinanceMerchantDTO>();
    for (const r of merchantRows) {
      const m = merchants.get(r.merchant_id) ?? { merchantId: r.merchant_id, name: r.name, redeemedVouchers: 0,
        redeemedPayoutCents: 0, openVouchers: 0, openPayoutCents: 0, lastRedeemedAt: null };
      const payout = payoutCents(r.price_cents, r.vat_bps, this.policy) * r.n;
      if (r.state === 'redeemed') {
        m.redeemedVouchers += r.n;
        m.redeemedPayoutCents += payout;
        const last = isoOrNull(r.last_redeemed_at);
        if (last && (!m.lastRedeemedAt || last > m.lastRedeemedAt)) m.lastRedeemedAt = last;
      } else {
        m.openVouchers += r.n;
        m.openPayoutCents += payout;
      }
      merchants.set(r.merchant_id, m);
    }

    return {
      commissionBps: this.policy.commissionBps, commissionVatBps: this.policy.commissionVatBps, includesTest: includeTest,
      days: [...days.values()],
      merchants: [...merchants.values()].sort((a, b) => b.redeemedPayoutCents - a.redeemedPayoutCents || b.openPayoutCents - a.openPayoutCents),
      refunded: { vouchers: refunded?.n ?? 0, grossCents: refunded?.gross ?? 0 },
    };
  }

  /** The latest vouchers bought, redeemed or refunded, across all businesses. */
  adminVouchers(view: 'bought' | 'used' | 'refunded', limit = 25): Promise<AdminVoucherDTO[]> {
    if (view === 'used') return this.adminVouchersWhere(this.sql`v.redeemed_at IS NOT NULL`, this.sql`v.redeemed_at DESC`, limit);
    // Same rule as the refunds list: only vouchers whose status is refunded.
    if (view === 'refunded') {
      return this.adminVouchersWhere(this.sql`v.status = 'refunded' AND v.refunded_at IS NOT NULL`, this.sql`v.refunded_at DESC, v.id DESC`, limit);
    }
    return this.adminVouchersWhere(this.sql`true`, this.sql`v.issued_at DESC`, limit);
  }

  private async adminVouchersWhere(where: ReturnType<Sql>, order: ReturnType<Sql>, limit: number): Promise<AdminVoucherDTO[]> {
    const rows = await this.sql<{
      code: string; status: VoucherStatus; is_test: boolean; price_cents: number; vat_bps: number;
      title: LocalizedText; option_label: LocalizedText | null; recipient_name: string | null;
      issued_at: string; expires_at: string; cancellable_until: string | null; redeemed_at: string | null; refunded_at: string | null;
      merchant_id: string; merchant_name: string; deal_id: string; slug: string;
      order_id: string; number: string; order_status: string; email: string; first_name: string; last_name: string; phone: string | null;
      payment_method: string; total_cents: number; created_at: string; paid_at: string | null; email_status: string;
    }[]>`
      SELECT v.code, v.status, v.is_test, v.price_cents, oi.vat_bps, oi.title, oi.option_label, v.recipient_name,
        to_json(v.issued_at) AS issued_at, to_json(v.expires_at) AS expires_at, to_json(v.cancellable_until) AS cancellable_until,
        to_json(v.redeemed_at) AS redeemed_at, to_json(v.refunded_at) AS refunded_at,
        v.merchant_id, m.display_name AS merchant_name, v.deal_id, d.slug,
        o.id AS order_id, o.number, o.status AS order_status, o.email, o.first_name, o.last_name, o.phone,
        o.payment_method, o.total_cents, to_json(o.created_at) AS created_at, to_json(o.paid_at) AS paid_at, o.email_status
      FROM public.vouchers v
      JOIN public.order_items oi ON oi.id = v.order_item_id
      JOIN public.orders o ON o.id = v.order_id
      JOIN public.merchants m ON m.id = v.merchant_id
      JOIN public.deals d ON d.id = v.deal_id
      WHERE ${where} ORDER BY ${order} LIMIT ${limit}`;
    return rows.map((r) => ({
      code: r.code,
      // An active voucher past its date is shown as expired, as the lookup does.
      status: r.status === 'active' && Date.parse(r.expires_at) < Date.now() ? 'expired' : r.status,
      test: r.is_test, title: r.title, optionLabel: r.option_label,
      priceCents: r.price_cents, vatBps: r.vat_bps, payoutCents: payoutCents(r.price_cents, r.vat_bps, this.policy),
      issuedAt: iso(r.issued_at), expiresAt: iso(r.expires_at), cancellableUntil: isoOrNull(r.cancellable_until),
      redeemedAt: isoOrNull(r.redeemed_at), refundedAt: isoOrNull(r.refunded_at), recipientName: r.recipient_name,
      merchant: { id: r.merchant_id, name: r.merchant_name }, deal: { id: r.deal_id, slug: r.slug },
      order: {
        id: r.order_id, number: r.number, status: r.order_status, email: r.email, name: `${r.first_name} ${r.last_name}`.trim(),
        phone: r.phone, paymentMethod: r.payment_method, totalCents: r.total_cents,
        createdAt: iso(r.created_at), paidAt: isoOrNull(r.paid_at), emailStatus: r.email_status,
      },
    }));
  }

  /** Business lookup is scoped to the merchant from the verified membership. */
  async lookupForMerchant(rawCode: string, merchantId: string): Promise<RedeemLookupDTO> {
    const parsed = voucherCodeSchema.safeParse(rawCode);
    if (!parsed.success) return { code: rawCode.trim().toUpperCase(), result: 'not_found' };
    const [row] = await this.sql<{ merchant_id: string }[]>`SELECT merchant_id FROM public.vouchers WHERE code = ${parsed.data}`;
    if (!row) return { code: parsed.data, result: 'not_found' };
    if (row.merchant_id !== merchantId) return { code: parsed.data, result: 'other_merchant' };
    return this.lookup(parsed.data);
  }

  /** Verification for the merchant redemption page, reached by scanning the QR code. */
  async lookup(rawCode: string): Promise<RedeemLookupDTO> {
    const parsed = voucherCodeSchema.safeParse(rawCode);
    const code = parsed.success ? parsed.data : rawCode.trim().toUpperCase();
    if (!parsed.success) return { code, result: "not_found" };
    const [row] = await this.sql<{
      status: VoucherStatus; is_test: boolean; expires_at: string; redeemed_at: string | null;
      title: LocalizedText; option_label: LocalizedText | null;
    }[]>`
      SELECT v.status, v.is_test, to_json(v.expires_at) AS expires_at, to_json(v.redeemed_at) AS redeemed_at,
        oi.title, oi.option_label
      FROM public.vouchers v JOIN public.order_items oi ON oi.id = v.order_item_id
      WHERE v.code = ${code}`;
    if (!row) return { code, result: "not_found" };
    const result: RedeemLookupDTO["result"] = row.status === "redeemed" ? "redeemed"
      : row.status === "refunded" ? "refunded"
      : row.status === "expired" || Date.parse(row.expires_at) < Date.now() ? "expired" : "valid";
    return {
      code, result, test: row.is_test, title: row.title, optionLabel: row.option_label,
      expiresAt: iso(row.expires_at), redeemedAt: isoOrNull(row.redeemed_at),
    };
  }

  private async authorized(orderId: string, token: string | undefined) {
    if (!token || !uuidSchema.safeParse(orderId).success) return null;
    const loaded = await this.load(orderId);
    return loaded && loaded.tokenHash === hashToken(token) ? loaded : null;
  }

  private async load(orderId: string) {
    const [order] = await this.sql<(OrderRow & { access_token_hash: string })[]>`
      SELECT id, number, status, is_test, locale, email, first_name, last_name, payment_method,
        total_cents, to_json(created_at) AS created_at, email_status, gift_message, access_token_hash
      FROM public.orders WHERE id = ${orderId}`;
    if (!order) return null;
    const rows = await this.sql<VoucherRow[]>`
      SELECT v.code, v.qr_payload, v.status, v.is_test, v.price_cents, v.recipient_name,
        to_json(v.issued_at) AS issued_at, to_json(v.expires_at) AS expires_at,
        to_json(v.cancellable_until) AS cancellable_until, to_json(v.redeemed_at) AS redeemed_at,
        to_json(v.refunded_at) AS refunded_at,
        oi.title, oi.option_label, oi.vat_bps, oi.merchant_name,
        d.slug, d.image_url, d.how_to, d.terms, d.street, d.zip, d.city_id, d.meeting_point, d.service_area,
        c.name AS city_name,
        coalesce((SELECT jsonb_agg(cc.name ORDER BY cc.sort_order, cc.id) FROM public.deal_cities dc
          JOIN public.cities cc ON cc.id = dc.city_id WHERE dc.deal_id = d.id), '[]'::jsonb) AS coverage,
        m.company_name, m.business_id, m.public_phone, m.public_email, m.website
      FROM public.vouchers v
      JOIN public.order_items oi ON oi.id = v.order_item_id
      JOIN public.deals d ON d.id = v.deal_id
      JOIN public.merchants m ON m.id = v.merchant_id
      LEFT JOIN public.cities c ON c.id = d.city_id
      WHERE v.order_id = ${orderId}
      ORDER BY oi.line_no, v.code`;
    const L = order.locale;
    const documents = rows.map((row): VoucherDocument => ({
      code: row.code, qrPayload: row.qr_payload, title: row.title, optionLabel: row.option_label,
      merchant: {
        name: row.merchant_name, companyName: row.company_name, businessId: row.business_id,
        phone: row.public_phone ?? "", email: row.public_email ?? undefined, website: row.website ?? undefined,
      },
      address: row.street ? `${row.street}${row.zip || row.city_name ? "," : ""} ${[row.zip, pick(row.city_name, L)].filter(Boolean).join(" ")}`.trim() : null,
      serviceArea: row.service_area, cities: row.coverage.map((name) => pick(name, L)),
      howTo: row.how_to, terms: row.terms, dealUrl: `${this.config.siteUrl}/${L}/deals/${row.slug}`,
      priceCents: row.price_cents, vatBps: row.vat_bps,
      issuedAt: iso(row.issued_at), expiresAt: iso(row.expires_at),
      orderNumber: order.number, buyerName: `${order.first_name} ${order.last_name}`,
      recipientName: row.recipient_name, giftMessage: row.recipient_name ? order.gift_message : null,
    }));
    return { order, rows, documents, tokenHash: order.access_token_hash };
  }

  private async pdfFor(loaded: NonNullable<Awaited<ReturnType<OrderService["load"]>>>) {
    const bytes = await renderVoucherPdf(loaded.documents, {
      locale: loaded.order.locale, validityMonths: this.policy.voucherValidityMonths,
      refundWindowDays: this.policy.refundWindowDays, supportEmail: this.config.mail.replyTo, siteUrl: this.config.siteUrl,
    });
    return { bytes, filename: `${voucherText(loaded.order.locale).fileName}-${loaded.order.number}.pdf` };
  }

  /** Order numbers and voucher codes are random; on the rare clash the whole order is retried. */
  private async withUniqueRetry<T>(run: () => Promise<T>, attempts = 3): Promise<T> {
    for (let attempt = 1; ; attempt++) {
      try {
        return await run();
      } catch (error) {
        const clash = (error as { code?: string }).code === "23505";
        if (!clash || attempt >= attempts) throw error;
      }
    }
  }
}

/** The voucher card shows the booking steps as one paragraph. */
function howToText(list: LocalizedList): LocalizedText | null {
  const join = (items: string[]) => items.join(" ");
  return list.fi.length ? { fi: join(list.fi), sv: join(list.sv), en: join(list.en) } : null;
}

/** What the business receives for one voucher: commission is charged on the VAT-exclusive price, with VAT on it. */
function payoutCents(grossCents: number, vatBps: number, policy: PlatformConfig) {
  return voucherSplit(grossCents, vatBps, policy).payoutCents;
}

function voucherSplit(grossCents: number, vatBps: number, policy: PlatformConfig) {
  const netCents = Math.round((grossCents * 10000) / (10000 + vatBps));
  const commissionCents = Math.round((netCents * policy.commissionBps) / 10000);
  const commissionVatCents = Math.round((commissionCents * policy.commissionVatBps) / 10000);
  const feeCents = commissionCents + commissionVatCents;
  return { grossCents, netCents, saleVatCents: grossCents - netCents, commissionCents,
    commissionVatCents, feeCents, payoutCents: grossCents - feeCents };
}
