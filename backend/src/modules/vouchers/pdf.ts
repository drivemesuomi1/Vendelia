import { PDFDocument, rgb, StandardFonts, type PDFFont, type PDFPage, type RGB } from "pdf-lib";
import QRCode from "qrcode";
import type { Locale, LocalizedList, LocalizedText } from "@vendelia/shared";
import { formatDate, pick, pickList, voucherText } from "./text";

/** Everything printed on one voucher page, taken from the order and the deal it was bought from. */
export interface VoucherDocument {
  code: string;
  qrPayload: string;
  title: LocalizedText;
  optionLabel: LocalizedText | null;
  merchant: { name: string; companyName: string; businessId: string; phone: string; email?: string; website?: string };
  /** Street address, e.g. "Siltasaarenkatu 22, 00530 Helsinki"; null for services at the customer's place. */
  address: string | null;
  serviceArea: LocalizedText | null;
  /** Localized names of the cities the voucher can be used in. */
  cities: string[];
  howTo: LocalizedList;
  terms: LocalizedList;
  /** Deal page, linked when the terms do not all fit on the page. */
  dealUrl: string;
  priceCents: number;
  vatBps: number;
  issuedAt: string;
  expiresAt: string;
  orderNumber: string;
  buyerName: string;
  recipientName: string | null;
  giftMessage: string | null;
}

export interface VoucherPdfOptions {
  locale: Locale;
  validityMonths: number;
  refundWindowDays: number;
  supportEmail: string;
  siteUrl: string;
}

const hex = (value: string): RGB => rgb(
  parseInt(value.slice(1, 3), 16) / 255, parseInt(value.slice(3, 5), 16) / 255, parseInt(value.slice(5, 7), 16) / 255,
);
const C = { ink: hex("#1A1A1A"), link: hex("#1F2FD1"), indigo: hex("#3B32B3"), teal: hex("#0B7A75"), navy: hex("#17223B") };

// The V symbol from the site logo (viewBox 0 0 68 48).
const LOGO_INDIGO = "M1.5 1.2h14.6c4.1 0 6.6 1.9 8.6 5.2l13.4 22.4c1.1 1.8 2.9 1.8 3.9 0l3.7-6.5c2.3 3.8 2.6 7.6-.2 11.2l-4.6 5.1C35.4 44 24 46.4 17.6 36.1L1 2.4c-.3-.6 0-1.2.5-1.2z";
const LOGO_TEAL = "M28.6 15.8 33.9 6.6C37 2.5 40.4 1.2 44.5 1.2h14.6c.8 0 1 .7.4 1.2-2.7 2.1-4.2 4.1-5.7 6.8L42 30.7c-1.1 1.9-2.6 1.9-3.7 0z";

const PAGE_W = 595.28;
const PAGE_H = 841.89;
const M = 76;
/** Left text column and the QR column beside it. */
const LEFT_W = 300;
const QR_X = 412;
const QR_SIZE = 112;

/** One A4 page per voucher, in the order's language: a plain, printable layout. */
export async function renderVoucherPdf(vouchers: VoucherDocument[], options: VoucherPdfOptions): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const t = voucherText(options.locale);
  doc.setTitle(`${t.voucher} ${vouchers.map((v) => v.code).join(", ")}`);
  doc.setAuthor("Vendelia");
  doc.setCreator("Vendelia");
  doc.setLanguage(options.locale);
  const fonts = {
    regular: await doc.embedFont(StandardFonts.TimesRoman),
    bold: await doc.embedFont(StandardFonts.TimesRomanBold),
    italic: await doc.embedFont(StandardFonts.TimesRomanItalic),
    brand: await doc.embedFont(StandardFonts.HelveticaBold),
  };
  for (const voucher of vouchers) drawVoucher(doc.addPage([PAGE_W, PAGE_H]), voucher, fonts, options);
  return doc.save();
}

type Fonts = Record<"regular" | "bold" | "italic" | "brand", PDFFont>;

function drawVoucher(page: PDFPage, v: VoucherDocument, f: Fonts, o: VoucherPdfOptions) {
  const t = voucherText(o.locale);
  const L = o.locale;
  const text = (s: string, x: number, y: number, size: number, font: PDFFont, color = C.ink) =>
    page.drawText(safe(s, font), { x, y, size, font, color });

  // Logo.
  let y = PAGE_H - 64;
  page.drawSvgPath(LOGO_INDIGO, { x: M, y, scale: 0.5, color: C.indigo });
  page.drawSvgPath(LOGO_TEAL, { x: M, y, scale: 0.5, color: C.teal });
  text("Vendelia", M + 40, y - 18, 19, f.brand, C.navy);

  // Voucher code in a thin box.
  y = PAGE_H - 140;
  const codeLine = `${t.code}: ${v.code}`;
  const boxW = Math.max(222, f.bold.widthOfTextAtSize(safe(codeLine, f.bold), 10.5) + 14);
  page.drawRectangle({ x: M, y: y - 20, width: boxW, height: 20, borderColor: C.ink, borderWidth: 1 });
  text(codeLine, M + 5, y - 14, 10.5, f.bold);

  // Chosen option (or the deal title when it has no options).
  y -= 58;
  const option = pick(v.optionLabel, L);
  const heading = option ? `${t.chosen}: ${option}` : pick(v.title, L);
  for (const line of wrap(heading, f.bold, 15.5, LEFT_W)) { text(line, M, y, 15.5, f.bold); y -= 18.5; }
  y -= 4;

  // Redemption instructions on the left, the QR for the merchant on the right.
  const blockTop = y;
  let ly = underlined(page, `${t.howTo}:`, M, y, 10, f.bold);
  const own = pickList(v.howTo, L);
  const steps = [t.validFor(o.validityMonths), ...(own.length ? own : [t.show])];
  for (const step of steps) ly = para(page, `- ${step}`, M, ly, LEFT_W, 9.5, f.bold, C.ink, 12);
  ly = para(page, `${t.redeemBy}: ${formatDate(v.expiresAt, L)}`, M, ly, LEFT_W, 9.5, f.bold, C.ink, 12);
  if (v.recipientName) {
    ly -= 6;
    ly = para(page, `${t.giftFor}: ${v.recipientName}`, M, ly, LEFT_W, 9.5, f.bold, C.ink, 12);
    if (v.giftMessage) ly = para(page, `"${v.giftMessage}"`, M, ly, LEFT_W, 9.5, f.italic, C.ink, 12);
  }

  text(`${t.forMerchant}:`, QR_X, blockTop, 12, f.bold);
  drawQr(page, v.qrPayload, QR_X, blockTop - 12, QR_SIZE);
  y = Math.min(ly, blockTop - 12 - QR_SIZE) - 40;

  // Company details.
  y = underlined(page, `${t.company}:`, M, y, 10, f.bold);
  const website = v.merchant.website?.replace(/\/$/, "");
  for (const line of [v.merchant.name, v.address, v.merchant.phone, website]) {
    if (line) y = para(page, line, M, y, PAGE_W - 2 * M, 9.5, f.bold, C.ink, 12);
  }
  y -= 30;

  // Where the voucher can be used: the address, or the service area for services at the customer's place.
  y = underlined(page, `${v.address ? t.locations : t.serviceArea}:`, M, y, 10, f.bold);
  const where = v.address ? `${v.merchant.name}, ${v.address}` : (pick(v.serviceArea, L) || v.cities.join(", "));
  y = para(page, where, M, y, PAGE_W - 2 * M, 9.5, f.bold, C.link, 12);

  // Footer: customer service on the left, right of withdrawal on the right.
  let fy = Math.min(y - 50, 236);
  fy = underlined(page, `${t.support}:`, M, fy, 10, f.bold);
  text(`${t.email}: ${o.supportEmail}`, M, fy, 9.5, f.bold);
  fy -= 12;
  const site = o.siteUrl.replace(/^https?:\/\//, "").replace(/\/$/, "");
  text(site, M, fy, 9.5, f.regular, C.link);
  page.drawLine({ start: { x: M, y: fy - 1.5 }, end: { x: M + f.regular.widthOfTextAtSize(site, 9.5), y: fy - 1.5 }, thickness: 0.6, color: C.link });

  const cx = 312;
  let cy = Math.min(y - 50, 236) + 2;
  text(t.cancelTitle, cx, cy, 7.5, f.bold);
  cy -= 14;
  para(page, t.cancel(o.refundWindowDays), cx, cy, PAGE_W - M + 20 - cx, 7.5, f.bold, C.ink, 9.5);
}

/** Bold label with an underline, as section headings; returns the y for the first line below it. */
function underlined(page: PDFPage, label: string, x: number, y: number, size: number, font: PDFFont) {
  const s = safe(label, font);
  page.drawText(s, { x, y, size, font, color: C.ink });
  page.drawLine({ start: { x, y: y - 1.6 }, end: { x: x + font.widthOfTextAtSize(s, size), y: y - 1.6 }, thickness: 0.6, color: C.ink });
  return y - size - 3;
}

function para(page: PDFPage, value: string, x: number, y: number, width: number, size: number, font: PDFFont, color: RGB, lead: number) {
  for (const line of wrap(value, font, size, width)) {
    page.drawText(safe(line, font), { x, y, size, font, color });
    y -= lead;
  }
  return y;
}

/** Vector QR code (crisp at any print size); size is the module area, top-left at (x, top). */
function drawQr(page: PDFPage, payload: string, x: number, top: number, size: number) {
  const qr = QRCode.create(payload, { errorCorrectionLevel: "M" });
  const n = qr.modules.size;
  const cell = size / n;
  for (let row = 0; row < n; row++) {
    // Merge horizontal runs of dark modules into one rectangle each.
    for (let col = 0; col < n; col++) {
      if (!qr.modules.get(row, col)) continue;
      let end = col;
      while (end + 1 < n && qr.modules.get(row, end + 1)) end++;
      page.drawRectangle({ x: x + col * cell, y: top - (row + 1) * cell, width: (end - col + 1) * cell, height: cell, color: C.ink });
      col = end;
    }
  }
}

/** Splits text into lines that fit `width`; words longer than a line are broken. */
export function wrap(value: string, font: PDFFont, size: number, width: number): string[] {
  const lines: string[] = [];
  for (const paragraph of safe(value, font).split(/\n+/)) {
    let line = "";
    for (const word of paragraph.split(/\s+/).filter(Boolean)) {
      const candidate = line ? `${line} ${word}` : word;
      if (font.widthOfTextAtSize(candidate, size) <= width) { line = candidate; continue; }
      if (line) lines.push(line);
      line = word;
      while (font.widthOfTextAtSize(line, size) > width && line.length > 1) {
        let cut = line.length - 1;
        while (cut > 1 && font.widthOfTextAtSize(line.slice(0, cut), size) > width) cut--;
        lines.push(line.slice(0, cut));
        line = line.slice(cut);
      }
    }
    if (line) lines.push(line);
  }
  return lines;
}

const encodable = new Map<string, boolean>();
const REPLACE: Record<string, string> = { "→": "->", "✓": "", "−": "-", " ": " ", " ": " ", " ": " " };

/** Standard PDF fonts cover Western European text (ä, ö, å, €, –); anything else is replaced, not dropped silently. */
export function safe(value: string, font: PDFFont) {
  let out = "";
  for (const ch of value.normalize("NFC")) {
    if (REPLACE[ch] !== undefined) { out += REPLACE[ch]; continue; }
    const key = `${font.name}:${ch}`;
    let ok = encodable.get(key);
    if (ok === undefined) {
      try { font.encodeText(ch); ok = true; } catch { ok = false; }
      encodable.set(key, ok);
    }
    out += ok ? ch : "?";
  }
  return out;
}
