import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { it } from 'node:test';
import Fastify from 'fastify';
import type { Sql } from 'postgres';
import type { SessionUserDTO } from '@vendelia/shared';
import { authConfig } from '../src/modules/auth/config.js';
import { PasswordResetService } from '../src/modules/auth/password-reset.js';
import type { OAuthProvider } from '../src/modules/auth/provider.js';
import type { AccountRepository } from '../src/modules/auth/repository.js';
import { authRoutes } from '../src/modules/auth/routes.js';
import { AuthService } from '../src/modules/auth/service.js';
import type { MailMessage } from '../src/modules/vouchers/mailer.js';

const id = '00000000-0000-4000-8000-000000000021';
const config = authConfig({ SUPABASE_URL: 'https://project.supabase.co', SUPABASE_PUBLISHABLE_KEY: 'pub', FRONTEND_URL: 'http://localhost:3000' });
const oauth: OAuthProvider = { authorizeUrl: () => 'https://x', exchange: async () => { throw new Error('unused'); } };
const sha256 = (value: string) => createHash('sha256').update(value).digest('hex');

/** In-memory stand-in for auth.users / profiles / auth_sessions, answering the few queries the service makes. */
function setup(role: SessionUserDTO['role'] = 'customer') {
  const user = { id, email: 'maija@example.com', role, meta: {} as Record<string, unknown>, password: 'old-password', sessions: 2 };
  const sql = (async (strings: TemplateStringsArray, ...values: unknown[]) => {
    const text = strings.join('?');
    if (text.includes('lower(u.email)')) return values[0] === user.email ? [{ id: user.id }] : [];
    if (text.includes('vendelia_reset')) return values[0] === user.id ? [{ hash: user.meta.vendelia_reset ?? null, expires: user.meta.vendelia_reset_expires ?? null, role: user.role }] : [];
    if (text.includes('DELETE FROM public.auth_sessions')) { user.sessions = 0; return []; }
    throw new Error(`unexpected query: ${text}`);
  }) as unknown as Sql;
  const admin = {
    updateUser: async (userId: string, changes: { password?: string; appMetadata?: Record<string, unknown> }) => {
      assert.equal(userId, user.id);
      if (changes.password) user.password = changes.password;
      for (const [key, value] of Object.entries(changes.appMetadata ?? {})) {
        if (value === null) delete user.meta[key]; else user.meta[key] = value;
      }
    },
  };
  const mail: MailMessage[] = [];
  const service = new PasswordResetService(sql, admin, { send: async (m) => { mail.push(m); return { id: 'x' }; } }, 'http://localhost:3000');
  const linkOf = (m: MailMessage) => new URL(m.text.split('\n').find((line) => line.startsWith('http'))!);
  return { user, service, mail, linkOf };
}

it('forgot password emails a one-hour link and only stores the token hash', async () => {
  const { user, service, mail, linkOf } = setup();
  await service.request('maija@example.com', 'en');
  assert.equal(mail.length, 1);
  assert.equal(mail[0]!.subject, 'Reset your Vendelia password');
  const link = linkOf(mail[0]!);
  assert.equal(link.origin + link.pathname, 'http://localhost:3000/en/reset-password');
  assert.equal(link.searchParams.get('u'), id);
  const token = link.searchParams.get('t')!;
  assert.match(token, /^[a-f0-9]{64}$/);
  assert.equal(user.meta.vendelia_reset, sha256(token));
  const minutes = (Date.parse(user.meta.vendelia_reset_expires as string) - Date.now()) / 60_000;
  assert.ok(minutes > 59 && minutes <= 60);
  assert.match(mail[0]!.text, /3666248-7/);
});

it('forgot password sends nothing for an unknown email', async () => {
  const { service, mail } = setup();
  await service.request('nobody@example.com', 'fi');
  assert.equal(mail.length, 0);
});

it('reset sets the password, works once and signs out every session', async () => {
  const { user, service, mail, linkOf } = setup('merchant');
  await service.request(user.email, 'fi');
  const token = linkOf(mail[0]!).searchParams.get('t')!;
  await assert.rejects(service.reset(id, '0'.repeat(64), 'new-password-1'), { code: 'resetLinkInvalid' });
  assert.equal(await service.reset(id, token, 'new-password-1'), 'merchant');
  assert.equal(user.password, 'new-password-1');
  assert.equal(user.sessions, 0);
  assert.equal(user.meta.vendelia_reset, undefined);
  await assert.rejects(service.reset(id, token, 'new-password-2'), { code: 'resetLinkInvalid' });
});

it('an older link stops working when a new one is requested, and expired links are refused', async () => {
  const { user, service, mail, linkOf } = setup();
  await service.request(user.email, 'en');
  await service.request(user.email, 'en');
  const [first, second] = mail.map((m) => linkOf(m).searchParams.get('t')!);
  await assert.rejects(service.reset(id, first!, 'new-password-1'), { code: 'resetLinkInvalid' });
  user.meta.vendelia_reset_expires = new Date(Date.now() - 1000).toISOString();
  await assert.rejects(service.reset(id, second!, 'new-password-1'), { code: 'resetLinkInvalid' });
});

it('routes: forgot answers the same for any email; reset validates the password', async () => {
  const { service, mail } = setup();
  const app = Fastify();
  const repository: AccountRepository = {
    ensureCustomerProfile: async () => {}, profile: async () => null, session: async () => null, createSession: async () => {}, deleteSession: async () => {},
  };
  app.register(authRoutes, { service: new AuthService(repository, { verify: async () => ({ id, email: 'x' }) }), config, oauth, passwordReset: service });
  for (const email of ['maija@example.com', 'nobody@example.com']) {
    const res = await app.inject({ method: 'POST', url: '/api/auth/forgot', payload: { email }, headers: { 'x-locale': 'sv' } });
    assert.equal(res.statusCode, 202);
    assert.deepEqual(res.json(), { ok: true });
  }
  assert.equal(mail.length, 1);
  assert.equal(mail[0]!.subject, 'Byt lösenord för Vendelia');
  const short = await app.inject({ method: 'POST', url: '/api/auth/reset', payload: { id, token: 'a'.repeat(64), password: 'short' } });
  assert.equal(short.statusCode, 400);
  assert.equal(short.json().message, 'passwordTooShort'); // app.ts maps this to { error }; the bare test app keeps it in message
  const forged = await app.inject({ method: 'POST', url: '/api/auth/forgot', payload: { email: 'maija@example.com' }, headers: { origin: 'https://evil.example' } });
  assert.equal(forged.statusCode, 403);
});

it('remember me: 30-day cookie when checked, browser-session cookie when not; staff sign-in unchanged', async () => {
  const user: SessionUserDTO = { id, email: 'maija@example.com', name: 'Maija', role: 'customer', merchant: null };
  const expiries: number[] = [];
  const repository: AccountRepository = {
    ensureCustomerProfile: async () => {}, profile: async () => user, session: async () => null, deleteSession: async () => {},
    createSession: async (_hash, _id, expires) => { expiries.push((Date.parse(expires) - Date.now()) / 3600_000); },
  };
  const app = Fastify();
  app.register(authRoutes, { service: new AuthService(repository, { verify: async () => ({ id, email: user.email }) }), config, oauth });
  const login = (url: string, remember?: boolean) => app.inject({ method: 'POST', url, payload: { email: user.email, password: 'pw', ...(remember === undefined ? {} : { remember }) } });
  const cookie = (res: { headers: Record<string, unknown> }) => String(res.headers['set-cookie']);

  assert.match(cookie(await login('/api/auth/login', true)), /Max-Age=2592000/);
  assert.doesNotMatch(cookie(await login('/api/auth/login', false)), /Max-Age/);
  assert.match(cookie(await login('/api/auth/login')), /Max-Age=28800/);
  user.role = 'admin';
  assert.match(cookie(await login('/api/auth/admin/login', true)), /Max-Age=28800/);
  assert.deepEqual(expiries.map(Math.round), [720, 8, 8, 8]);
});
