import { it } from 'node:test';
import { randomUUID } from 'node:crypto';
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
  // The running app no longer depends on migration 007's legacy bytes table.
  await sql`DROP TABLE public.deal_images`;
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
    // Storage is mocked; deal integration tests never write to a remote bucket.
    dealImages: {
      upload: async (merchantId) => `/api/deal-images/storage/${merchantId}/${randomUUID()}`,
      publicUrl: (merchantId, imageId) => `https://test.supabase.co/storage/v1/object/public/test/${merchantId}/${imageId}`,
    },
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
  let gallery: string[] = [];
  const deal = (overrides: Record<string, unknown> = {}) => ({
    title: { fi: 'Testiaamiainen kahdelle', sv: '', en: 'Test breakfast for two' },
    description: { fi: 'Runsas aamiainen.', sv: '', en: '' }, restrictions: { fi: 'Ma-pe', sv: '', en: '' },
    inclusions: { fi: ['Kahvi'], sv: [], en: [] }, terms: { fi: ['Varaus'], sv: [], en: [] }, howTo: { fi: ['Näytä koodi'], sv: [], en: [] },
    categoryId: 'food', cityId: 'espoo', area: 'Tapiola', street: 'Tapiontori 1', zip: '02100', vatBps: 1350,
    referencePriceCents: 3500, imageUrl: '/deals/cleava/kotisiivous.webp', galleryUrls: gallery,
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

    // Photo upload: type must match the bytes; the website redirects to Storage.
    const jpeg = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01, 0xff, 0xd9]);
    assert.equal((await as(a, 'POST', '/api/merchant/uploads', { contentType: 'image/png', data: jpeg.toString('base64') })).statusCode, 400);
    const upload = await as(a, 'POST', '/api/merchant/uploads', { contentType: 'image/jpeg', data: jpeg.toString('base64') });
    assert.equal(upload.statusCode, 201);
    const imageUrl = upload.json().url as string;
    assert.match(imageUrl, /^\/api\/deal-images\/storage\/[0-9a-f-]{36}\/[0-9a-f-]{36}$/);
    const photo = await app.inject({ url: imageUrl });
    assert.equal(photo.statusCode, 302);
    assert.ok(String(photo.headers.location).startsWith('https://test.supabase.co/storage/v1/object/public/test/'));
    assert.equal((await app.inject({ url: '/api/deal-images/00000000-0000-4000-8000-0000000000ff' })).statusCode, 410);
    assert.equal((await app.inject({ url: '/api/meta' })).headers['cache-control'], 'no-store');

    // Extra photos: only site paths are accepted, and the order is kept.
    const more = async () => (await as(a, 'POST', '/api/merchant/uploads', { contentType: 'image/jpeg', data: jpeg.toString('base64') })).json().url as string;
    const [photo2, photo3] = [await more(), await more()];
    const outside = await as(a, 'POST', '/api/merchant/deals', deal({ imageUrl, galleryUrls: ['https://evil.example/x.png'] }));
    assert.equal(outside.statusCode, 400); assert.ok(outside.json().fields['galleryUrls.0']);
    assert.equal((await as(a, 'POST', '/api/merchant/deals', deal({ imageUrl, galleryUrls: Array.from({ length: 8 }, (_, i) => `/p${i}`) }))).statusCode, 400);

    // Create: pending, owned, not public.
    gallery = [photo2, photo3, photo2, imageUrl]; // repeats and the cover are dropped
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
    assert.deepEqual(own.input.galleryUrls, [photo2, photo3]); assert.equal(own.input.title.en, 'Test breakfast for two'); assert.equal(own.input.area, 'Tapiola'); assert.equal(own.input.options.length, 1);

    // Admin review: reason required to reject; rejected deal shows the reason to the business.
    assert.equal((await as(a, 'GET', '/api/admin/deals')).statusCode, 403);
    const queue = (await as(admin, 'GET', '/api/admin/deals?status=pending')).json().deals;
    assert.equal(queue.length, 1); assert.equal(queue[0].merchantId, merchantA); assert.equal(queue[0].merchantStatus, 'active');
    assert.equal((await as(admin, 'GET', `/api/admin/deals?merchantId=${merchantA}`)).json().deals.length, 2);
    assert.equal((await as(admin, 'GET', `/api/admin/deals?merchantId=${merchantB}`)).json().deals.length, 0);
    assert.equal((await as(admin, 'GET', '/api/admin/deals?merchantId=nope')).statusCode, 400);
    assert.equal((await as(admin, 'POST', `/api/admin/deals/${id}/review`, { decision: 'reject' })).statusCode, 400);
    const rejected = await as(admin, 'POST', `/api/admin/deals/${id}/review`, { decision: 'reject', note: 'Add a real photo' });
    assert.equal(rejected.statusCode, 200); assert.equal(rejected.json().deal.status, 'rejected');
    assert.equal((await as(a, 'GET', '/api/merchant/deal-cards')).json().deals.find((c: { id: string }) => c.id === id).reviewNote, 'Add a real photo');

    // Edit: back to review, note cleared, prices logged, removed options switched off, photos reordered.
    gallery = [photo3, photo2];
    const optionId = own.input.options[0].id;
    const edited = await as(a, 'PUT', `/api/merchant/deals/${id}`, deal({ imageUrl, options: [
      { id: optionId, label: { fi: 'Aamiainen', sv: '', en: '' }, priceCents: 2790 },
      { label: { fi: 'Aamiainen neljälle', sv: '', en: '' }, priceCents: 5490 },
    ] }));
    assert.equal(edited.statusCode, 200); assert.equal(edited.json().status, 'pending');
    const afterEdit = (await as(a, 'GET', `/api/merchant/deals/${id}`)).json().deal;
    assert.deepEqual(afterEdit.input.galleryUrls, [photo3, photo2]); assert.equal(afterEdit.reviewNote, null); assert.equal(afterEdit.input.options.length, 2);
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
    assert.equal(detail.statusCode, 200); assert.equal(detail.json().imageUrl, imageUrl); assert.deepEqual(detail.json().gallery, [photo3, photo2]); assert.equal(detail.json().options.length, 1);
    assert.equal((await as(admin, 'POST', `/api/admin/deals/${id}/review`, { decision: 'approve' })).statusCode, 409);
    assert.equal((await sql`SELECT reviewed_by FROM public.deals WHERE id = ${id}`)[0]!.reviewed_by, ids.admin);
    await as(a, 'PUT', `/api/merchant/deals/${id}`, deal({ imageUrl }));
    assert.ok(!(await publicSlugs()).includes(slug));
    assert.equal((await as(admin, 'POST', '/api/admin/deals/00000000-0000-4000-8000-0000000000ff/review', { decision: 'approve' })).statusCode, 404);

    // Sections: options grouped under headings, tile names, regular prices per option.
    const fi = (text: string) => ({ fi: text, sv: '', en: '' });
    const opt = (section: string | null, name: string | null, priceCents: number, referencePriceCents: number | null = null) =>
      ({ label: name ? fi(name) : null, group: section ? fi(section) : null, priceCents, referencePriceCents });
    const mixed = await as(a, 'POST', '/api/merchant/deals', deal({ imageUrl, options: [opt('Kotisiivous', '3 h', 8900), opt(null, null, 9900)] }));
    assert.equal(mixed.statusCode, 400); assert.ok(mixed.json().fields['options.1.group.fi']); assert.ok(mixed.json().fields['options.1.label.fi']);
    const badRef = await as(a, 'POST', '/api/merchant/deals', deal({ imageUrl, options: [opt(null, null, 8900, 8900)] }));
    assert.equal(badRef.statusCode, 400); assert.ok(badRef.json().fields['options.0.referencePriceCents']);
    const sectioned = await as(a, 'POST', '/api/merchant/deals', deal({ imageUrl, options: [
      opt('Kotisiivous', '3 h', 8900, 14700), opt('Kotisiivous', '4 h', 11900), opt('Muuttosiivous', '50 m²', 19900, 25000),
    ] }));
    assert.equal(sectioned.statusCode, 201);
    const sectionedOwn = (await as(a, 'GET', `/api/merchant/deals/${sectioned.json().id}`)).json().deal;
    assert.deepEqual(sectionedOwn.input.options.map((o: { label: { fi: string }; group: { fi: string }; referencePriceCents: number | null }) =>
      [o.group.fi, o.label.fi, o.referencePriceCents]), [['Kotisiivous', '3 h', 14700], ['Kotisiivous', '4 h', null], ['Muuttosiivous', '50 m²', 25000]]);
    await as(admin, 'POST', `/api/admin/deals/${sectioned.json().id}/review`, { decision: 'approve' });
    const live = (await app.inject({ url: `/api/deals/${sectioned.json().slug}` })).json();
    assert.deepEqual(live.options.map((o: { group: { fi: string }; shortLabel: { fi: string }; label: { fi: string }; referencePriceCents: number | null }) =>
      [o.group.fi, o.shortLabel.fi, o.label.fi, o.referencePriceCents]),
    [['Kotisiivous', '3 h', 'Kotisiivous: 3 h', 14700], ['Kotisiivous', '4 h', 'Kotisiivous: 4 h', null], ['Muuttosiivous', '50 m²', 'Muuttosiivous: 50 m²', 25000]]);

    // Suspending a business ends its portal session, so it can no longer change deals.
    await sql`UPDATE public.merchants SET status = 'suspended' WHERE id = ${merchantA}`;
    assert.equal((await as(a, 'PUT', `/api/merchant/deals/${id}`, deal({ imageUrl }))).statusCode, 401);
  } finally {
    await app.close();
  }
});
