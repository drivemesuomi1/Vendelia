import { it } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import postgres from 'postgres';
import { adminMerchantCreateSchema, validFinnishBusinessId } from '@vendelia/shared';
import { buildApp } from '../src/app.js';
import { HttpProblem } from '../src/errors.js';
import { authConfig } from '../src/modules/auth/config.js';
import { hashSession } from '../src/modules/auth/service.js';
import { SupabaseUserProvisioner, type ProvisionedUser, type UserProvisioner } from '../src/modules/auth/user-provisioner.js';

it('validates optional provisioning credentials without changing business-only input', () => {
  const input = { name: 'Business', companyName: 'Business Oy', businessId: '1234567-1', contactName: 'Contact', cityId: 'helsinki', categoryId: 'cleaning' };
  assert.equal(adminMerchantCreateSchema.safeParse(input).success, true);
  assert.equal(adminMerchantCreateSchema.safeParse({ ...input, login: { email: 'user@example.com', password: 'short' } }).success, false);
  assert.equal(adminMerchantCreateSchema.safeParse({ ...input, login: { email: 'bad', password: 'long-password' } }).success, false);
  assert.equal(adminMerchantCreateSchema.safeParse({ ...input, login: { email: 'a@example.com', password: 'ä'.repeat(40) } }).success, false);
  assert.equal(adminMerchantCreateSchema.safeParse({ ...input, login: { email: 'a@example.com', password: 'long-password', role: 'admin' } }).success, false);
});

it('uses the server Auth admin API with pinned UUID/metadata and sanitized provider errors', async () => {
  const previous = globalThis.fetch;
  const id = '00000000-0000-4000-8000-000000000001';
  const operation = '00000000-0000-4000-8000-000000000002';
  const provider = new SupabaseUserProvisioner('https://test.supabase.co', 'sb_secret_test');
  try {
    globalThis.fetch = async (url, init) => {
      assert.equal(url, 'https://test.supabase.co/auth/v1/admin/users');
      const headers = new Headers(init?.headers);
      assert.equal(headers.get('apikey'), 'sb_secret_test'); assert.equal(headers.get('authorization'), null);
      const body = JSON.parse(String(init?.body));
      assert.equal(body.id, id); assert.equal(body.email_confirm, true);
      assert.equal(body.password, 'initial-password'); assert.equal(body.app_metadata.vendelia_provisioning_id, operation);
      return Response.json({ id, email: 'user@example.com', app_metadata: body.app_metadata });
    };
    assert.deepEqual(await provider.create({ id, email: 'user@example.com', password: 'initial-password', provisioningId: operation }), { id, email: 'user@example.com', provisioningId: operation });
    globalThis.fetch = async () => Response.json({ error_code: 'email_exists', msg: 'private' }, { status: 422 });
    await assert.rejects(provider.create({ id, email: 'user@example.com', password: 'initial-password', provisioningId: operation }), { code: 'email_taken' });
    globalThis.fetch = async () => Response.json({}, { status: 404 });
    assert.equal(await provider.find(id), null);
    globalThis.fetch = async () => { throw new Error('private network details'); };
    await assert.rejects(provider.find(id), { code: 'provisioningPending' });
    assert.throws(() => new SupabaseUserProvisioner('', '').assertConfigured(), { code: 'provisioningNotConfigured' });
  } finally { globalThis.fetch = previous; }
});

const url = process.env.TEST_PROVISIONING_DATABASE_URL;
it('creates linked accounts, resumes partial failures, prevents duplicates/takeovers, and never stores passwords in app tables', { skip: !url }, async () => {
  assert.match(new URL(url!).pathname, /^\/vendelia_test_provisioning(?:_[a-z0-9]+)?$/);
  const sql = postgres(url!, { prepare: false, idle_timeout: 1 });
  const fixture = (path: string) => readFile(new URL(path, import.meta.url), 'utf8');
  await sql.unsafe(`CREATE SCHEMA auth;
    CREATE TABLE auth.users(id uuid PRIMARY KEY, email text UNIQUE, email_confirmed_at timestamptz, deleted_at timestamptz, banned_until timestamptz);`);
  await sql.unsafe(await fixture('./fixtures/catalogue-schema.sql'));
  await sql.unsafe(await fixture('../sql/seed-catalogue.sql'));
  for (const name of ['002_profiles.sql','003_auth_sessions.sql','004_merchant_contact_and_classification.sql','005_merchant_members.sql','006_merchant_account_provisioning.sql','006_merchant_account_provisioning.sql']) {
    await sql.begin(async tx => { await tx.unsafe('SET LOCAL client_min_messages=warning;\n'+await fixture(`../sql/migrations/${name}`)); });
  }
  const adminId = '00000000-0000-4000-8000-000000000001';
  const existingId = '00000000-0000-4000-8000-000000000002';
  for (const [id, role, email, token] of [[adminId,'admin','admin@example.com','a'.repeat(64)],[existingId,'customer','existing@example.com','b'.repeat(64)]]) {
    await sql`INSERT INTO auth.users(id,email,email_confirmed_at) VALUES (${id!},${email!},now())`;
    await sql`INSERT INTO public.profiles(user_id,display_name,role) VALUES (${id!},${role!},${role!})`;
    await sql`INSERT INTO public.auth_sessions(token_hash,user_id,expires_at) VALUES (${hashSession(token!)},${id!},now()+interval '1 hour')`;
  }
  const passwords = new Map<string,string>();
  const identities = new Map<string,ProvisionedUser>();
  let creates = 0; let timeoutAfterCreate = false;
  const users: UserProvisioner = {
    assertConfigured() {},
    async find(id) { return identities.get(id) ?? null; },
    async create(input) {
      creates++;
      if ((await sql`SELECT id FROM auth.users WHERE lower(email)=${input.email}`).length) throw new HttpProblem(409,'email_taken');
      // Simulates a separate committed Supabase Auth request, outside the app transaction.
      await sql`INSERT INTO auth.users(id,email,email_confirmed_at) VALUES (${input.id},${input.email},now())`;
      const user = { id: input.id, email: input.email, provisioningId: input.provisioningId };
      identities.set(input.id,user); passwords.set(input.email,input.password);
      if (timeoutAfterCreate) { timeoutAfterCreate=false; throw new HttpProblem(503,'provisioningPending'); }
      return user;
    },
  };
  const app = buildApp(sql, {
    auth: authConfig({ SUPABASE_URL:'https://test.supabase.co', SUPABASE_PUBLISHABLE_KEY:'test' }), userProvisioner: users,
    passwordProvider: { verify: async (email,password) => {
      const [user] = await sql`SELECT id,email FROM auth.users WHERE lower(email)=${email}`;
      if (!user || passwords.get(email)!==password) throw new HttpProblem(401,'invalidLogin');
      return { id:user.id as string,email:user.email as string };
    } },
  });
  const businessId = (prefix:string) => Array.from({ length:10 },(_,i)=>`${prefix}-${i}`).find(validFinnishBusinessId)!;
  const base = { name:'New business',companyName:'New Business Oy',contactName:'Owner',publicEmail:'public@example.com',phone:'',cityId:'helsinki',categoryId:'cleaning',status:'active' };
  const input = { ...base,businessId:businessId('1738567'),login:{ email:'new@example.com',password:'Initial!Password42' } };
  const create = (payload:Record<string,unknown>,cookie='vd_session='+'a'.repeat(64)) => app.inject({ method:'POST',url:'/api/admin/merchants',headers:{ cookie },payload });
  try {
    assert.equal((await create(input,'')).statusCode,401);
    assert.equal((await create(input,'vd_session='+'b'.repeat(64))).statusCode,403);
    assert.equal(creates,0);
    const [first,retry] = await Promise.all([create(input),create(input)]);
    assert.equal(first.statusCode,201); assert.equal(retry.statusCode,201);
    assert.equal(first.json().merchant.id,retry.json().merchant.id); assert.equal(creates,1);
    assert.deepEqual([first.json().login.passwordSet,retry.json().login.passwordSet].sort(),[false,true]);
    const [membership] = await sql`SELECT mm.*,p.role FROM public.merchant_members mm JOIN public.profiles p ON p.user_id=mm.user_id WHERE mm.merchant_id=${first.json().merchant.id}`;
    assert.equal(membership!.role,'merchant'); assert.equal(membership!.member_role,'owner');
    const jobs = await sql`SELECT * FROM public.merchant_account_provisioning`;
    assert.equal(jobs.length,1); assert.equal(jobs[0]!.state,'complete'); assert.equal(jobs[0]!.created_by,adminId);
    assert.equal(JSON.stringify(jobs).includes(input.login.password),false);
    assert.equal(first.body.includes(input.login.password),false);
    assert.equal((await create({ ...input,name:'Changed' })).statusCode,409);
    const replay = await create({ ...input,login:{ ...input.login,password:'Different!Password42' } });
    assert.equal(replay.statusCode,201); assert.equal(replay.json().login.passwordSet,false);
    assert.equal(passwords.get(input.login.email),input.login.password);
    const signedIn = await app.inject({ method:'POST',url:'/api/auth/merchant/login',payload:input.login });
    assert.equal(signedIn.statusCode,200); assert.equal(signedIn.json().user.merchant.id,first.json().merchant.id);
    // Existing identities are never attached, promoted or reset by the form.
    const duplicate = { ...base,businessId:businessId('2345678'),login:{ email:'existing@example.com',password:'Never!Overwrite42' } };
    const denied = await create(duplicate); assert.equal(denied.statusCode,409); assert.equal(denied.json().error,'email_taken');
    assert.equal((await sql`SELECT role FROM public.profiles WHERE user_id=${existingId}`)[0]!.role,'customer');
    assert.equal((await sql`SELECT * FROM public.merchant_members WHERE user_id=${existingId}`).length,0);
    // A definitive rejection without a created Auth user permits correcting the email.
    assert.equal((await create({ ...duplicate,login:{ ...duplicate.login,email:'corrected@example.com' } })).statusCode,201);
    const recovering = { ...base,businessId:businessId('3456780'),login:{ email:'recover@example.com',password:'Recovery!Password42' } };
    timeoutAfterCreate=true;
    const failed = await create(recovering); assert.equal(failed.statusCode,503);
    const [pending] = await sql`SELECT * FROM public.merchant_account_provisioning WHERE business_id=${recovering.businessId}`;
    assert.equal(pending!.state,'pending');
    assert.equal((await sql`SELECT * FROM public.merchants WHERE business_id=${recovering.businessId}`).length,0);
    assert.equal((await sql`SELECT * FROM public.profiles WHERE user_id=${pending!.auth_user_id}`).length,0);
    const beforeRetry=creates;
    const resumed=await create(recovering); assert.equal(resumed.statusCode,201); assert.equal(creates,beforeRetry);
    assert.equal(resumed.json().login.passwordSet,false);
    assert.equal((await sql`SELECT state FROM public.merchant_account_provisioning WHERE id=${pending!.id}`)[0]!.state,'complete');
    const noAccount={ ...base,businessId:businessId('4567890') };
    const beforePlain=creates; assert.equal((await create(noAccount)).statusCode,201); assert.equal(creates,beforePlain);
    assert.equal((await create(noAccount)).statusCode,409);
    const [rls]=await sql`SELECT relrowsecurity FROM pg_class WHERE oid='public.merchant_account_provisioning'::regclass`;
    assert.equal(rls!.relrowsecurity,true);
  } finally { await app.close(); }
});
