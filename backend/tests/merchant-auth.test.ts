import { it } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import postgres from 'postgres';
import { buildApp } from '../src/app.js';
import { HttpProblem } from '../src/errors.js';
import { authConfig } from '../src/modules/auth/config.js';
import { AuthService } from '../src/modules/auth/service.js';
import type { AccountRepository } from '../src/modules/auth/repository.js';
import type { SessionUserDTO } from '@vendelia/shared';

it('requires both merchant role and a business link for the merchant login audience', async () => {
  let user: SessionUserDTO | null = { id: '00000000-0000-4000-8000-000000000001', name: 'Account', email: 'a@example.com', role: 'admin', merchant: null };
  let writes = 0;
  const repository: AccountRepository = { profile: async () => user, session: async () => user, ensureCustomerProfile: async () => {}, createSession: async () => { writes++; }, deleteSession: async () => {} };
  const service = new AuthService(repository, { verify: async () => ({ id: user!.id, email: user!.email }) });
  await assert.rejects(service.login('a@example.com', 'password', 'merchant'), { code: 'invalidLogin' });
  user = { ...user!, role: 'merchant' };
  await assert.rejects(service.login('a@example.com', 'password', 'merchant'), { code: 'invalidLogin' });
  assert.equal(writes, 0);
  user = { ...user, merchant: { id: '00000000-0000-4000-8000-000000000002', name: 'Business A', companyName: 'A Oy', businessId: '1234567-1', status: 'active' } };
  assert.equal((await service.login(user.email, 'password', 'merchant')).user.merchant!.name, 'Business A');
  assert.equal(writes, 1);
});

const url = process.env.TEST_MERCHANT_AUTH_DATABASE_URL;
it('merchant login, membership revocation, suspension and deal/voucher ownership are enforced in PostgreSQL', { skip: !url }, async () => {
  assert.match(new URL(url!).pathname, /^\/vendelia_test_merchantauth(?:_[a-z0-9]+)?$/);
  const sql = postgres(url!, { prepare: false, idle_timeout: 1 });
  const fixture = (path: string) => readFile(new URL(path, import.meta.url), 'utf8');
  await sql.unsafe(`CREATE SCHEMA auth;
    CREATE TABLE auth.users(id uuid PRIMARY KEY, email text, email_confirmed_at timestamptz, deleted_at timestamptz, banned_until timestamptz);`);
  await sql.unsafe(await fixture('./fixtures/catalogue-schema.sql'));
  await sql.unsafe(await fixture('../sql/seed-catalogue.sql'));
  for (const name of ['001_orders_vouchers.sql', '002_profiles.sql', '003_auth_sessions.sql', '005_merchant_members.sql', '005_merchant_members.sql', '008_order_customers.sql', '009_voucher_redemption_actor.sql', '009_voucher_redemption_actor.sql']) {
    await sql.begin(async tx => { await tx.unsafe('SET LOCAL client_min_messages=warning;\n' + await fixture(`../sql/migrations/${name}`)); });
  }
  const original = (await sql`SELECT id FROM public.merchants`)[0]!.id as string;
  const other = '00000000-0000-4000-8000-000000000010';
  await sql`INSERT INTO public.merchants(id,business_id,company_name,display_name,status) VALUES (${other},'1234567-1','B Oy','Business B','active')`;
  const title = { fi: 'Private B', sv: '', en: '' };
  await sql`INSERT INTO public.deals(merchant_id,category_id,city_id,slug,status,title,description,image_url,vat_bps)
    VALUES (${other},'cleaning','helsinki','private-b','draft',${sql.json(title)},${sql.json(title)},'/b.webp',2550)`;
  const ids = {
    a: '00000000-0000-4000-8000-000000000001', b: '00000000-0000-4000-8000-000000000002',
    missing: '00000000-0000-4000-8000-000000000003', admin: '00000000-0000-4000-8000-000000000004', customer: '00000000-0000-4000-8000-000000000005',
  };
  for (const [name, id] of Object.entries(ids)) {
    await sql`INSERT INTO auth.users(id,email,email_confirmed_at) VALUES (${id},${name+'@example.com'},now())`;
    await sql`INSERT INTO public.profiles(user_id,display_name,role) VALUES (${id},${name},${['admin','customer'].includes(name) ? name : 'merchant'})`;
  }
  await sql`INSERT INTO public.merchant_members(user_id,merchant_id) VALUES (${ids.a},${original}),(${ids.b},${other})`;
  await assert.rejects(sql`INSERT INTO public.merchant_members(user_id,merchant_id) VALUES (${ids.a},${other})`, { code: '23505' });
  const app = buildApp(sql, {
    auth: authConfig({ SUPABASE_URL: 'https://test.supabase.co', SUPABASE_PUBLISHABLE_KEY: 'test' }),
    passwordProvider: { verify: async (email, password) => {
      const name = email.split('@')[0] as keyof typeof ids;
      if (!ids[name] || password !== 'correct') throw new HttpProblem(401, 'invalidLogin');
      return { id: ids[name], email };
    } },
  });
  const login = (name: keyof typeof ids, path = '/api/auth/merchant/login') => app.inject({ method: 'POST', url: path, payload: { email: name+'@example.com', password: 'correct' } });
  const cookieOf = (response: { headers: Record<string, unknown> }) => String(response.headers['set-cookie']).split(';')[0]!;
  try {
    assert.equal((await login('missing')).statusCode, 401);
    assert.equal((await login('customer')).statusCode, 401);
    assert.equal((await login('admin')).statusCode, 401);
    const a = await login('a'); assert.equal(a.statusCode, 200); assert.equal(a.json().user.merchant.id, original);
    const b = await login('b'); assert.equal(b.statusCode, 200);
    const cookie = cookieOf(a); const secondCookie = cookieOf(b);
    const read = () => app.inject({ url: `/api/merchant/deals?merchantId=${other}`, headers: { cookie } });
    const own = await read(); assert.equal(own.statusCode, 200); assert.equal(own.json().deals.length, 1);
    assert.equal(own.json().deals[0].slug, 'cleava-kotisiivous-ja-muuttosiivous');
    const second = await app.inject({ url: '/api/merchant/deals', headers: { cookie: secondCookie } });
    assert.equal(second.json().deals.length, 1); assert.equal(second.json().deals[0].slug, 'private-b');
    assert.equal((await app.inject({ url: '/api/merchant/deals' })).statusCode, 401);
    const customer = await login('customer', '/api/auth/login');
    assert.equal((await app.inject({ url: '/api/merchant/deals', headers: { cookie: cookieOf(customer) } })).statusCode, 403);
    const admin = await login('admin', '/api/auth/admin/login'); assert.equal(admin.statusCode, 200);
    assert.equal((await app.inject({ url: '/api/admin/merchants', headers: { cookie } })).statusCode, 403);
    await sql`UPDATE public.merchant_members SET is_active=false WHERE user_id=${ids.a}`;
    assert.equal((await read()).statusCode, 401);
    assert.equal((await app.inject({ url: '/api/auth/me', headers: { cookie } })).json().user, null);
    await sql`UPDATE public.merchant_members SET is_active=true WHERE user_id=${ids.a}`;
    await sql`UPDATE public.merchants SET status='pending' WHERE id=${original}`;
    assert.equal((await read()).statusCode, 200);
    await sql`UPDATE public.merchants SET status='suspended' WHERE id=${original}`;
    assert.equal((await read()).statusCode, 401);
    await sql`UPDATE public.merchants SET status='active' WHERE id=${original}`;
    await sql`UPDATE public.profiles SET is_active=false WHERE user_id=${ids.a}`;
    assert.equal((await read()).statusCode, 401);
    await sql`UPDATE public.profiles SET is_active=true WHERE user_id=${ids.a}`;
    // A voucher for A must reveal no deal/customer details through B's authenticated lookup.
    const deal = (await sql`SELECT id FROM public.deals WHERE merchant_id=${original}`)[0]!.id;
    const option = (await sql`SELECT id FROM public.deal_options WHERE deal_id=${deal} ORDER BY id LIMIT 1`)[0]!.id;
    const order = (await sql`INSERT INTO public.orders(number,status,is_test,locale,email,first_name,last_name,payment_method,total_cents,access_token_hash)
      VALUES ('VD-ABCDEF','test_unpaid',true,'en','buyer@example.com','Test','Buyer','test',8900,'hash') RETURNING id`)[0]!.id;
    const item = (await sql`INSERT INTO public.order_items(order_id,line_no,deal_id,option_id,qty,unit_price_cents,total_cents,vat_bps,title,merchant_name)
      VALUES (${order},1,${deal},${option},1,8900,8900,2550,${sql.json(title)},'A') RETURNING id`)[0]!.id;
    await sql`INSERT INTO public.vouchers(code,qr_payload,order_id,order_item_id,deal_id,option_id,merchant_id,is_test,price_cents,expires_at)
      VALUES ('VND-ABCD-EFGH','https://example.com',${order},${item},${deal},${option},${original},true,8900,now()+interval '1 month')`;
    const lookup = (cookie: string) => app.inject({ method: 'POST', url: '/api/merchant/vouchers/lookup', headers: { cookie }, payload: { code: 'VND-ABCD-EFGH' } });
    assert.equal((await lookup(cookie)).json().result, 'valid');
    const wrong = (await lookup(secondCookie)).json(); assert.deepEqual(wrong, { code: 'VND-ABCD-EFGH', result: 'other_merchant' });
    // Redemption: only the owning business, only once, never from another site.
    const redeem = (cookie: string, headers: Record<string, string> = {}) =>
      app.inject({ method: 'POST', url: '/api/merchant/vouchers/redeem', headers: { cookie, ...headers }, payload: { code: 'VND-ABCD-EFGH' } });
    const otherBusiness = await redeem(secondCookie);
    assert.equal(otherBusiness.statusCode, 409); assert.equal(otherBusiness.json().error, 'redeem_other_merchant');
    assert.equal((await redeem(cookie, { origin: 'https://evil.example' })).statusCode, 403);
    assert.equal((await sql`SELECT status FROM public.vouchers WHERE code='VND-ABCD-EFGH'`)[0]!.status, 'active');
    assert.equal((await app.inject({ method: 'POST', url: '/api/merchant/vouchers/redeem', payload: { code: 'VND-ABCD-EFGH' } })).statusCode, 401);
    assert.equal((await redeem(cookieOf(admin))).statusCode, 403);
    // Two tills racing must yield exactly one success; the other observes the saved used state.
    const racing = await Promise.all([redeem(cookie), redeem(cookie)]);
    assert.deepEqual(racing.map(r => r.statusCode).sort(), [200, 409]);
    const done = racing.find(r => r.statusCode === 200)!;
    assert.equal(done.statusCode, 200); assert.equal(done.json().result, 'redeemed'); assert.equal(done.json().payoutCents, 7565);
    assert.ok(done.json().redeemedAt);
    const [saved] = await sql`SELECT status, redeemed_at, redeemed_by, redeemed_by_role FROM public.vouchers WHERE code='VND-ABCD-EFGH'`;
    assert.equal(saved!.status, 'redeemed'); assert.ok(saved!.redeemed_at);
    assert.equal(saved!.redeemed_by, ids.a); assert.equal(saved!.redeemed_by_role, 'merchant');
    // Earnings preview uses existing redeemed rows, never a client-supplied business ID.
    assert.equal((await app.inject({ url: '/api/merchant/payouts' })).statusCode, 401);
    assert.equal((await app.inject({ url: '/api/merchant/payouts', headers: { cookie: cookieOf(admin) } })).statusCode, 403);
    const preview = (await app.inject({ url: `/api/merchant/payouts?merchantId=${other}`, headers: { cookie } })).json();
    assert.equal(preview.preview, true); assert.equal(preview.hasMore, false); assert.equal(preview.rows.length, 1);
    assert.equal(preview.rows[0].code, 'VND-ABCD-EFGH'); assert.equal(preview.rows[0].test, true);
    assert.equal(preview.rows[0].payoutCents, 7565); assert.equal(preview.rows[0].feeCents, 1335);
    assert.equal(preview.rows[0].orderNumber, 'VD-ABCDEF'); assert.equal(preview.rows[0].email, undefined);
    assert.equal((await app.inject({ url: `/api/merchant/payouts?merchantId=${original}`, headers: { cookie: secondCookie } })).json().rows.length, 0);
    const again = await redeem(cookie);
    assert.equal(again.statusCode, 409); assert.equal(again.json().error, 'redeem_redeemed');
    assert.equal((await lookup(cookie)).json().result, 'redeemed');
    await sql`UPDATE public.vouchers SET status='active', redeemed_at=NULL, issued_at=now() - interval '2 days', expires_at=now() - interval '1 day' WHERE code='VND-ABCD-EFGH'`;
    assert.equal((await redeem(cookie)).json().error, 'redeem_expired');
    await sql`UPDATE public.vouchers SET status='refunded', refunded_at=now(), expires_at=now()+interval '1 day' WHERE code='VND-ABCD-EFGH'`;
    assert.equal((await redeem(cookie)).json().error, 'redeem_refunded');
    assert.equal((await app.inject({ url: '/api/merchant/payouts', headers: { cookie } })).json().rows.length, 0);
    // Admin support refunds: real saved state, no payment provider, no refund of used vouchers.
    const refundCode = 'VND-RFND-ABCD';
    const raceCode = 'VND-RACE-ABCD';
    const twiceCode = 'VND-TWCE-ABCD';
    const refund = (code: string, authCookie = cookieOf(admin), extra: Record<string, string> = {}) =>
      app.inject({ method: 'POST', url: '/api/admin/refunds', headers: { cookie: authCookie, ...extra }, payload: { code } });
    for (const newCode of [refundCode, raceCode, twiceCode, 'VND-USED-ABCD']) {
      await sql`INSERT INTO public.vouchers(code,qr_payload,order_id,order_item_id,deal_id,option_id,merchant_id,is_test,price_cents,issued_at,expires_at)
        VALUES (${newCode},'https://example.com',${order},${item},${deal},${option},${original},true,8900,now()-interval '30 days',now()+interval '1 day')`;
    }
    await sql`UPDATE public.vouchers SET status='expired', expires_at=now()-interval '1 day' WHERE code=${refundCode}`;
    await sql`UPDATE public.vouchers SET status='redeemed', redeemed_at=now() WHERE code='VND-USED-ABCD'`;
    assert.equal((await refund('VND-USED-ABCD')).json().error, 'refundAlreadyRedeemed');
    assert.equal((await app.inject({ method: 'POST', url: '/api/admin/refunds', payload: { code: refundCode } })).statusCode, 401);
    assert.equal((await refund(refundCode, cookie)).statusCode, 403);
    assert.equal((await app.inject({ url: '/api/admin/refunds', headers: { cookie } })).statusCode, 403);
    assert.equal((await refund(refundCode, cookieOf(admin), { origin: 'https://evil.example' })).statusCode, 403);
    assert.equal((await refund('invalid')).statusCode, 400);
    assert.equal((await refund('VND-ZZZZ-ZZZZ')).statusCode, 404);
    const refunded = await refund(refundCode.toLowerCase());
    assert.equal(refunded.statusCode, 200); assert.equal(refunded.json().voucher.status, 'refunded');
    assert.ok(refunded.json().voucher.refundedAt);
    assert.equal((await sql`SELECT status FROM public.vouchers WHERE code=${refundCode}`)[0]!.status, 'refunded');
    assert.equal((await sql`SELECT status FROM public.orders WHERE id=${order}`)[0]!.status, 'test_unpaid');
    assert.equal((await app.inject({ url: `/api/vouchers/${refundCode}` })).json().result, 'refunded');
    const originalRefundDate = refunded.json().voucher.refundedAt;
    assert.equal((await refund(refundCode)).json().error, 'refundAlreadyRefunded');
    const listed = (await app.inject({ url: '/api/admin/refunds', headers: { cookie: cookieOf(admin) } })).json();
    const listedRefund = listed.refunds.find((r: { code: string }) => r.code === refundCode);
    assert.equal(listedRefund.refundedAt, originalRefundDate); assert.equal(listedRefund.order.email, 'buyer@example.com');
    assert.equal(listed.hasMore, false);
    // Refund and redemption lock the same row: exactly one wins, regardless of timing.
    const race = await Promise.all([refund(raceCode), app.inject({ method: 'POST', url: '/api/merchant/vouchers/redeem', headers: { cookie }, payload: { code: raceCode } })]);
    assert.deepEqual(race.map(r => r.statusCode).sort(), [200, 409]);
    if (race[1]!.statusCode === 200) assert.equal((await refund(raceCode)).json().error, 'refundAlreadyRedeemed');
    const duplicate = await Promise.all([refund(twiceCode), refund(twiceCode)]);
    assert.deepEqual(duplicate.map(r => r.statusCode).sort(), [200, 409]);
    // Admin redemption has its own guarded endpoint and records the verified actor/role.
    const adminRedeem = (code: string, authCookie = cookieOf(admin), extra: Record<string, string> = {}) =>
      app.inject({ method: 'POST', url: '/api/admin/vouchers/redeem', headers: { cookie: authCookie, ...extra },
        payload: { code, redeemed_by: ids.a, redeemed_by_role: 'merchant' } });
    for (const code of ['VND-ADMN-AAAA', 'VND-ADMN-RACE', 'VND-ADMN-RFND', 'VND-ADMN-EXPD']) {
      await sql`INSERT INTO public.vouchers(code,qr_payload,order_id,order_item_id,deal_id,option_id,merchant_id,is_test,price_cents,expires_at)
        VALUES (${code},'https://example.com',${order},${item},${deal},${option},${original},true,8900,now()+interval '1 month')`;
    }
    assert.equal((await app.inject({ method: 'POST', url: '/api/admin/vouchers/redeem', payload: { code: 'VND-ADMN-AAAA' } })).statusCode, 401);
    assert.equal((await adminRedeem('VND-ADMN-AAAA', cookie)).statusCode, 403);
    assert.equal((await adminRedeem('VND-ADMN-AAAA', cookieOf(customer))).statusCode, 403);
    assert.equal((await adminRedeem('VND-ADMN-AAAA', cookieOf(admin), { origin: 'https://evil.example' })).statusCode, 403);
    assert.equal((await adminRedeem('invalid')).statusCode, 400);
    assert.equal((await adminRedeem('VND-ZZZZ-ZZZZ')).statusCode, 404);
    const adminDone = await adminRedeem('vnd-admn-aaaa');
    assert.equal(adminDone.statusCode, 200, adminDone.body);
    assert.equal(adminDone.json().voucher.status, 'redeemed');
    assert.equal(adminDone.json().voucher.redeemedByRole, 'admin');
    assert.deepEqual(adminDone.json().voucher.redeemedBy, { id: ids.admin, name: 'admin' });
    const [adminSaved] = await sql`SELECT redeemed_by, redeemed_by_role, redeemed_at FROM public.vouchers WHERE code='VND-ADMN-AAAA'`;
    assert.equal(adminSaved!.redeemed_by, ids.admin); assert.equal(adminSaved!.redeemed_by_role, 'admin');
    assert.equal((await adminRedeem('VND-ADMN-AAAA')).statusCode, 409);
    assert.equal((await refund('VND-ADMN-AAAA')).json().error, 'refundAlreadyRedeemed');
    const merchantAfterAdmin = await app.inject({ method: 'POST', url: '/api/merchant/vouchers/redeem', headers: { cookie }, payload: { code: 'VND-ADMN-AAAA' } });
    assert.equal(merchantAfterAdmin.statusCode, 409);
    assert.equal((await sql`SELECT redeemed_by FROM public.vouchers WHERE code='VND-ADMN-AAAA'`)[0]!.redeemed_by, ids.admin);
    const earnings = (await app.inject({ url: '/api/merchant/payouts', headers: { cookie } })).json();
    assert.ok(earnings.rows.some((r: { code: string }) => r.code === 'VND-ADMN-AAAA'));
    await sql`UPDATE public.vouchers SET issued_at=now()-interval '2 days', expires_at=now()-interval '1 day' WHERE code='VND-ADMN-EXPD'`;
    assert.equal((await adminRedeem('VND-ADMN-EXPD')).json().error, 'redeem_expired');
    assert.equal((await adminRedeem(refundCode)).json().error, 'redeem_refunded');
    const mixed = await Promise.all([adminRedeem('VND-ADMN-RACE'), app.inject({ method: 'POST', url: '/api/merchant/vouchers/redeem', headers: { cookie }, payload: { code: 'VND-ADMN-RACE' } })]);
    assert.deepEqual(mixed.map(r => r.statusCode).sort(), [200, 409]);
    const winner = (await sql`SELECT redeemed_by, redeemed_by_role FROM public.vouchers WHERE code='VND-ADMN-RACE'`)[0]!;
    assert.equal(winner.redeemed_by, mixed[0]!.statusCode === 200 ? ids.admin : ids.a);
    assert.equal(winner.redeemed_by_role, mixed[0]!.statusCode === 200 ? 'admin' : 'merchant');
    const refundRace = await Promise.all([adminRedeem('VND-ADMN-RFND'), refund('VND-ADMN-RFND')]);
    assert.deepEqual(refundRace.map(r => r.statusCode).sort(), [200, 409]);
    const old = (await app.inject({ url: '/api/admin/vouchers/VND-USED-ABCD', headers: { cookie: cookieOf(admin) } })).json().voucher;
    assert.equal(old.redeemedByRole, null); assert.equal(old.redeemedBy, null);
    await app.inject({ method: 'POST', url: '/api/auth/logout', headers: { cookie }, payload: {} });
    assert.equal((await read()).statusCode, 401);
    await sql`DELETE FROM public.merchant_members WHERE user_id=${ids.b}`;
    assert.equal((await app.inject({ url: '/api/merchant/deals', headers: { cookie: secondCookie } })).statusCode, 401);
    assert.equal((await sql`SELECT count(*)::int AS n FROM auth.users`)[0]!.n, 5);
  } finally { await app.close(); }
});
