import type { Locale } from "@vendelia/shared";
import type { VoucherDocument } from "./pdf";
import { formatDate, pick, voucherText } from "./text";

export interface VoucherEmailInput {
  locale: Locale;
  firstName: string;
  orderNumber: string;
  test: boolean;
  vouchers: VoucherDocument[];
  supportEmail: string;
  siteUrl: string;
}

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

/** Subject, plain text and HTML for the voucher email (the PDF is attached separately). */
export function buildVoucherEmail(input: VoucherEmailInput) {
  const t = voucherText(input.locale);
  const L = input.locale;
  const first = input.vouchers[0]!;
  const subject = (input.test ? t.testSubject : "")
    + (input.vouchers.length === 1 ? t.subject(pick(first.title, L)) : t.subjectMany(input.vouchers.length));
  const name = (v: VoucherDocument) => [pick(v.title, L), pick(v.optionLabel, L)].filter(Boolean).join(" – ");

  const text = [
    t.hello(input.firstName), "", t.thanks, t.showIt, "",
    ...(input.test ? [t.testNote, ""] : []),
    ...input.vouchers.flatMap((v) => [
      name(v),
      `${t.code}: ${v.code}`,
      `${t.validUntil}: ${formatDate(v.expiresAt, L)}`,
      `${t.merchant}: ${v.merchant.name}${v.merchant.phone ? `, ${v.merchant.phone}` : ""}`,
      "",
    ]),
    `${t.orderNumber}: ${input.orderNumber}`, "",
    `${t.questions} ${input.supportEmail}.`, "", t.regards, input.siteUrl,
  ].join("\n");

  const cards = input.vouchers.map((v) => `
    <tr><td style="padding:0 0 12px">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F1EFFE;border-radius:12px">
        <tr><td style="padding:18px 20px">
          <div style="font-size:16px;font-weight:700;color:#17223B;line-height:1.35">${esc(pick(v.title, L))}</div>
          ${v.optionLabel ? `<div style="font-size:14px;font-weight:700;color:#0B7A75;margin-top:4px">${esc(pick(v.optionLabel, L))}</div>` : ""}
          <div style="margin-top:12px;font-size:12px;color:#4A5468">${esc(t.code)}</div>
          <div style="font-family:'Courier New',Courier,monospace;font-size:22px;font-weight:700;color:#3B32B3;letter-spacing:1px">${esc(v.code)}</div>
          <div style="margin-top:10px;font-size:13px;color:#17223B">${esc(t.validUntil)}: <b>${esc(formatDate(v.expiresAt, L))}</b></div>
          <div style="font-size:13px;color:#4A5468">${esc(v.merchant.name)}${v.merchant.phone ? ` · ${esc(v.merchant.phone)}` : ""}</div>
          ${v.recipientName ? `<div style="margin-top:6px;font-size:13px;color:#3B32B3"><b>${esc(t.giftFor)}: ${esc(v.recipientName)}</b></div>` : ""}
        </td></tr>
      </table>
    </td></tr>`).join("");

  const html = `<!doctype html>
<html lang="${L}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(subject)}</title></head>
<body style="margin:0;padding:0;background:#F7F8FC;font-family:Inter,Segoe UI,Helvetica,Arial,sans-serif;color:#17223B">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F7F8FC;padding:24px 12px">
    <tr><td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#FFFFFF;border:1px solid #E3E5EE;border-radius:16px">
        <tr><td style="padding:24px 28px 8px">
          <span style="font-size:22px;font-weight:800;letter-spacing:-0.5px;color:#17223B"><span style="color:#3B32B3">V</span>endelia</span>
        </td></tr>
        ${input.test ? `<tr><td style="padding:8px 28px 0"><div style="background:#FDECEA;color:#B42318;border-radius:8px;padding:10px 14px;font-size:13px;font-weight:700">${esc(t.testNote)}</div></td></tr>` : ""}
        <tr><td style="padding:16px 28px 4px;font-size:15px;line-height:1.55">
          <p style="margin:0 0 8px">${esc(t.hello(input.firstName))}</p>
          <p style="margin:0 0 8px">${esc(t.thanks)}</p>
          <p style="margin:0 0 16px;color:#4A5468">${esc(t.showIt)}</p>
        </td></tr>
        <tr><td style="padding:0 28px"><table role="presentation" width="100%" cellpadding="0" cellspacing="0">${cards}</table></td></tr>
        <tr><td style="padding:4px 28px 24px;font-size:13px;color:#4A5468;line-height:1.55">
          <p style="margin:0 0 4px">${esc(t.orderNumber)}: <b style="color:#17223B">${esc(input.orderNumber)}</b></p>
          <p style="margin:0 0 16px">${esc(t.questions)} <a href="mailto:${esc(input.supportEmail)}" style="color:#3B32B3">${esc(input.supportEmail)}</a>.</p>
          <p style="margin:0;white-space:pre-line;color:#17223B">${esc(t.regards)}</p>
          <p style="margin:4px 0 0"><a href="${esc(input.siteUrl)}" style="color:#3B32B3;text-decoration:none">${esc(input.siteUrl.replace(/^https?:\/\//, ""))}</a></p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;

  return { subject, text, html };
}
