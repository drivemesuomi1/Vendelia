import { it } from 'node:test';
import assert from 'node:assert/strict';
import Fastify from 'fastify';
import { SupabaseDealImageStorage, type DealImageStorage } from '../src/modules/deals/storage.js';
import { dealRoutes } from '../src/modules/deals/routes.js';
import type { AuthService } from '../src/modules/auth/service.js';
import type { DealRepository } from '../src/modules/deals/repository.js';
import { HttpProblem } from '../src/errors.js';

const merchant = '00000000-0000-4000-8000-000000000001';
const imageId = '00000000-0000-4000-8000-000000000002';
const env = { SUPABASE_URL: 'https://example.supabase.co', SUPABASE_STORAGE_BUCKET: 'Vendelia Main', SUPABASE_SECRET_KEY: 'sb_secret_test' };
const jpeg = Buffer.from([0xff, 0xd8, 0xff, 0xe0]);

it('uploads immutable bytes to the configured bucket with server credentials and encodes its name', async () => {
  const calls: { url: string; init?: RequestInit }[] = [];
  const storage = new SupabaseDealImageStorage(env, (async (url, init) => {
    calls.push({ url: String(url), init });
    return Response.json(calls.length === 1 ? { public: true } : {});
  }) as typeof fetch);
  const path = await storage.upload(merchant, 'image/jpeg', jpeg);
  assert.match(path, new RegExp(`^/api/deal-images/storage/${merchant}/[a-f0-9-]{36}$`));
  assert.equal(calls[0]!.url, 'https://example.supabase.co/storage/v1/bucket/Vendelia%20Main');
  assert.ok(calls[1]!.url.startsWith(`https://example.supabase.co/storage/v1/object/Vendelia%20Main/${merchant}/`));
  const headers = calls[1]!.init!.headers as Record<string, string>;
  assert.equal(headers.apikey, env.SUPABASE_SECRET_KEY);
  assert.equal(headers.authorization, undefined);
  assert.equal(headers['x-upsert'], 'false');
  assert.deepEqual(Buffer.from(calls[1]!.init!.body as Uint8Array), jpeg);
  assert.ok(!path.includes('sb_secret'));
  assert.equal(storage.publicUrl(merchant, imageId), `https://example.supabase.co/storage/v1/object/public/Vendelia%20Main/${merchant}/${imageId}`);
});

it('refuses missing configuration, private buckets and failed uploads without leaking provider errors', async () => {
  await assert.rejects(new SupabaseDealImageStorage({}).upload(merchant, 'image/jpeg', jpeg), /imageStorageNotConfigured/);
  let calls = 0;
  const privateBucket = new SupabaseDealImageStorage(env, (async () => { calls++; return Response.json({ public: false }); }) as typeof fetch);
  await assert.rejects(privateBucket.upload(merchant, 'image/jpeg', jpeg), /imageStorageBucketMustBePublic/);
  assert.equal(calls, 1);
  const failed = new SupabaseDealImageStorage(env, (async (url) => String(url).includes('/bucket/')
    ? Response.json({ public: true }) : new Response('sensitive provider details', { status: 403 })) as typeof fetch);
  await assert.rejects(failed.upload(merchant, 'image/jpeg', jpeg), /imageStorageUnavailable/);
  assert.throws(() => failed.publicUrl('../bad', imageId), /invalidId/);
});

it('keeps upload auth/type checks, redirects to Storage and retires old URLs without database access', async () => {
  const app = Fastify();
  let uploads = 0;
  const images: DealImageStorage = {
    upload: async (owner, type, data) => { uploads++; assert.equal(owner, merchant); assert.equal(type, 'image/jpeg'); assert.deepEqual(data, jpeg); return `/api/deal-images/storage/${owner}/${imageId}`; },
    publicUrl: (owner, id) => `https://example.supabase.co/storage/v1/object/public/bucket/${owner}/${id}`,
  };
  const auth = { current: async (token?: string) => token ? { role: 'merchant', merchant: { id: merchant } } : null } as unknown as AuthService;
  const repository = new Proxy({}, { get() { throw new Error('Image routes must not access the database repository'); } }) as DealRepository;
  app.setErrorHandler((error, _request, reply) => reply.code(error instanceof HttpProblem ? error.statusCode : 500).send({ error: error instanceof Error ? error.message : 'error' }));
  await app.register(dealRoutes, { repository, auth, images, origins: ['https://vendelia.fi'] });
  try {
    const payload = { contentType: 'image/jpeg', data: jpeg.toString('base64') };
    const headers = { cookie: `vd_session=${'a'.repeat(64)}` };
    assert.equal((await app.inject({ method: 'POST', url: '/api/merchant/uploads', payload })).statusCode, 401);
    assert.equal((await app.inject({ method: 'POST', url: '/api/merchant/uploads', headers: { ...headers, origin: 'https://evil.example' }, payload })).statusCode, 403);
    assert.equal((await app.inject({ method: 'POST', url: '/api/merchant/uploads', headers, payload: { ...payload, contentType: 'image/png' } })).statusCode, 400);
    assert.equal(uploads, 0);
    const upload = await app.inject({ method: 'POST', url: '/api/merchant/uploads', headers, payload });
    assert.equal(upload.statusCode, 201);
    assert.equal(uploads, 1);
    const redirect = await app.inject({ url: upload.json().url });
    assert.equal(redirect.statusCode, 302);
    assert.equal(redirect.headers.location, images.publicUrl(merchant, imageId));
    const legacy = await app.inject({ url: `/api/deal-images/${imageId}` });
    assert.equal(legacy.statusCode, 410);
    assert.equal(legacy.json().error, 'image_retired');
  } finally { await app.close(); }
});
