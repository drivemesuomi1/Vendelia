import { it } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import { buildApp } from '../src/app.js';
import { HttpProblem } from '../src/errors.js';
import { authConfig } from '../src/modules/auth/config.js';
import { slugFor } from '../src/modules/deals/repository.js';

it('builds URL-safe slugs from Finnish titles', () => {
  assert.match(slugFor('Kotisiivous ja ikkunanpesu – 3–8 h, myös Espoo!'), /^kotisiivous-ja-ikkunanpesu-3-8-h-myos-espoo-[0-9a-f]{6}$/);
  assert.match(slugFor('Åäö'), /^aao-[0-9a-f]{6}$/);
  assert.match(slugFor('!!!'), /^deal-[0-9a-f]{6}$/);
});

// Never DATABASE_URL: a fresh dedicated database whose name starts with vendelia_test_deals.
const url = process.env.TEST_DEALS_DATABASE_URL;
it('business creates and edits deals, admin reviews them, approved deals go public and photos are served', { skip: !url }, async () => {
  assert.match(new URL(url!).pathname, /^\/vendelia_test_deals(?:_[a-z0-9]+)?$/);
  const sql = postgres(url!, { prepare: false, idle_timeout: 1, max: 1 });
  drizzle(sql); // Same client setup as src/db: Drizzle turns off json/date serialization.
  const fixture = (path: string) => readFile(new URL(path, import.meta.url), 'utf8');
  await sql.unsafe(`CREATE SCHEMA auth;
    CREATE TABLE auth.users(id uuid PRIMARY KEY, email text, email_confirmed_at timestamptz, deleted_at timestamptz, banned_until timestamptz);`);
  await sql.unsafe(await fixture('./fixtures/catalogue-schema.sql'));
  await sql.unsafe(await fixture('../sql/seed-catalogue.sql'));
  for (const name of ['001_orders_vouchers.sql', '002_profiles.sql', '003_auth_sessions.sql', '004_merchant_contact_and_classification.sql',
    '005_merchant_members.sql', '006_merchant_account_provisioning.sql', '007_deal_review.sql', '007_deal_review.sql']) {
    await sql.begin(async tx => { await tx.unsafe('SET LOCAL client_min_messages=warning;\n' + await fixture(`../sql/migrations/${name}`)); });
  }
  const merchantA = (await sql`SELECT id FROM public.merchants`)[0]!.id as string;
  const merchantB = '00000000-0000-4000-8000-000000000010';
  await sql`INSERT INTO public.merchants(id,business_id,company_name,display_name,status) VALUES (${merchantB},'1234567-1','B Oy','Business B','active')`;
  const ids = { a: '00000000-0000-4000-8000-000000000001', b: '00000000-0000-4000-8000-000000000002', admin: '00000000-0000-4000-8000-000000000003' };
  for (const [name, id] of Object.entries(ids)) {
    await sql`INSERT INTO auth.users(id,email,email_confirmed_at) VALUES (${id},${name + '@example.com'},now())`;
    await sql`INSERT INTO public.profiles(user_id,display_name,role) VALUES (${id},${name},${name === 'admin' ? 'admin' : 'merchant'})`;
  }
  await sql`INSERT INTO public.merchant_members(user_id,merchant_id) VALUES (${ids.a},${merchantA}),(${ids.b},${merchantB})`;
  const app = buildApp(sql, {
    auth: authConfig({ SUPABASE_URL: 'https://test.supabase.co', SUPABASE_PUBLISHABLE_KEY: 'test' }),
    passwordProvider: { verify: async (email, password) => {
      const name = email.split('@')[0] as keyof typeof ids;
      if (!ids[name] || password !== 'correct') throw new HttpProblem(401, 'invalidLogin');
      return { id: ids[name], email };
    } },
  });
  const cookieOf = async (name: keyof typeof ids) => {
    const path = name === 'admin' ? '/api/auth/admin/login' : '/api/auth/merchant/login';
    const res = await app.inject({ method: 'POST', url: path, payload: { email: `${name}@example.com`, password: 'correct' } });
    assert.equal(res.statusCode, 200, `${name} login`);
    return String(res.headers['set-cookie']).split(';')[0]!;
  };
  const deal = (overrides: Record<string, unknown> = {}) => ({
    title: { fi: 'Testiaamiainen kahdelle', sv: '', en: 'Test breakfast for two' },
    description: { fi: 'Runsas aamiainen.', sv: '', en: '' }, restrictions: { fi: 'Ma-pe', sv: '', en: '' },
    inclusions: { fi: ['Kahvi'], sv: [], en: [] }, terms: { fi: ['Varaus'], sv: [], en: [] }, howTo: { fi: ['Näytä koodi'], sv: [], en: [] },
    categoryId: 'food', cityId: 'espoo', area: 'Tapiola', street: 'Tapiontori 1', zip: '02100', vatBps: 1350,
    referencePriceCents: 3500, imageUrl: '/deals/cleava/kotisiivous.webp',
    options: [{ label: { fi: 'Aamiainen', sv: '', en: '' }, priceCents: 2990 }], ...overrides,
  });
  try {
    const a = await cookieOf('a'); const b = await cookieOf('b'); const admin = await cookieOf('admin');
    const as = (cookie: string, method: 'GET' | 'POST' | 'PUT', path: string, payload?: unknown, headers: Record<string, string> = {}) =>
      app.inject({ method, url: path, headers: { cookie, ...headers }, ...(payload === undefined ? {} : { payload: payload as object }) });

    // Access and validation.
    assert.equal((await app.inject({ method: 'POST', url: '/api/merchant/deals', payload: deal() })).statusCode, 401);
    assert.equal((await as(admin, 'POST', '/api/merchant/deals', deal())).statusCode, 403);
    assert.equal((await as(a, 'POST', '/api/merchant/deals', deal(), { origin: 'https://evil.example' })).statusCode, 403);
    const invalid = await as(a, 'POST', '/api/merchant/deals', deal({ zip: '12', options: [] }));
    assert.equal(invalid.statusCode, 400); assert.ok(invalid.json().fields.zip); assert.ok(invalid.json().fields.options);
    assert.equal((await as(a, 'POST', '/api/merchant/deals', deal({ cityId: 'nowhere' }))).statusCode, 400);

    // Photo upload: type must match the bytes; served publicly with a long cache.
    const jpeg = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01, 0xff, 0xd9]);
    assert.equal((await as(a, 'POST', '/api/merchant/uploads', { contentType: 'image/png', data: jpeg.toString('base64') })).statusCode, 400);
    const upload = await as(a, 'POST', '/api/merchant/uploads', { contentType: 'image/jpeg', data: jpeg.toString('base64') });
    assert.equal(upload.statusCode, 201);
    const imageUrl = upload.json().url as string;
    assert.match(imageUrl, /^\/api\/deal-images\/[0-9a-f-]{36}$/);
    const photo = await app.inject({ url: imageUrl });
    assert.equal(photo.statusCode, 200); assert.equal(photo.headers['content-type'], 'image/jpeg');
    assert.match(String(photo.headers['cache-control']), /immutable/); assert.deepEqual(photo.rawPayload, jpeg);
    assert.equal((await app.inject({ url: '/api/deal-images/00000000-0000-4000-8000-0000000000ff' })).statusCode, 404);
    assert.equal((await app.inject({ url: '/api/meta' })).headers['cache-control'], 'no-store');

    // Create: pending, owned, not public.
    const created = await as(a, 'POST', '/api/merchant/deals', deal({ imageUrl }));
    assert.equal(created.statusCode, 201);
    const { id, slug } = created.json(); assert.equal(created.json().status, 'pending');
    const publicSlugs = async () => (await app.inject({ url: '/api/deals' })).json().deals.map((d: { slug: string }) => d.slug);
    assert.ok(!(await publicSlugs()).includes(slug));
    const cards = (await as(a, 'GET', '/api/merchant/deal-cards')).json().deals;
    assert.equal(cards.find((c: { id: string }) => c.id === id).status, 'pending');
    assert.ok(!(await as(b, 'GET', '/api/merchant/deal-cards')).json().deals.some((c: { id: string }) => c.id === id));
    assert.equal((await as(b, 'GET', `/api/merchant/deals/${id}`)).statusCode, 404);
    assert.equal((await as(b, 'PUT', `/api/merchant/deals/${id}`, deal())).statusCode, 404);
    const own = (await as(a, 'GET', `/api/merchant/deals/${id}`)).json().deal;
    assert.equal(own.input.title.en, 'Test breakfast for two'); assert.equal(own.input.area, 'Tapiola'); assert.equal(own.input.options.length, 1);

    // Admin review: reason required to reject; rejected deal shows the reason to the business.
    assert.equal((await as(a, 'GET', '/api/admin/deals')).statusCode, 403);
    const queue = (await as(admin, 'GET', '/api/admin/deals?status=pending')).json().deals;
    assert.equal(queue.length, 1); assert.equal(queue[0].merchantId, merchantA); assert.equal(queue[0].merchantStatus, 'active');
    assert.equal((await as(admin, 'POST', `/api/admin/deals/${id}/review`, { decision: 'reject' })).statusCode, 400);
    const rejected = await as(admin, 'POST', `/api/admin/deals/${id}/review`, { decision: 'reject', note: 'Add a real photo' });
    assert.equal(rejected.statusCode, 200); assert.equal(rejected.json().deal.status, 'rejected');
    assert.equal((await as(a, 'GET', '/api/merchant/deal-cards')).json().deals.find((c: { id: string }) => c.id === id).reviewNote, 'Add a real photo');

    // Edit: back to review, note cleared, prices logged, removed options switched off.
    const optionId = own.input.options[0].id;
    const edited = await as(a, 'PUT', `/api/merchant/deals/${id}`, deal({ imageUrl, options: [
      { id: optionId, label: { fi: 'Aamiainen', sv: '', en: '' }, priceCents: 2790 },
      { label: { fi: 'Aamiainen neljälle', sv: '', en: '' }, priceCents: 5490 },
    ] }));
    assert.equal(edited.statusCode, 200); assert.equal(edited.json().status, 'pending');
    const afterEdit = (await as(a, 'GET', `/api/merchant/deals/${id}`)).json().deal;
    assert.equal(afterEdit.reviewNote, null); assert.equal(afterEdit.input.options.length, 2);
    assert.equal((await sql`SELECT count(*)::int n FROM public.deal_option_price_history h JOIN public.deal_options o ON o.id = h.option_id WHERE o.deal_id = ${id}`)[0]!.n, 3);
    await as(a, 'PUT', `/api/merchant/deals/${id}`, deal({ imageUrl, options: [{ id: optionId, label: null, priceCents: 2790 }] }));
    assert.deepEqual((await sql`SELECT active FROM public.deal_options WHERE deal_id = ${id} ORDER BY sort_order, price_cents`).map(r => r.active).sort(), [false, true]);

    // Approve: goes public with its photo; approving twice is refused; editing a live deal takes it off sale.
    const approved = await as(admin, 'POST', `/api/admin/deals/${id}/review`, { decision: 'approve', note: 'Great photo, thanks' });
    assert.equal(approved.statusCode, 200); assert.equal(approved.json().deal.status, 'live');
    const liveCard = (await as(a, 'GET', '/api/merchant/deal-cards')).json().deals.find((c: { id: string }) => c.id === id);
    assert.equal(liveCard.status, 'live'); assert.equal(liveCard.reviewNote, 'Great photo, thanks');
    assert.ok((await publicSlugs()).includes(slug));
    const detail = await app.inject({ url: `/api/deals/${slug}` });
    assert.equal(detail.statusCode, 200); assert.equal(detail.json().imageUrl, imageUrl); assert.equal(detail.json().options.length, 1);
    assert.equal((await as(admin, 'POST', `/api/admin/deals/${id}/review`, { decision: 'approve' })).statusCode, 409);
    assert.equal((await sql`SELECT reviewed_by FROM public.deals WHERE id = ${id}`)[0]!.reviewed_by, ids.admin);
    await as(a, 'PUT', `/api/merchant/deals/${id}`, deal({ imageUrl }));
    assert.ok(!(await publicSlugs()).includes(slug));
    assert.equal((await as(admin, 'POST', '/api/admin/deals/00000000-0000-4000-8000-0000000000ff/review', { decision: 'approve' })).statusCode, 404);

    // Suspending a business ends its portal session, so it can no longer change deals.
    await sql`UPDATE public.merchants SET status = 'suspended' WHERE id = ${merchantA}`;
    assert.equal((await as(a, 'PUT', `/api/merchant/deals/${id}`, deal({ imageUrl }))).statusCode, 401);
  } finally {
    await app.close();
  }
});
