import type { Locale } from "@vendelia/shared";
import type { VoucherDocument } from "./pdf";
import { companyLine, formatDate, pick, voucherText } from "./text";

export interface VoucherEmailInput {
  locale: Locale;
  firstName: string;
  orderNumber: string;
  vouchers: VoucherDocument[];
  supportEmail: string;
  siteUrl: string;
}

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

/**
 * Subject, plain text and HTML for the voucher email (the PDF is attached separately).
 * Kept short and plain on purpose: everything else is in the PDF, and lean mail fares better with spam filters.
 */
export function buildVoucherEmail(input: VoucherEmailInput) {
  const t = voucherText(input.locale);
  const L = input.locale;
  const first = input.vouchers[0]!;
  const subject = (input.vouchers.length === 1 ? t.subject(pick(first.title, L)) : t.subjectMany(input.vouchers.length));
  const name = (v: VoucherDocument) => [pick(v.title, L), pick(v.optionLabel, L)].filter(Boolean).join(" – ");
  const until = (v: VoucherDocument) => `${t.validUntil}: ${formatDate(v.expiresAt, L)}`;

  const text = [
    t.hello(input.firstName), t.thanks, "",
    ...input.vouchers.flatMap((v) => [name(v), `${t.code}: ${v.code}`, until(v), ""]),
    `${t.orderNumber}: ${input.orderNumber}`,
    `${t.questions} ${input.supportEmail}.`, "", t.regards, "", companyLine(L),
  ].join("\n");

  const cards = input.vouchers.map((v) => `
<p style="margin:0 0 16px;padding:12px 16px;background:#F1EFFE;border-radius:8px">
<b>${esc(name(v))}</b><br>
${esc(t.code)}: <b style="font-family:Courier New,monospace;font-size:17px;color:#3B32B3">${esc(v.code)}</b><br>
${esc(until(v))}
</p>`).join("");

  const html = `<!doctype html>
<html lang="${L}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(subject)}</title></head>
<body style="margin:0;padding:20px 16px;font-family:Segoe UI,Helvetica,Arial,sans-serif;font-size:15px;line-height:1.5;color:#17223B">
<div style="max-width:520px">
<p style="margin:0 0 12px">${esc(t.hello(input.firstName))}<br>${esc(t.thanks)}</p>
${cards}
<p style="margin:0 0 12px;font-size:13px;color:#4A5468">${esc(t.orderNumber)}: ${esc(input.orderNumber)}<br>
${esc(t.questions)} <a href="mailto:${esc(input.supportEmail)}" style="color:#3B32B3">${esc(input.supportEmail)}</a>.</p>
<p style="margin:0;white-space:pre-line">${esc(t.regards)}</p>
<p style="margin:16px 0 0;font-size:12px;color:#6B7385">${esc(companyLine(L))}</p>
</div>
</body></html>`;

  return { subject, text, html };
}
