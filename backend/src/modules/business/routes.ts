import type { FastifyInstance } from 'fastify';
import type { Sql } from 'postgres';
import { businessApplicationSchema, COMPANY, type BusinessApplicationInput } from '@vendelia/shared';
import { HttpProblem } from '../../errors';
import type { Mailer } from '../vouchers/mailer';

const esc = (v: string) => v.replace(/[&<>"']/g, c => `&#${c.charCodeAt(0)};`);
type Names = { fi?: string; en?: string; sv?: string } | null;
const pick = (n: Names, id: string) => n?.fi || n?.en || n?.sv || id;

/** Plain-text and HTML email to business support; the applicant's address is the reply-to. */
export function applicationEmail(d: BusinessApplicationInput, category: string, city: string) {
  const rows: [string, string][] = [
    ['Y-tunnus / Business ID', d.businessId],
    ['Yrityksen nimi / Company', d.companyName],
    ['Näkyvä nimi / Display name', d.displayName],
    ['Kategoria / Category', category],
    ['Osoite / Address', `${d.street}, ${d.zip} ${city}`],
    ['Yhteyshenkilö / Contact', d.contactName],
    ['Puhelin / Phone', d.phone],
    ['Sähköposti / Email', d.email],
    ...(d.website ? [['Verkkosivu / Website', d.website] as [string, string]] : []),
    ['Kieli / Language', d.locale],
  ];
  const text = `${rows.map(([k, v]) => `${k}: ${v}`).join('\n')}${d.message ? `\n\nViesti / Message:\n${d.message}` : ''}\n`;
  const html = `<h2 style="font-family:sans-serif">Uusi yrityshakemus / New business application</h2>
<table style="font-family:sans-serif;font-size:14px;border-collapse:collapse">${rows.map(([k, v]) =>
    `<tr><td style="padding:4px 16px 4px 0;color:#555">${esc(k)}</td><td style="padding:4px 0"><b>${esc(v)}</b></td></tr>`).join('')}</table>
${d.message ? `<p style="font-family:sans-serif;font-size:14px;white-space:pre-wrap"><b>Viesti / Message</b><br>${esc(d.message)}</p>` : ''}`;
  return { subject: `Yrityshakemus: ${d.companyName} (${d.businessId})`, text, html };
}

/** "Sell on Vendelia" applications are emailed to business support from the server; nothing is stored. */
export async function businessRoutes(app: FastifyInstance, { sql, mailer, origins, to = COMPANY.businessEmail }: { sql: Sql; mailer: Mailer; origins: string[]; to?: string }) {
  const recent = new Map<string, number[]>();
  app.post('/api/business/apply', async (request, reply) => {
    if (request.headers.origin && !origins.includes(request.headers.origin)) throw new HttpProblem(403, 'forbidden');
    // At most 5 applications per address per hour on this instance.
    const now = Date.now();
    // The site runs the API in-process, so the visitor's address comes from the forwarded header.
    const ip = String(request.headers['x-forwarded-for'] ?? request.ip).split(',')[0]!.trim();
    const hits = (recent.get(ip) ?? []).filter(t => now - t < 3_600_000);
    if (hits.length >= 5) throw new HttpProblem(429, 'applyTooMany');
    if (recent.size > 5000) recent.clear();
    const parsed = businessApplicationSchema.safeParse(request.body);
    if (!parsed.success) {
      const fields: Record<string, string> = {};
      for (const issue of parsed.error.issues) fields[issue.path.join('.')] ??= issue.message;
      return reply.code(400).send({ error: 'validation_failed', message: 'Invalid application', fields });
    }
    const d = parsed.data;
    const [row] = await sql<{ category: Names; city: Names }[]>`
      SELECT (SELECT name FROM public.categories WHERE id = ${d.categoryId} AND active) AS category,
             (SELECT name FROM public.cities WHERE id = ${d.cityId} AND active) AS city`;
    if (!row?.category || !row.city) return reply.code(400).send({ error: 'validation_failed', message: 'Invalid application', fields: { [row?.category ? 'cityId' : 'categoryId']: 'required' } });
    const mail = applicationEmail(d, pick(row.category, d.categoryId), pick(row.city, d.cityId));
    try {
      await mailer.send({ to, replyTo: d.email, attachments: [], ...mail });
    } catch (error) {
      request.log.error({ err: error }, 'business application email failed');
      throw new HttpProblem(503, 'applicationNotSent');
    }
    hits.push(now); recent.set(ip, hits);
    return reply.code(202).send({ ok: true });
  });
}
