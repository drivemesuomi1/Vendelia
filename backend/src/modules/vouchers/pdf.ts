import { degrees, PDFDocument, rgb, StandardFonts, type PDFFont, type PDFPage, type RGB } from "pdf-lib";
import QRCode from "qrcode";
import type { Locale, LocalizedList, LocalizedText } from "@vendelia/shared";
import { formatDate, formatMoney, formatRate, pick, pickList, voucherText } from "./text";

/** Everything printed on one voucher page, taken from the order and the deal it was bought from. */
export interface VoucherDocument {
  code: string;
  qrPayload: string;
  test: boolean;
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
const C = {
  navy: hex("#17223B"), muted: hex("#4A5468"), soft: hex("#6B7385"), indigo: hex("#3B32B3"),
  teal: hex("#0B7A75"), line: hex("#E3E5EE"), lavender: hex("#F1EFFE"), white: hex("#FFFFFF"),
  danger: hex("#B42318"), dangerBg: hex("#FDECEA"),
};

// The V symbol from the site logo (viewBox 0 0 68 48).
const LOGO_INDIGO = "M1.5 1.2h14.6c4.1 0 6.6 1.9 8.6 5.2l13.4 22.4c1.1 1.8 2.9 1.8 3.9 0l3.7-6.5c2.3 3.8 2.6 7.6-.2 11.2l-4.6 5.1C35.4 44 24 46.4 17.6 36.1L1 2.4c-.3-.6 0-1.2.5-1.2z";
const LOGO_TEAL = "M28.6 15.8 33.9 6.6C37 2.5 40.4 1.2 44.5 1.2h14.6c.8 0 1 .7.4 1.2-2.7 2.1-4.2 4.1-5.7 6.8L42 30.7c-1.1 1.9-2.6 1.9-3.7 0z";

const PAGE_W = 595.28;
const PAGE_H = 841.89;
const M = 48;

/** One A4 page per voucher, in the order's language. */
export async function renderVoucherPdf(vouchers: VoucherDocument[], options: VoucherPdfOptions): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const t = voucherText(options.locale);
  doc.setTitle(`${t.voucher} ${vouchers.map((v) => v.code).join(", ")}`);
  doc.setAuthor("Vendelia");
  doc.setCreator("Vendelia");
  doc.setLanguage(options.locale);
  const fonts = {
    regular: await doc.embedFont(StandardFonts.Helvetica),
    bold: await doc.embedFont(StandardFonts.HelveticaBold),
    italic: await doc.embedFont(StandardFonts.HelveticaOblique),
    mono: await doc.embedFont(StandardFonts.CourierBold),
  };
  vouchers.forEach((voucher, index) => drawVoucher(doc.addPage([PAGE_W, PAGE_H]), voucher, index, vouchers.length, fonts, options));
  return doc.save();
}

type Fonts = Record<"regular" | "bold" | "italic" | "mono", PDFFont>;

function drawVoucher(page: PDFPage, v: VoucherDocument, index: number, count: number, f: Fonts, o: VoucherPdfOptions) {
  const t = voucherText(o.locale);
  const L = o.locale;
  const text = (s: string, x: number, y: number, size: number, font: PDFFont, color = C.navy) =>
    page.drawText(safe(s, font), { x, y, size, font, color });

  if (v.test) {
    // Faint diagonal watermark across the page, drawn first so content stays readable.
    const mark = t.watermark;
    const size = 120;
    const width = f.bold.widthOfTextAtSize(mark, size);
    const angle = 35 * Math.PI / 180;
    page.drawText(mark, {
      x: PAGE_W / 2 - (width / 2) * Math.cos(angle), y: PAGE_H / 2 - (width / 2) * Math.sin(angle) - 40,
      size, font: f.bold, color: C.danger, opacity: 0.07, rotate: degrees(35),
    });
  }

  // Header: logo and wordmark on the left, document label on the right.
  let y = PAGE_H - M;
  page.drawSvgPath(LOGO_INDIGO, { x: M, y, scale: 0.62, color: C.indigo });
  page.drawSvgPath(LOGO_TEAL, { x: M, y, scale: 0.62, color: C.teal });
  text("Vendelia", M + 50, y - 22, 21, f.bold);
  const label = t.voucher;
  text(label, PAGE_W - M - f.bold.widthOfTextAtSize(label, 10), y - 12, 10, f.bold, C.teal);
  if (count > 1) {
    const pageLabel = t.page(index + 1, count);
    text(pageLabel, PAGE_W - M - f.regular.widthOfTextAtSize(pageLabel, 9), y - 26, 9, f.regular, C.soft);
  }
  y -= 44;
  page.drawLine({ start: { x: M, y }, end: { x: PAGE_W - M, y }, thickness: 1, color: C.line });
  y -= 18;

  if (v.test) {
    const lines = wrap(t.testBanner, f.bold, 9.5, PAGE_W - 2 * M - 28);
    const h = 14 + lines.length * 13;
    roundedRect(page, M, y, PAGE_W - 2 * M, h, 8, C.dangerBg);
    lines.forEach((line, i) => text(line, M + 14, y - 18 - i * 13, 9.5, f.bold, C.danger));
    y -= h + 14;
  }

  // Main card: code, title and option on the left; QR for the merchant on the right.
  const cardW = PAGE_W - 2 * M;
  const qrBox = 132;
  const leftW = cardW - qrBox - 3 * 22;
  const titleLines = wrap(pick(v.title, L), f.bold, 17, leftW);
  const optionLines = v.optionLabel ? wrap(pick(v.optionLabel, L), f.bold, 11.5, leftW) : [];
  const giftLines = v.recipientName ? wrap(`${t.giftFor}: ${v.recipientName}`, f.bold, 10, leftW) : [];
  const messageLines = v.giftMessage ? wrap(`"${v.giftMessage}"`, f.italic, 9.5, leftW) : [];
  const leftH = 22 + 30 + 14 + titleLines.length * 20 + optionLines.length * 15
    + (giftLines.length ? 10 + giftLines.length * 13 : 0) + messageLines.length * 12.5 + 18;
  const scanLines = wrap(t.scan, f.regular, 7.5, qrBox);
  const rightH = 22 + 14 + qrBox + 8 + scanLines.length * 9.5 + 18;
  const cardH = Math.max(leftH, rightH);
  roundedRect(page, M, y, cardW, cardH, 14, C.lavender);

  let ly = y - 30;
  text(t.code, M + 22, ly, 9, f.regular, C.muted);
  ly -= 28;
  text(v.code, M + 22, ly, 24, f.mono, C.indigo);
  ly -= 30;
  for (const line of titleLines) { text(line, M + 22, ly, 17, f.bold); ly -= 20; }
  for (const line of optionLines) { text(line, M + 22, ly, 11.5, f.bold, C.teal); ly -= 15; }
  if (giftLines.length) {
    ly -= 8;
    for (const line of giftLines) { text(line, M + 22, ly, 10, f.bold, C.indigo); ly -= 13; }
    for (const line of messageLines) { text(line, M + 22, ly, 9.5, f.italic, C.muted); ly -= 12.5; }
  }

  const qx = M + cardW - 22 - qrBox;
  let ry = y - 30;
  text(t.forMerchant, qx, ry, 9, f.bold);
  ry -= 10;
  roundedRect(page, qx, ry, qrBox, qrBox, 10, C.white);
  drawQr(page, v.qrPayload, qx + 8, ry - 8, qrBox - 16);
  ry -= qrBox + 12;
  for (const line of scanLines) { text(line, qx, ry, 7.5, f.regular, C.muted); ry -= 9.5; }
  y -= cardH + 26;

  // Two columns: how to redeem on the left, the business and where on the right.
  const colGap = 28;
  const leftCol = (cardW - colGap) * 0.56;
  const rightCol = cardW - colGap - leftCol;
  const rx = M + leftCol + colGap;
  let cy = y;
  cy = heading(page, t.howTo, M, cy, f.bold);
  // The deal's own steps when it has them; the generic "show the voucher" step otherwise.
  const own = pickList(v.howTo, L);
  const steps = own.length ? [...own, t.validFor(o.validityMonths)] : [t.validFor(o.validityMonths), t.show];
  for (const step of steps) cy = bullet(page, step, M, cy, leftCol, 9.5, f.regular, C.navy);
  cy -= 6;
  const until = `${t.redeemBy}: ${formatDate(v.expiresAt, L)}`;
  for (const line of wrap(until, f.bold, 11, leftCol)) { text(line, M, cy, 11, f.bold, C.indigo); cy -= 14; }

  let dy = heading(page, t.merchant, rx, y, f.bold);
  dy = para(page, v.merchant.name, rx, dy, rightCol, 10.5, f.bold, C.navy, 14);
  const company = v.merchant.companyName && v.merchant.companyName !== v.merchant.name ? `${v.merchant.companyName} · ` : "";
  dy = para(page, `${company}${t.businessId} ${v.merchant.businessId}`, rx, dy, rightCol, 8.5, f.regular, C.muted, 11.5);
  for (const line of [v.merchant.phone, v.merchant.email, v.merchant.website?.replace(/^https?:\/\//, "").replace(/\/$/, "")]) {
    if (line) dy = para(page, line, rx, dy, rightCol, 9, f.regular, C.navy, 12);
  }
  dy -= 10;
  if (v.address) {
    dy = heading(page, t.place, rx, dy, f.bold);
    dy = para(page, v.address, rx, dy, rightCol, 9.5, f.regular, C.navy, 12.5);
  } else {
    dy = heading(page, t.serviceArea, rx, dy, f.bold);
    const area = pick(v.serviceArea, L) || v.cities.join(", ");
    dy = para(page, area, rx, dy, rightCol, 9.5, f.regular, C.navy, 12.5);
  }
  y = Math.min(cy, dy) - 16;

  // Order details as a single row of label/value pairs.
  page.drawLine({ start: { x: M, y }, end: { x: PAGE_W - M, y }, thickness: 1, color: C.line });
  y -= 18;
  const cells: [string, string][] = [
    [t.orderNumber, v.orderNumber],
    [t.purchased, formatDate(v.issuedAt, L)],
    [`${t.price} (${t.vatIncl(formatRate(v.vatBps, L))})`, formatMoney(v.priceCents, L)],
    [t.buyer, v.buyerName],
  ];
  const cellW = cardW / cells.length;
  cells.forEach(([k, value], i) => {
    const x = M + i * cellW;
    text(fitText(k, f.regular, 7.5, cellW - 10), x, y, 7.5, f.regular, C.soft);
    text(fitText(value, f.bold, 10, cellW - 10), x, y - 14, 10, f.bold);
  });
  y -= 30;
  page.drawLine({ start: { x: M, y }, end: { x: PAGE_W - M, y }, thickness: 1, color: C.line });
  y -= 20;

  // Footer is placed from the bottom; terms fill the space between, and are cut short if needed.
  const footerTop = M + 92;
  const terms = pickList(v.terms, L);
  if (terms.length && y - 30 > footerTop) {
    y = heading(page, t.terms, M, y, f.bold);
    const more = `${t.allTerms} ${v.dealUrl.replace(/^https?:\/\//, "")}`;
    for (const [i, term] of terms.entries()) {
      const lines = wrap(term, f.regular, 8, cardW - 12);
      // Keep room for the link line unless this is the last term.
      const reserve = i < terms.length - 1 ? 12 : 0;
      if (y - lines.length * 10 - reserve < footerTop) {
        text(more, M, y, 8, f.bold, C.indigo);
        break;
      }
      y = bullet(page, term, M, y, cardW, 8, f.regular, C.muted, 10);
    }
  }

  page.drawLine({ start: { x: M, y: footerTop - 8 }, end: { x: PAGE_W - M, y: footerTop - 8 }, thickness: 1, color: C.line });
  let fy = footerTop - 26;
  text(t.support, M, fy, 9, f.bold);
  fy -= 13;
  text(o.supportEmail, M, fy, 9, f.regular, C.indigo);
  fy -= 12;
  text(o.siteUrl.replace(/^https?:\/\//, ""), M, fy, 9, f.regular, C.indigo);
  const cancelX = M + cardW * 0.45;
  const cancelW = cardW * 0.55;
  let ky = footerTop - 26;
  text(t.cancelTitle, cancelX, ky, 7.5, f.bold);
  ky -= 10;
  for (const line of wrap(t.cancel(o.refundWindowDays), f.regular, 7, cancelW)) { text(line, cancelX, ky, 7, f.regular, C.muted); ky -= 9; }
}

function heading(page: PDFPage, label: string, x: number, y: number, font: PDFFont) {
  page.drawText(safe(label.toUpperCase(), font), { x, y, size: 8.5, font, color: C.teal });
  return y - 16;
}

function para(page: PDFPage, value: string, x: number, y: number, width: number, size: number, font: PDFFont, color: RGB, lead: number) {
  for (const line of wrap(value, font, size, width)) {
    page.drawText(safe(line, font), { x, y, size, font, color });
    y -= lead;
  }
  return y;
}

function bullet(page: PDFPage, value: string, x: number, y: number, width: number, size: number, font: PDFFont, color: RGB, lead = size + 3.5) {
  page.drawText("•", { x, y, size, font, color: C.teal });
  return para(page, value, x + 11, y, width - 11, size, font, color, lead) - 2;
}

/** Rounded rectangle whose top-left corner is (x, top). */
function roundedRect(page: PDFPage, x: number, top: number, w: number, h: number, r: number, color: RGB) {
  const path = `M${r} 0 H${w - r} Q${w} 0 ${w} ${r} V${h - r} Q${w} ${h} ${w - r} ${h} H${r} Q0 ${h} 0 ${h - r} V${r} Q0 0 ${r} 0 Z`;
  page.drawSvgPath(path, { x, y: top, color });
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
      page.drawRectangle({ x: x + col * cell, y: top - (row + 1) * cell, width: (end - col + 1) * cell, height: cell, color: C.navy });
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

function fitText(value: string, font: PDFFont, size: number, width: number) {
  let s = safe(value, font);
  if (font.widthOfTextAtSize(s, size) <= width) return s;
  while (s.length > 1 && font.widthOfTextAtSize(`${s}…`, size) > width) s = s.slice(0, -1);
  return `${s}…`;
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
