import { it } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import postgres from 'postgres';
import { adminMerchantSchema } from '@vendelia/shared';
import { buildApp } from '../src/app.js';
import { hashSession } from '../src/modules/auth/service.js';

const input = {
  name: 'Test business', companyName: 'Test Business Oy', businessId: '1234567-1',
  contactName: 'Business Contact', publicEmail: ' Contact@Example.com ', phone: '+358 40 123 4567',
  cityId: 'helsinki', categoryId: 'cleaning', status: 'active',
};
it('validates business details without sign-in credentials and allows an empty public email', () => {
  assert.equal(adminMerchantSchema.parse(input).publicEmail, 'contact@example.com');
  assert.equal(adminMerchantSchema.parse({ ...input, publicEmail: ' ' }).publicEmail, '');
  assert.equal(adminMerchantSchema.safeParse({ ...input, publicEmail: 'bad' }).success, false);
  assert.equal(adminMerchantSchema.safeParse({ ...input, businessId: '1234567-8' }).success, false);
  assert.equal(adminMerchantSchema.safeParse({ ...input, password: 'not-accepted' }).success, false);
});

const url = process.env.TEST_MERCHANT_DATABASE_URL;
it('admin business API persists fields, confirms shared IDs, protects writes and preserves the catalogue', { skip: !url }, async () => {
  assert.match(new URL(url!).pathname, /^\/vendelia_test_merchants(?:_[a-z0-9]+)?$/);
  const sql = postgres(url!, { prepare: false });
  const fixture = (path: string) => readFile(new URL(path, import.meta.url), 'utf8');
  await sql.unsafe(`CREATE SCHEMA auth;
    CREATE TABLE auth.users(id uuid PRIMARY KEY, email text, email_confirmed_at timestamptz, deleted_at timestamptz, banned_until timestamptz);`);
  await sql.unsafe(await fixture('./fixtures/catalogue-schema.sql'));
  await sql.unsafe(await fixture('../sql/seed-catalogue.sql'));
  // Live export uses a different constraint name from the fixture/default PostgreSQL name.
  await sql`ALTER TABLE public.merchants RENAME CONSTRAINT merchants_country_code_business_id_key TO merchants_business_unique`;
  const before = await sql`SELECT id, company_name, display_name, public_email FROM public.merchants ORDER BY id`;
  for (const file of ['002_profiles.sql', '003_auth_sessions.sql', '004_merchant_contact_and_classification.sql', '004_merchant_contact_and_classification.sql', '005_merchant_members.sql', '006_merchant_account_provisioning.sql', '010_shared_business_ids.sql', '010_shared_business_ids.sql']) {
    await sql.begin(async tx => { await tx.unsafe('SET LOCAL client_min_messages = warning;\n' + await fixture(`../sql/migrations/${file}`)); });
  }
  assert.deepEqual(await sql`SELECT id, company_name, display_name, public_email FROM public.merchants ORDER BY id`, before);
  assert.equal((await sql`SELECT city_id FROM public.merchants`)[0]!.city_id, null);
  const adminId = '00000000-0000-4000-8000-000000000001';
  const customerId = '00000000-0000-4000-8000-000000000002';
  for (const [id, role, token] of [[adminId, 'admin', 'a'.repeat(64)], [customerId, 'customer', 'b'.repeat(64)]]) {
    await sql`INSERT INTO auth.users(id, email, email_confirmed_at) VALUES (${id!}, ${role! + '@example.com'}, now())`;
    await sql`INSERT INTO public.profiles(user_id, display_name, role) VALUES (${id!}, ${role!}, ${role!})`;
    await sql`INSERT INTO public.auth_sessions(token_hash,user_id,expires_at) VALUES (${hashSession(token!)},${id!},now()+interval '1 hour')`;
  }
  const cookie = 'vd_session=' + 'a'.repeat(64);
  const app = buildApp(sql);
  const create = (payload: Record<string, unknown>, extra: Record<string, string> = {}) => app.inject({ method: 'POST', url: '/api/admin/merchants', payload, headers: { cookie, ...extra } });
  try {
    assert.equal((await app.inject({ method: 'POST', url: '/api/admin/merchants', payload: input })).statusCode, 401);
    assert.equal((await create(input, { cookie: 'vd_session=' + 'b'.repeat(64) })).statusCode, 403);
    assert.equal((await create(input, { origin: 'https://evil.example' })).statusCode, 403);
    const invalid = await create({ ...input, businessId: '1234567-8' });
    assert.equal(invalid.statusCode, 400); assert.ok(invalid.json().fields.businessId);
    assert.equal((await create({ ...input, cityId: 'missing' })).statusCode, 400);
    await sql`UPDATE public.categories SET active=false WHERE id='cleaning'`;
    assert.equal((await create(input)).statusCode, 400);
    await sql`UPDATE public.categories SET active=true WHERE id='cleaning'`;
    assert.equal((await create({ ...input, password: 'ignored?' })).statusCode, 400);
    const response = await create(input); assert.equal(response.statusCode, 201);
    const merchant = response.json().merchant;
    assert.equal(merchant.publicEmail, 'contact@example.com');
    const [stored] = await sql`SELECT * FROM public.merchants WHERE id=${merchant.id}`;
    assert.equal(stored!.display_name, input.name); assert.equal(stored!.company_name, input.companyName);
    assert.equal(stored!.contact_name, input.contactName); assert.equal(stored!.public_email, 'contact@example.com');
    assert.equal(stored!.public_phone, input.phone); assert.equal(stored!.city_id, 'helsinki'); assert.equal(stored!.category_id, 'cleaning');
    assert.equal((await sql`SELECT * FROM auth.users`).length, 2);
    assert.equal((await sql`SELECT * FROM public.profiles`).length, 2);
    const duplicate = await create(input); assert.equal(duplicate.statusCode, 409); assert.equal(duplicate.json().error, 'business_id_confirmation_required');
    assert.deepEqual(duplicate.json().businesses, [{ id: merchant.id, name: input.name, companyName: input.companyName }]);
    assert.equal((await sql`SELECT id FROM public.merchants WHERE business_id=${input.businessId}`).length, 1);
    const child = await create({ ...input, name: 'Child business', allowDuplicateBusinessId: true });
    assert.equal(child.statusCode, 201, child.body);
    assert.notEqual(child.json().merchant.id, merchant.id);
    assert.equal(child.json().merchant.businessId, merchant.businessId);
    const warnAgain = await create({ ...input, name: 'Another branch' });
    assert.equal(warnAgain.statusCode, 409); assert.equal(warnAgain.json().businesses.length, 2);
    assert.equal((await create({ ...input, allowDuplicateBusinessId: 'true' })).statusCode, 400);
    // Seed replay after dropping legal-ID uniqueness must preserve the existing deal owner.
    const seedBusiness = before[0]!;
    const [seedRow] = await sql`SELECT business_id FROM public.merchants WHERE id=${seedBusiness.id}`;
    await create({ ...input, name: 'Seed business branch', businessId: seedRow!.business_id, allowDuplicateBusinessId: true });
    await sql.unsafe(await fixture('../sql/seed-catalogue.sql'));
    assert.equal((await sql`SELECT merchant_id FROM public.deals WHERE slug='cleava-kotisiivous-ja-muuttosiivous'`)[0]!.merchant_id, seedBusiness.id);
    const list = await app.inject({ url: '/api/admin/merchants', headers: { cookie } });
    assert.equal(list.statusCode, 200); assert.equal(list.json().merchants.length, before.length + 3);
    const detail = await app.inject({ url: `/api/admin/merchants/${merchant.id}`, headers: { cookie } });
    assert.equal(detail.json().merchant.name, input.name);
    assert.equal((await app.inject({ url: '/api/admin/merchants/not-a-uuid', headers: { cookie } })).statusCode, 400);
    const status = await app.inject({ method: 'POST', url: `/api/admin/merchants/${merchant.id}/status`, headers: { cookie }, payload: { status: 'suspended' } });
    assert.equal(status.statusCode, 200); assert.equal(status.json().merchant.status, 'suspended');
    // Public catalogue retains its independent publication rules and still shows the seeded deal.
    assert.equal((await app.inject({ url: '/api/deals' })).json().deals.length, 1);
    const cleava = before[0]!.id;
    await app.inject({ method: 'POST', url: `/api/admin/merchants/${cleava}/status`, headers: { cookie }, payload: { status: 'suspended' } });
    assert.equal((await app.inject({ url: '/api/deals' })).json().deals.length, 0);
    const raced = await Promise.all([
      create({ ...input, businessId: '1738567-2', name: 'Concurrent parent' }),
      create({ ...input, businessId: '1738567-2', name: 'Concurrent branch' }),
    ]);
    assert.deepEqual(raced.map(r => r.statusCode).sort(), [201, 409]);
    assert.equal(raced.find(r => r.statusCode === 409)!.json().error, 'business_id_confirmation_required');
    assert.equal((await sql`SELECT count(*)::int AS n FROM public.merchants WHERE business_id='1738567-2'`)[0]!.n, 1);
    await sql`UPDATE public.profiles SET is_active=false WHERE user_id=${adminId}`;
    assert.equal((await create(input)).statusCode, 401);
  } finally { await app.close(); }
});
