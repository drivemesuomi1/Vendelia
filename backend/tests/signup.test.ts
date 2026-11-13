import assert from 'node:assert/strict';
import { it } from 'node:test';
import Fastify from 'fastify';
import type { Sql } from 'postgres';
import type { SessionUserDTO } from '@vendelia/shared';
import { authConfig } from '../src/modules/auth/config.js';
import type { OAuthProvider } from '../src/modules/auth/provider.js';
import type { AccountRepository } from '../src/modules/auth/repository.js';
import { authRoutes } from '../src/modules/auth/routes.js';
import { AuthService } from '../src/modules/auth/service.js';
import { CODE_ATTEMPTS, SignupService } from '../src/modules/auth/signup.js';
import type { MailMessage } from '../src/modules/vouchers/mailer.js';

const config = authConfig({ SUPABASE_URL: 'https://project.supabase.co', SUPABASE_PUBLISHABLE_KEY: 'pub', FRONTEND_URL: 'http://localhost:3000' });
const oauth: OAuthProvider = { authorizeUrl: () => 'https://x', exchange: async () => { throw new Error('unused'); } };

interface FakeUser { id: string; email: string; password: string; confirmed: boolean; meta: Record<string, unknown> }

/** In-memory auth.users with the admin calls the service makes. */
function setup() {
  const users: FakeUser[] = [];
  const sql = (async (strings: TemplateStringsArray, ...values: unknown[]) => {
    if (!strings.join('?').includes('FROM auth.users')) throw new Error('unexpected query');
    const user = users.find((u) => u.email === values[0]);
    return user ? [{
      id: user.id, confirmed: user.confirmed, signup: user.meta.vendelia_signup ?? null, hash: user.meta.vendelia_code ?? null,
      expires: user.meta.vendelia_code_expires ?? null, attempts: Number(user.meta.vendelia_code_attempts ?? 0),
    }] : [];
  }) as unknown as Sql;
  const merge = (user: FakeUser, meta: Record<string, unknown> = {}) => {
    for (const [key, value] of Object.entries(meta)) { if (value === null) delete user.meta[key]; else user.meta[key] = value; }
  };
  const admin = {
    createUnconfirmed: async (input: { email: string; password: string; appMetadata: Record<string, unknown> }) => {
      const user: FakeUser = { id: `00000000-0000-4000-8000-${String(users.length + 1).padStart(12, '0')}`, email: input.email, password: input.password, confirmed: false, meta: {} };
      merge(user, input.appMetadata);
      users.push(user);
      return { id: user.id };
    },
    updateUser: async (id: string, changes: { password?: string; emailConfirm?: boolean; appMetadata?: Record<string, unknown> }) => {
      const user = users.find((u) => u.id === id)!;
      if (changes.password) user.password = changes.password;
      if (changes.emailConfirm) user.confirmed = true;
      merge(user, changes.appMetadata);
    },
  };
  const mail: MailMessage[] = [];
  const service = new SignupService(sql, admin, { send: async (m) => { mail.push(m); return { id: 'x' }; } });
  const codeOf = (m: MailMessage) => m.subject.match(/(\d{6})$/)![1]!;
  return { users, service, mail, codeOf };
}

it('sign-up creates a locked account and emails a 6-digit code; the right code confirms it', async () => {
  const { users, service, mail, codeOf } = setup();
  await service.register('maija@example.com', 'secret-pass', 'fi');
  assert.equal(users.length, 1);
  assert.equal(users[0]!.confirmed, false);
  assert.equal(mail.length, 1);
  assert.match(mail[0]!.subject, /^Vendelia-vahvistuskoodisi: \d{6}$/);
  const code = codeOf(mail[0]!);
  assert.notEqual(users[0]!.meta.vendelia_code, code, 'only the hash is stored');
  assert.match(mail[0]!.text, /3666248-7/);

  await assert.rejects(service.verify('maija@example.com', code === '000000' ? '111111' : '000000'), { code: 'codeInvalid' });
  assert.equal(users[0]!.meta.vendelia_code_attempts, 1);
  assert.deepEqual(await service.verify('maija@example.com', code), { id: users[0]!.id, email: 'maija@example.com' });
  assert.equal(users[0]!.confirmed, true);
  assert.equal(users[0]!.meta.vendelia_code, undefined);
  await assert.rejects(service.verify('maija@example.com', code), { code: 'codeInvalid' });
});

it('existing accounts are refused; an unfinished sign-up can start again with a new password and code', async () => {
  const { users, service, mail, codeOf } = setup();
  await service.register('maija@example.com', 'first-pass', 'en');
  const first = codeOf(mail[0]!);
  await service.register('maija@example.com', 'second-pass', 'en');
  assert.equal(users.length, 1);
  assert.equal(users[0]!.password, 'second-pass');
  const second = codeOf(mail[1]!);
  if (first !== second) await assert.rejects(service.verify('maija@example.com', first), { code: 'codeInvalid' });
  await service.verify('maija@example.com', second);
  await assert.rejects(service.register('maija@example.com', 'x-password', 'en'), { code: 'email_taken' });

  // A business or Google account (not a self sign-up) is never overwritten, confirmed or not.
  users.push({ id: '00000000-0000-4000-8000-0000000000aa', email: 'shop@example.com', password: 'p', confirmed: false, meta: {} });
  await assert.rejects(service.register('shop@example.com', 'x-password', 'en'), { code: 'email_taken' });
});

it('codes expire after too many wrong tries or 15 minutes; resend issues a fresh one', async () => {
  const { users, service, mail, codeOf } = setup();
  await service.register('maija@example.com', 'secret-pass', 'sv');
  const code = codeOf(mail[0]!);
  const wrong = code === '000000' ? '111111' : '000000';
  for (let i = 1; i < CODE_ATTEMPTS; i++) await assert.rejects(service.verify('maija@example.com', wrong), { code: 'codeInvalid' });
  await assert.rejects(service.verify('maija@example.com', wrong), { code: 'codeExpired' });
  await assert.rejects(service.verify('maija@example.com', code), { code: 'codeExpired' });

  await service.resend('maija@example.com', 'sv');
  assert.match(mail[1]!.subject, /^Din Vendelia-kod: \d{6}$/);
  users[0]!.meta.vendelia_code_expires = new Date(Date.now() - 1000).toISOString();
  await assert.rejects(service.verify('maija@example.com', codeOf(mail[1]!)), { code: 'codeExpired' });
  await service.resend('maija@example.com', 'sv');
  await service.verify('maija@example.com', codeOf(mail[2]!));

  await service.resend('maija@example.com', 'sv');
  await service.resend('nobody@example.com', 'sv');
  assert.equal(mail.length, 3, 'no code for confirmed or unknown emails');
});

it('routes: register sends a code, verify signs the new customer in with a remembered session', async () => {
  const { service, mail, codeOf } = setup();
  const sessions: string[] = [];
  let profile: SessionUserDTO | null = null;
  const repository: AccountRepository = {
    ensureCustomerProfile: async (id) => { profile ??= { id, email: 'maija@example.com', name: 'maija', role: 'customer', merchant: null }; },
    profile: async () => profile, session: async () => null, deleteSession: async () => {},
    createSession: async (hash) => { sessions.push(hash); },
  };
  const app = Fastify();
  app.register(authRoutes, { service: new AuthService(repository, { verify: async () => { throw new Error('unused'); } }), config, oauth, signup: service });
  const post = (url: string, payload: object) => app.inject({ method: 'POST', url, payload, headers: { 'x-locale': 'en' } });

  assert.equal((await post('/api/auth/register', { email: 'Maija@Example.com', password: 'short' })).statusCode, 400);
  assert.equal((await post('/api/auth/register', { email: 'Maija@Example.com', password: 'secret-pass' })).statusCode, 202);
  assert.match(mail[0]!.subject, /^Your Vendelia code: \d{6}$/);
  assert.equal((await post('/api/auth/register/verify', { email: 'maija@example.com', code: '12ab56' })).statusCode, 400);
  const ok = await post('/api/auth/register/verify', { email: 'maija@example.com', code: codeOf(mail[0]!) });
  assert.equal(ok.statusCode, 200);
  assert.equal(ok.json().user.role, 'customer');
  assert.match(String(ok.headers['set-cookie']), /vd_session=[a-f0-9]{64}; Path=\/; HttpOnly; SameSite=Strict; Max-Age=2592000/);
  assert.equal(sessions.length, 1);
});
