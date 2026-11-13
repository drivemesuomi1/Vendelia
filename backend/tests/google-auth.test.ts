import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { it } from 'node:test';
import Fastify from 'fastify';
import { authConfig } from '../src/modules/auth/config.js';
import { SupabaseGoogleProvider, type OAuthProvider } from '../src/modules/auth/provider.js';
import { authRoutes } from '../src/modules/auth/routes.js';
import { AuthService } from '../src/modules/auth/service.js';
import type { AccountRepository } from '../src/modules/auth/repository.js';
import type { SessionUserDTO } from '@vendelia/shared';

const id = '00000000-0000-4000-8000-000000000009';
const config = authConfig({ SUPABASE_URL: 'https://project.supabase.co', SUPABASE_PUBLISHABLE_KEY: 'pub', FRONTEND_URL: 'http://localhost:3000' });

function setup(role: SessionUserDTO['role'] = 'customer') {
  const created: string[] = [];
  const sessions: string[] = [];
  const repository: AccountRepository = {
    ensureCustomerProfile: async (userId, name) => { created.push(`${userId}:${name}`); },
    profile: async () => ({ id, email: 'g@example.com', name: 'G', role, merchant: null }),
    session: async () => null, createSession: async hash => { sessions.push(hash); }, deleteSession: async () => {},
  };
  const seen: { challenge?: string; redirectTo?: string; code?: string; verifier?: string } = {};
  const oauth: OAuthProvider = {
    authorizeUrl: (redirectTo, challenge) => { seen.redirectTo = redirectTo; seen.challenge = challenge; return 'https://project.supabase.co/auth/v1/authorize?x=1'; },
    exchange: async (code, verifier) => { seen.code = code; seen.verifier = verifier; if (code === 'bad') throw new Error('x'); return { id, email: 'g@example.com', name: 'Gee' }; },
  };
  const app = Fastify();
  app.register(authRoutes, { service: new AuthService(repository, { verify: async () => ({ id, email: 'x' }) }), config, oauth });
  return { app, created, sessions, seen };
}
const cookieOf = (res: { headers: Record<string, unknown> }) => ([] as string[]).concat(res.headers['set-cookie'] as string | string[]);

it('Google sign-in: PKCE start, callback creates a customer session and honours a safe next path', async () => {
  const { app, created, sessions, seen } = setup();
  const start = await app.inject({ url: '/api/auth/google?next=/en/checkout' });
  assert.equal(start.statusCode, 302);
  assert.equal(seen.redirectTo, 'http://localhost:3000/api/auth/google/callback');
  const oauthCookie = cookieOf(start)[0]!;
  assert.match(oauthCookie, /HttpOnly; SameSite=Lax/);
  const value = oauthCookie.split(';')[0]!.split('=')[1]!;
  const [verifier] = value.split('.');
  assert.equal(seen.challenge, createHash('sha256').update(verifier!).digest('base64url'));
  const done = await app.inject({ url: '/api/auth/google/callback?code=abc', headers: { cookie: `vd_oauth=${value}` } });
  assert.equal(done.statusCode, 200);
  assert.match(done.body, /http-equiv="refresh" content="0;url=http:\/\/localhost:3000\/en\/checkout"/);
  assert.equal(seen.verifier, verifier);
  assert.ok(cookieOf(done).some(c => /^vd_session=[a-f0-9]{64}; .*SameSite=Strict/.test(c)));
  assert.deepEqual(created, [`${id}:Gee`]);
  assert.equal(sessions.length, 1);
  await app.close();
});

it('Google sign-in: rejects open redirects, missing verifier, failed exchange and non-customer roles', async () => {
  const a = setup();
  const start = await a.app.inject({ url: '/api/auth/google?next=//evil.example' });
  const value = cookieOf(start)[0]!.split(';')[0]!.split('=')[1]!;
  const ok = await a.app.inject({ url: '/api/auth/google/callback?code=abc', headers: { cookie: `vd_oauth=${value}` } });
  assert.match(ok.body, /content="0;url=http:\/\/localhost:3000\/"/);
  const noCookie = await a.app.inject({ url: '/api/auth/google/callback?code=abc' });
  assert.match(String(noCookie.headers.location), /login\?error=google$/);
  const bad = await a.app.inject({ url: '/api/auth/google/callback?code=bad', headers: { cookie: `vd_oauth=${value}` } });
  assert.match(String(bad.headers.location), /login\?error=google$/);
  assert.equal(a.sessions.length, 1);
  const admin = setup('admin');
  const s2 = await admin.app.inject({ url: '/api/auth/google' });
  const v2 = cookieOf(s2)[0]!.split(';')[0]!.split('=')[1]!;
  const denied = await admin.app.inject({ url: '/api/auth/google/callback?code=abc', headers: { cookie: `vd_oauth=${v2}` } });
  assert.match(String(denied.headers.location), /login\?error=google$/);
  assert.equal(admin.sessions.length, 0);
  await Promise.all([a.app.close(), admin.app.close()]);
});

it('Google provider uses the Supabase PKCE endpoints', async () => {
  const provider = new SupabaseGoogleProvider(config);
  const url = new URL(provider.authorizeUrl('http://localhost:3000/api/auth/google/callback', 'chal'));
  assert.equal(url.origin + url.pathname, 'https://project.supabase.co/auth/v1/authorize');
  assert.equal(url.searchParams.get('provider'), 'google');
  assert.equal(url.searchParams.get('code_challenge_method'), 's256');
  const original = globalThis.fetch;
  try {
    globalThis.fetch = async (u, init) => {
      assert.equal(u, 'https://project.supabase.co/auth/v1/token?grant_type=pkce');
      assert.deepEqual(JSON.parse(String(init?.body)), { auth_code: 'c', code_verifier: 'v' });
      return Response.json({ access_token: 't', user: { id, email: 'g@example.com', user_metadata: { full_name: 'Gee' } } });
    };
    assert.deepEqual(await provider.exchange('c', 'v'), { id, email: 'g@example.com', name: 'Gee' });
  } finally { globalThis.fetch = original; }
});
