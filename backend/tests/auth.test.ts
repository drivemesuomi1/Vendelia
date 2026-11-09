import { it } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import postgres from 'postgres';
import type { SessionUserDTO } from '@vendelia/shared';
import { buildApp } from '../src/app.js';
import { orderConfig } from '../src/config.js';
import { authConfig, sessionToken } from '../src/modules/auth/config.js';
import { SupabasePasswordProvider } from '../src/modules/auth/provider.js';
import { AuthService, hashSession } from '../src/modules/auth/service.js';
import type { AccountRepository } from '../src/modules/auth/repository.js';

const id = '00000000-0000-4000-8000-000000000001';
const user: SessionUserDTO = { id, email: 'staff@example.com', name: 'Staff', role: 'admin', merchant: null };
it('does not establish sessions for missing profiles or non-admin users at admin login', async () => {
  let profile: SessionUserDTO | null = null;
  let writes = 0;
  const repository: AccountRepository = {
    profile: async () => profile, session: async () => null,
    createSession: async () => { writes++; }, deleteSession: async () => {},
  };
  const service = new AuthService(repository, { verify: async () => ({ id, email: user.email }) });
  await assert.rejects(service.login(user.email, 'secret', 'admin'), { code: 'invalidLogin' });
  profile = { ...user, role: 'customer' };
  await assert.rejects(service.login(user.email, 'secret', 'admin'), { code: 'invalidLogin' });
  assert.equal(writes, 0);
  profile = user;
  const result = await service.login(user.email, 'secret', 'admin');
  assert.equal(writes, 1); assert.match(result.token, /^[a-f0-9]{64}$/);
  assert.notEqual(hashSession(result.token), result.token);
  assert.equal(sessionToken(`other=x; vd_session=${result.token}`), result.token);
  assert.equal(sessionToken('vd_session=forged'), undefined);
});

it('sends credentials only to Supabase and maps invalid/provider failures without exposing responses', async () => {
  const original = globalThis.fetch;
  const config = authConfig({ SUPABASE_URL: 'https://project.supabase.co', SUPABASE_PUBLISHABLE_KEY: 'publishable' });
  const provider = new SupabasePasswordProvider(config);
  try {
    globalThis.fetch = async (url, init) => {
      assert.equal(url, 'https://project.supabase.co/auth/v1/token?grant_type=password');
      assert.equal((init?.headers as Record<string, string>).apikey, 'publishable');
      assert.equal(init?.redirect, 'error');
      return Response.json({ access_token: 'not-returned', user: { id, email: user.email } });
    };
    assert.deepEqual(await provider.verify(user.email, 'secret'), { id, email: user.email });
    globalThis.fetch = async () => Response.json({ secret: 'must not escape' }, { status: 400 });
    await assert.rejects(provider.verify(user.email, 'wrong'), { code: 'invalidLogin' });
    globalThis.fetch = async () => { throw new Error('private transport error'); };
    await assert.rejects(provider.verify(user.email, 'secret'), { code: 'authUnavailable' });
  } finally { globalThis.fetch = original; }
});

const url = process.env.TEST_AUTH_DATABASE_URL;
it('auth API: role checks, hashed sessions, logout, expiry, suspension, deleted users, CSRF and throttling', { skip: !url }, async () => {
  const parsed = new URL(url!);
  assert.match(parsed.pathname.slice(1), /^vendelia_test_auth(?:_[a-z0-9]+)?$/);
  const sql = postgres(url!, { prepare: false });
  await sql.unsafe(`CREATE SCHEMA auth;
    CREATE TABLE auth.users(id uuid PRIMARY KEY, email text, email_confirmed_at timestamptz, deleted_at timestamptz, banned_until timestamptz);`);
  await sql.unsafe(await readFile(new URL('./fixtures/catalogue-schema.sql', import.meta.url), 'utf8'));
  await sql.unsafe(await readFile(new URL('../sql/seed-catalogue.sql', import.meta.url), 'utf8'));
  for (const file of ['001_orders_vouchers.sql', '002_profiles.sql', '003_auth_sessions.sql', '005_merchant_members.sql', '008_order_customers.sql', '008_order_customers.sql']) {
    await sql.begin(async tx => { await tx.unsafe(await readFile(new URL(`../sql/migrations/${file}`, import.meta.url), 'utf8')); });
  }
  await sql`INSERT INTO auth.users(id,email,email_confirmed_at) VALUES (${id}, ${user.email}, now())`;
  await sql`INSERT INTO public.profiles(user_id,display_name,role) VALUES (${id}, 'Staff', 'admin')`;
  const app = buildApp(sql, { orders: orderConfig({ PAYMENT_BYPASS: 'true' }), mailer: { send: async () => ({ id: 'test-no-email-sent' }) }, auth: authConfig({ SUPABASE_URL: 'https://test.supabase.co', SUPABASE_PUBLISHABLE_KEY: 'test', NODE_ENV: 'production' }),
    passwordProvider: { verify: async (_email, password) => {
      if (password !== 'correct') throw Object.assign(new Error('invalid'), { statusCode: 401, code: 'invalidLogin' });
      return { id, email: user.email };
    } },
  });
  const login = (email = user.email) => app.inject({ method: 'POST', url: '/api/auth/admin/login', payload: { email, password: 'correct' } });
  try {
    const purchase = await app.inject({ method: 'POST', url: '/api/orders', payload: {
      items: [{ dealId: 'c1ea7a00-0000-4000-8000-000000000001', optionId: 'c1ea7a00-0000-4000-8000-000000000101', qty: 1 }],
      contact: { email: user.email, firstName: 'Test', lastName: 'Buyer' }, gift: { enabled: false },
      payment: { method: 'test' }, acceptTerms: true,
      customer_id: id,
    } });
    assert.equal(purchase.statusCode, 201);
    assert.equal((await sql`SELECT customer_id FROM public.orders WHERE id = ${purchase.json().orderId}`)[0]!.customer_id, null);
    const initial = await login(); assert.equal(initial.statusCode, 200);
    const cookie = String(initial.headers['set-cookie']).split(';')[0]!;
    assert.match(String(initial.headers['set-cookie']), /HttpOnly; SameSite=Strict; Max-Age=28800; Secure/);
    const token = sessionToken(cookie)!;
    const [stored] = await sql`SELECT token_hash FROM public.auth_sessions`;
    assert.equal(stored!.token_hash, hashSession(token));
    assert.equal((await app.inject({ url: '/api/auth/me', headers: { cookie } })).json().user.role, 'admin');
    const own = await app.inject({ url: '/api/me/vouchers', headers: { cookie } });
    assert.equal(own.statusCode, 200); assert.equal(own.json().vouchers.length, 1);
    const merchantId = (await sql`SELECT id FROM public.merchants LIMIT 1`)[0]!.id;
    await sql`INSERT INTO public.merchant_members(user_id,merchant_id) VALUES (${id},${merchantId})`;
    const linkedCodes: string[] = [];
    for (const role of ['customer', 'admin', 'merchant']) {
      await sql`UPDATE public.profiles SET role = ${role} WHERE user_id = ${id}`;
      const bought = await app.inject({ method: 'POST', url: '/api/orders', headers: { cookie }, payload: {
        items: [{ dealId: 'c1ea7a00-0000-4000-8000-000000000001', optionId: 'c1ea7a00-0000-4000-8000-000000000101', qty: 1 }],
        contact: { email: role === 'customer' ? 'delivery@example.com' : user.email, firstName: 'Test', lastName: 'Buyer' }, gift: { enabled: false },
        payment: { method: 'test' }, acceptTerms: true,
        customer_id: '00000000-0000-4000-8000-000000000099',
      } });
      assert.equal(bought.statusCode, 201, bought.body);
      const [saved] = await sql`SELECT customer_id, status FROM public.orders WHERE id = ${bought.json().orderId}`;
      assert.equal(saved!.customer_id, id); // The browser cannot choose the owner.
      assert.equal(saved!.status, 'test_unpaid');
      linkedCodes.push((await sql`SELECT code FROM public.vouchers WHERE order_id = ${bought.json().orderId}`)[0]!.code);
      assert.equal((await app.inject({ url: `/api/orders/${bought.json().orderId}`, headers: { 'x-order-token': bought.json().accessToken } })).statusCode, 200);
    }
    await sql`UPDATE public.profiles SET role = 'admin' WHERE user_id = ${id}`;
    assert.equal((await app.inject({ url: '/api/me/vouchers', headers: { cookie } })).json().vouchers.length, 4);
    await sql`UPDATE auth.users SET email = 'different@example.com' WHERE id = ${id}`;
    assert.equal((await app.inject({ url: '/api/me/vouchers', headers: { cookie } })).json().vouchers.length, 3);
    assert.equal((await app.inject({ url: `/api/me/vouchers/${linkedCodes[0]}/pdf`, headers: { cookie } })).statusCode, 200);
    const strangerId = '00000000-0000-4000-8000-000000000002';
    const strangerToken = 'b'.repeat(64);
    await sql`INSERT INTO auth.users(id,email,email_confirmed_at) VALUES (${strangerId}, ${user.email}, now())`;
    await sql`INSERT INTO public.profiles(user_id,display_name,role) VALUES (${strangerId}, 'Other customer', 'customer')`;
    await sql`INSERT INTO public.auth_sessions(token_hash,user_id,expires_at) VALUES (${hashSession(strangerToken)}, ${strangerId}, now() + interval '1 hour')`;
    const strangerHeaders = { cookie: `vd_session=${strangerToken}` };
    const visible = (await app.inject({ url: '/api/me/vouchers', headers: strangerHeaders })).json().vouchers;
    assert.equal(visible.length, 1); // Only the unlinked guest order matches this email.
    assert.ok(visible.every((voucher: { code: string }) => !linkedCodes.includes(voucher.code)));
    assert.equal((await app.inject({ url: `/api/me/vouchers/${linkedCodes[0]}/pdf`, headers: strangerHeaders })).statusCode, 404);
    assert.equal((await app.inject({ url: `/api/me/vouchers/${visible[0].code}/pdf`, headers: strangerHeaders })).statusCode, 200);
    assert.equal((await app.inject({ method: 'POST', url: '/api/orders', headers: { cookie, origin: 'https://evil.example' }, payload: {} })).statusCode, 403);
    await sql`DELETE FROM auth.users WHERE id = ${strangerId}`;
    await sql`UPDATE auth.users SET email = ${user.email} WHERE id = ${id}`;
    await sql`UPDATE public.profiles SET role = 'customer'`;
    assert.equal((await app.inject({ url: '/api/auth/me', headers: { cookie } })).json().user.role, 'customer');
    assert.equal((await login()).statusCode, 401);
    assert.equal((await app.inject({ url: '/api/admin/unknown', headers: { cookie } })).statusCode, 403);
    await sql`UPDATE public.profiles SET is_active = false`;
    assert.equal((await app.inject({ url: '/api/auth/me', headers: { cookie } })).json().user, null);
    await sql`UPDATE public.profiles SET is_active = true, role = 'admin'`;
    await sql`UPDATE auth.users SET banned_until = now() + interval '1 hour'`;
    assert.equal((await app.inject({ url: '/api/auth/me', headers: { cookie } })).json().user, null);
    await sql`UPDATE auth.users SET banned_until = null, email_confirmed_at = null`;
    assert.equal((await app.inject({ url: '/api/auth/me', headers: { cookie } })).json().user, null);
    await sql`UPDATE auth.users SET email_confirmed_at = now()`;
    const csrf = await app.inject({ method: 'POST', url: '/api/auth/logout', headers: { cookie, origin: 'https://evil.example' }, payload: {} });
    assert.equal(csrf.statusCode, 403);
    assert.equal((await app.inject({ method: 'POST', url: '/api/auth/logout', headers: { cookie }, payload: {} })).statusCode, 200);
    assert.equal((await app.inject({ url: '/api/auth/me', headers: { cookie } })).json().user, null);
    const again = await login(); const next = String(again.headers['set-cookie']).split(';')[0]!;
    await sql`UPDATE public.auth_sessions SET created_at = now() - interval '9 hours', expires_at = now() - interval '1 hour'`;
    assert.equal((await app.inject({ url: '/api/auth/me', headers: { cookie: next } })).json().user, null);
    assert.equal((await app.inject({ url: '/api/admin/unknown', headers: { cookie: next } })).statusCode, 401);
    const third = await login(); const last = String(third.headers['set-cookie']).split(';')[0]!;
    await sql`DELETE FROM auth.users WHERE id = ${id}`;
    assert.equal((await sql`SELECT count(*)::int AS count FROM public.orders WHERE customer_id IS NULL`)[0]!.count, 4);
    assert.equal((await app.inject({ url: '/api/auth/me', headers: { cookie: last } })).json().user, null);
    assert.equal((await sql`SELECT * FROM public.auth_sessions`).length, 0);
    for (let i = 0; i < 5; i++) await login('limited@example.com');
    assert.equal((await login('limited@example.com')).statusCode, 429);
    assert.equal((await app.inject({ url: '/api/auth/me', headers: { cookie: 'vd_session=forged' } })).json().user, null);
  } finally { await app.close(); }
});
