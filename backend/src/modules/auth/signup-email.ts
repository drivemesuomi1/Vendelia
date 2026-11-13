import type { Locale } from '@vendelia/shared';
import { companyLine } from '../vouchers/text';

const TEXT = {
  fi: {
    subject: (code: string) => `Vendelia-vahvistuskoodisi: ${code}`,
    hello: 'Hei,',
    intro: 'kiitos, että luot Vendelia-tilin. Syötä tämä koodi rekisteröitymissivulle:',
    valid: (m: number) => `Koodi on voimassa ${m} minuuttia. Jos et luonut tiliä, voit jättää viestin huomiotta.`,
    regards: 'Ystävällisin terveisin,\nVendelia',
  },
  sv: {
    subject: (code: string) => `Din Vendelia-kod: ${code}`,
    hello: 'Hej,',
    intro: 'tack för att du skapar ett Vendelia-konto. Ange den här koden på registreringssidan:',
    valid: (m: number) => `Koden gäller i ${m} minuter. Om du inte skapade ett konto kan du bortse från meddelandet.`,
    regards: 'Vänliga hälsningar,\nVendelia',
  },
  en: {
    subject: (code: string) => `Your Vendelia code: ${code}`,
    hello: 'Hi,',
    intro: 'thanks for creating a Vendelia account. Enter this code on the sign-up page:',
    valid: (m: number) => `The code works for ${m} minutes. If you didn't create an account, you can ignore this email.`,
    regards: 'Kind regards,\nVendelia',
  },
} satisfies Record<Locale, unknown>;

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);

/** Short sign-up code email in the same plain style as the other emails. The code is also in the subject. */
export function buildSignupCodeEmail(input: { locale: Locale; code: string; minutes: number }) {
  const t = TEXT[input.locale];
  const subject = t.subject(input.code);
  const text = [t.hello, t.intro, '', input.code, '', t.valid(input.minutes), '', t.regards, '', companyLine(input.locale)].join('\n');
  const html = `<!doctype html>
<html lang="${input.locale}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(subject)}</title></head>
<body style="margin:0;padding:20px 16px;font-family:Segoe UI,Helvetica,Arial,sans-serif;font-size:15px;line-height:1.5;color:#17223B">
<div style="max-width:520px">
<p style="margin:0 0 12px">${esc(t.hello)}<br>${esc(t.intro)}</p>
<p style="margin:0 0 16px;padding:14px 16px;background:#F1EFFE;border-radius:8px;font-family:Courier New,monospace;font-size:28px;font-weight:700;letter-spacing:6px;color:#3B32B3">${esc(input.code)}</p>
<p style="margin:0 0 12px;font-size:13px;color:#4A5468">${esc(t.valid(input.minutes))}</p>
<p style="margin:0;white-space:pre-line">${esc(t.regards)}</p>
<p style="margin:16px 0 0;font-size:12px;color:#6B7385">${esc(companyLine(input.locale))}</p>
</div>
</body></html>`;
  return { subject, text, html };
}
