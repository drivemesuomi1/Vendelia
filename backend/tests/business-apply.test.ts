import assert from 'node:assert/strict';
import { it } from 'node:test';
import Fastify from 'fastify';
import type { Sql } from 'postgres';
import { businessRoutes } from '../src/modules/business/routes.js';
import type { MailMessage } from '../src/modules/vouchers/mailer.js';

const valid = {
  businessId: '1234567-8', companyName: 'Testi Oy', displayName: 'Testi', categoryId: 'restaurants', cityId: 'helsinki',
  street: 'Katu 1', zip: '00100', contactName: 'Maija <b>', phone: '+358401234567', email: 'Owner@Example.com', message: 'Hei', locale: 'en',
};
function setup(fail = false) {
  const sent: MailMessage[] = [];
  const sql = (async () => [{ category: { fi: 'Ravintolat', en: 'Restaurants' }, city: { fi: 'Helsinki' } }]) as unknown as Sql;
  const app = Fastify();
  app.register(businessRoutes, { sql, origins: ['http://localhost:3000'], to: 'tuki@example.test',
    mailer: { send: async m => { if (fail) throw new Error('smtp down'); sent.push(m); return { id: 'x' }; } } });
  return { app, sent };
}

it('emails a valid application to business support with the applicant as reply-to', async () => {
  const { app, sent } = setup();
  const res = await app.inject({ method: 'POST', url: '/api/business/apply', payload: valid, headers: { origin: 'http://localhost:3000' } });
  assert.equal(res.statusCode, 202);
  assert.equal(sent.length, 1);
  assert.equal(sent[0]!.to, 'tuki@example.test');
  assert.equal(sent[0]!.replyTo, 'owner@example.com');
  assert.match(sent[0]!.subject, /Testi Oy \(1234567-8\)/);
  assert.match(sent[0]!.text, /Ravintolat/);
  assert.match(sent[0]!.html, /Maija &#60;b&#62;/);
  await app.close();
});

it('rejects bad input, other origins, mail failures and floods', async () => {
  const { app } = setup();
  assert.equal((await app.inject({ method: 'POST', url: '/api/business/apply', payload: { ...valid, zip: '1' } })).statusCode, 400);
  const site = await app.inject({ method: 'POST', url: '/api/business/apply', payload: { ...valid, website: 'hehtrehtrhjergergh' } });
  assert.equal(site.statusCode, 400); assert.equal(site.json().fields.website, 'invalidWebsite');
  assert.equal((await app.inject({ method: 'POST', url: '/api/business/apply', payload: valid, headers: { origin: 'https://evil.example' } })).statusCode, 403);
  for (let i = 0; i < 5; i++) assert.equal((await app.inject({ method: 'POST', url: '/api/business/apply', payload: valid, headers: { 'x-forwarded-for': '1.2.3.4' } })).statusCode, 202);
  assert.equal((await app.inject({ method: 'POST', url: '/api/business/apply', payload: valid, headers: { 'x-forwarded-for': '1.2.3.4' } })).statusCode, 429);
  assert.equal((await app.inject({ method: 'POST', url: '/api/business/apply', payload: valid, headers: { 'x-forwarded-for': '5.6.7.8' } })).statusCode, 202);
  await app.close();
  const down = setup(true);
  const res = await down.app.inject({ method: 'POST', url: '/api/business/apply', payload: valid });
  assert.equal(res.statusCode, 503);
  assert.match(res.body, /applicationNotSent/);
  await down.app.close();
});
