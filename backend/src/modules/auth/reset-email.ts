import type { Locale } from '@vendelia/shared';
import { companyLine } from '../vouchers/text';

const TEXT = {
  fi: {
    subject: 'Vendelia-salasanan vaihto',
    hello: 'Hei,',
    intro: 'saimme pyynnön vaihtaa Vendelia-tilisi salasanan. Valitse uusi salasana alla olevasta linkistä.',
    button: 'Vaihda salasana',
    valid: (m: number) => `Linkki on voimassa ${m} minuuttia ja toimii kerran. Jos et pyytänyt vaihtoa, voit jättää viestin huomiotta – salasanasi ei muutu.`,
    regards: 'Ystävällisin terveisin,\nVendelia',
  },
  sv: {
    subject: 'Byt lösenord för Vendelia',
    hello: 'Hej,',
    intro: 'vi fick en begäran om att byta lösenordet för ditt Vendelia-konto. Välj ett nytt lösenord via länken nedan.',
    button: 'Byt lösenord',
    valid: (m: number) => `Länken gäller i ${m} minuter och fungerar en gång. Om du inte bad om bytet kan du bortse från meddelandet – ditt lösenord ändras inte.`,
    regards: 'Vänliga hälsningar,\nVendelia',
  },
  en: {
    subject: 'Reset your Vendelia password',
    hello: 'Hi,',
    intro: 'we received a request to reset the password for your Vendelia account. Choose a new password with the link below.',
    button: 'Set a new password',
    valid: (m: number) => `The link works for ${m} minutes and can be used once. If you didn't ask for this, you can ignore this email – your password won't change.`,
    regards: 'Kind regards,\nVendelia',
  },
} satisfies Record<Locale, unknown>;

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);

/** Short, plain reset email in the same style as the voucher and business emails. */
export function buildResetEmail(input: { locale: Locale; link: string; minutes: number }) {
  const t = TEXT[input.locale];
  const text = [t.hello, t.intro, '', input.link, '', t.valid(input.minutes), '', t.regards, '', companyLine(input.locale)].join('\n');
  const html = `<!doctype html>
<html lang="${input.locale}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(t.subject)}</title></head>
<body style="margin:0;padding:20px 16px;font-family:Segoe UI,Helvetica,Arial,sans-serif;font-size:15px;line-height:1.5;color:#17223B">
<div style="max-width:520px">
<p style="margin:0 0 16px">${esc(t.hello)}<br>${esc(t.intro)}</p>
<p style="margin:0 0 16px"><a href="${esc(input.link)}" style="display:inline-block;padding:10px 18px;background:#3B32B3;color:#FFFFFF;border-radius:8px;text-decoration:none;font-weight:600">${esc(t.button)}</a></p>
<p style="margin:0 0 12px;font-size:13px;color:#4A5468">${esc(t.valid(input.minutes))}</p>
<p style="margin:0;white-space:pre-line">${esc(t.regards)}</p>
<p style="margin:16px 0 0;font-size:12px;color:#6B7385">${esc(companyLine(input.locale))}</p>
</div>
</body></html>`;
  return { subject: t.subject, text, html };
}
