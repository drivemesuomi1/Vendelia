import type { Locale } from '@vendelia/shared';
import { companyLine } from './text';

const TEXT = {
  fi: {
    subject: (code: string) => `Hyvitys lahjakortille ${code}`,
    hello: (name: string) => (name ? `Hei ${name},` : 'Hei,'),
    intro: 'hyvityspyyntösi on käsitelty ja lahjakortti on hyvitetty. Lahjakorttia ei voi enää käyttää.',
    voucher: 'Lahjakortti', deal: 'Tarjous', amount: 'Hyvitettävä summa',
    money: 'Hyvitys palautetaan alkuperäiselle maksutavalle, yleensä 5 arkipäivän kuluessa.',
    help: 'Jos sinulla on kysyttävää, vastaa tähän viestiin.',
    regards: 'Ystävällisin terveisin,\nVendelia',
  },
  sv: {
    subject: (code: string) => `Återbetalning för presentkort ${code}`,
    hello: (name: string) => (name ? `Hej ${name},` : 'Hej,'),
    intro: 'din begäran om återbetalning har behandlats och presentkortet har återbetalats. Presentkortet kan inte längre användas.',
    voucher: 'Presentkort', deal: 'Erbjudande', amount: 'Belopp som återbetalas',
    money: 'Återbetalningen går till ditt ursprungliga betalningssätt, vanligtvis inom 5 vardagar.',
    help: 'Har du frågor kan du svara på detta meddelande.',
    regards: 'Vänliga hälsningar,\nVendelia',
  },
  en: {
    subject: (code: string) => `Refund for voucher ${code}`,
    hello: (name: string) => (name ? `Hi ${name},` : 'Hi,'),
    intro: 'your refund request has been reviewed and the voucher has been refunded. The voucher can no longer be used.',
    voucher: 'Voucher', deal: 'Deal', amount: 'Refund amount',
    money: 'The refund goes back to your original payment method, usually within 5 working days.',
    help: 'If you have any questions, just reply to this email.',
    regards: 'Kind regards,\nVendelia',
  },
} satisfies Record<Locale, unknown>;

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);

/** Short confirmation to the customer once an admin has recorded their refund. */
export function buildRefundEmail(input: { locale: Locale; name: string; code: string; deal: string; amountCents: number }) {
  const t = TEXT[input.locale];
  const amount = `${(input.amountCents / 100).toFixed(2).replace('.', ',')} €`;
  const rows: [string, string][] = [[t.voucher, input.code], [t.deal, input.deal], [t.amount, amount]];
  const text = [t.hello(input.name), t.intro, '', ...rows.map(([k, v]) => `${k}: ${v}`), '', t.money, t.help, '', t.regards, '', companyLine(input.locale)].join('\n');
  const html = `<!doctype html>
<html lang="${input.locale}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(t.subject(input.code))}</title></head>
<body style="margin:0;padding:20px 16px;font-family:Segoe UI,Helvetica,Arial,sans-serif;font-size:15px;line-height:1.5;color:#17223B">
<div style="max-width:520px">
<p style="margin:0 0 16px">${esc(t.hello(input.name))}<br>${esc(t.intro)}</p>
<table style="font-size:14px;border-collapse:collapse;margin:0 0 16px">${rows.map(([k, v]) =>
    `<tr><td style="padding:4px 16px 4px 0;color:#4A5468">${esc(k)}</td><td style="padding:4px 0"><b>${esc(v)}</b></td></tr>`).join('')}</table>
<p style="margin:0 0 12px;font-size:13px;color:#4A5468">${esc(t.money)} ${esc(t.help)}</p>
<p style="margin:0;white-space:pre-line">${esc(t.regards)}</p>
<p style="margin:16px 0 0;font-size:12px;color:#6B7385">${esc(companyLine(input.locale))}</p>
</div>
</body></html>`;
  return { subject: t.subject(input.code), text, html };
}
