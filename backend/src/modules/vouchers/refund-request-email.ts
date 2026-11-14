const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);

export interface RefundRequestEmailInput {
  code: string; orderNumber: string; deal: string; amountCents: number;
  customerName: string; customerEmail: string; reason: string; test: boolean;
}

/** Internal email to customer service when a customer requests a refund; the customer's address is the reply-to. */
export function buildRefundRequestEmail(d: RefundRequestEmailInput) {
  const amount = `${(d.amountCents / 100).toFixed(2).replace('.', ',')} €`;
  const rows: [string, string][] = [
    ['Lahjakortti / Voucher', d.code], ['Tilaus / Order', d.orderNumber], ['Tarjous / Deal', d.deal], ['Summa / Amount', amount],
    ['Asiakas / Customer', d.customerName], ['Sähköposti / Email', d.customerEmail],
    ...(d.test ? [['Huom / Note', 'Testilahjakortti / Test voucher'] as [string, string]] : []),
  ];
  const subject = `Hyvityspyyntö / Refund request: ${d.code}`;
  const text = `${rows.map(([k, v]) => `${k}: ${v}`).join('\n')}${d.reason ? `\n\nSyy / Reason:\n${d.reason}` : ''}\n\nKäsittele pyyntö ylläpidon Hyvitykset-näkymässä / Review it in the admin Refunds screen.\n`;
  const html = `<h2 style="font-family:sans-serif">Uusi hyvityspyyntö / New refund request</h2>
<table style="font-family:sans-serif;font-size:14px;border-collapse:collapse">${rows.map(([k, v]) =>
    `<tr><td style="padding:4px 16px 4px 0;color:#555">${esc(k)}</td><td style="padding:4px 0"><b>${esc(v)}</b></td></tr>`).join('')}</table>
${d.reason ? `<p style="font-family:sans-serif;font-size:14px;white-space:pre-wrap"><b>Syy / Reason</b><br>${esc(d.reason)}</p>` : ''}
<p style="font-family:sans-serif;font-size:13px;color:#555">Käsittele pyyntö ylläpidon Hyvitykset-näkymässä / Review it in the admin Refunds screen.</p>`;
  return { subject, text, html };
}
