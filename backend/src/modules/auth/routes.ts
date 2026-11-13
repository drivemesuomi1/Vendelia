import { createHash, randomBytes } from 'node:crypto';
import type { FastifyInstance } from 'fastify';
import { forgotPasswordSchema, localeSchema, loginSchema, resetPasswordSchema } from '@vendelia/shared';
import { HttpProblem } from '../../errors';
import { OAUTH_COOKIE, sessionCookie, sessionToken, type AuthConfig } from './config';
import type { OAuthProvider } from './provider';
import type { PasswordResetService } from './password-reset';
import type { AuthService } from './service';
const b64 = (value: Buffer | string) => Buffer.from(value).toString('base64url');
/** Same-site relative paths only, so the post-login redirect cannot leave the site. */
const safePath = (next: unknown) => typeof next === 'string' && next.startsWith('/') && !next.startsWith('//') && !/[\\\x00-\x20]/.test(next) && next.length < 300 ? next : '/';

export async function authRoutes(app: FastifyInstance, { service, config, oauth, passwordReset }: {
  service: AuthService; config: AuthConfig; oauth: OAuthProvider; passwordReset?: PasswordResetService;
}) {
  // Bounded per-instance limiter supplements Supabase Auth's provider-side limits.
  const attempts = new Map<string, { count: number; until: number }>();
  for (const [path, audience] of [['/api/auth/login', 'any'], ['/api/auth/admin/login', 'admin'], ['/api/auth/merchant/login', 'merchant']] as const) {
    app.post(path, async (request, reply) => {
      const origin = request.headers.origin;
      if (origin && !config.origins.includes(origin)) throw new HttpProblem(403, 'forbidden');
      const parsed = loginSchema.safeParse(request.body);
      if (!parsed.success) throw new HttpProblem(400, 'invalidLogin');
      const key = parsed.data.email;
      const now = Date.now();
      for (const [key, value] of attempts) if (value.until <= now) attempts.delete(key);
      const entry = attempts.get(key) ?? { count: 0, until: now + 60000 };
      if (entry.count >= 5 || (attempts.size >= 1000 && !attempts.has(key))) throw new HttpProblem(429, 'tooManyAttempts');
      entry.count++; attempts.set(key, entry);
      // "Remember me" is offered on the customer sign-in only; staff and business sessions keep their fixed length.
      const result = await service.login(parsed.data.email, parsed.data.password, audience, audience === 'any' ? parsed.data.remember : undefined);
      await service.logout(sessionToken(request.headers.cookie));
      return reply.header('set-cookie', sessionCookie(result.token, config.secure, result.cookieMaxAge)).send({ user: result.user });
    });
  }
  // Google sign-in (PKCE). The verifier stays in a short-lived cookie; Lax so it returns with the redirect from Supabase.
  const oauthCookie = (value: string, maxAge: number) => `${OAUTH_COOKIE}=${value}; Path=/api/auth; HttpOnly; SameSite=Lax; Max-Age=${maxAge}${config.secure ? '; Secure' : ''}`;
  app.get<{ Querystring: { next?: string; remember?: string } }>('/api/auth/google', async (request, reply) => {
    const verifier = b64(randomBytes(32));
    const challenge = b64(createHash('sha256').update(verifier).digest());
    const url = oauth.authorizeUrl(`${config.siteUrl}/api/auth/google/callback`, challenge);
    return reply.header('set-cookie', oauthCookie(`${verifier}.${b64(safePath(request.query.next))}.${request.query.remember === '0' ? '0' : '1'}`, 600)).redirect(url);
  });
  app.get<{ Querystring: { code?: string } }>('/api/auth/google/callback', async (request, reply) => {
    const raw = request.headers.cookie?.split(';').map(v => v.trim()).find(v => v.startsWith(`${OAUTH_COOKIE}=`))?.slice(OAUTH_COOKIE.length + 1);
    const [verifier, encoded, remember] = raw?.split('.') ?? [];
    const fail = () => reply.header('set-cookie', oauthCookie('', 0)).redirect(`${config.siteUrl}/en/login?error=google`);
    if (!request.query.code || !verifier || !/^[\w-]{20,128}$/.test(verifier)) return fail();
    try {
      const identity = await oauth.exchange(request.query.code, verifier);
      const { token, cookieMaxAge } = await service.loginWithIdentity(identity, remember !== '0');
      await service.logout(sessionToken(request.headers.cookie));
      const next = safePath(encoded ? Buffer.from(encoded, 'base64url').toString() : '/');
      // Strict cookies are not sent on requests that continue a cross-site redirect chain (Google -> Supabase -> here),
      // so a 302 would land signed out. Moving on from our own page makes the next request same-site.
      const target = `${config.siteUrl}${next}`.replace(/[&<>"']/g, c => `&#${c.charCodeAt(0)};`);
      return reply.header('set-cookie', [sessionCookie(token, config.secure, cookieMaxAge), oauthCookie('', 0)]).header('cache-control', 'no-store').type('text/html; charset=utf-8')
        .send(`<!doctype html><meta charset="utf-8"><meta name="robots" content="noindex"><meta http-equiv="refresh" content="0;url=${target}"><title>Vendelia</title><a href="${target}">Continue</a>`);
    } catch { return fail(); }
  });
  // Forgot password. The answer is the same whether or not the email has an account.
  const resets = new Map<string, { count: number; until: number }>();
  const limit = (key: string, max: number) => {
    const now = Date.now();
    for (const [k, v] of resets) if (v.until <= now) resets.delete(k);
    const entry = resets.get(key) ?? { count: 0, until: now + 15 * 60_000 };
    if (entry.count >= max || (resets.size >= 2000 && !resets.has(key))) throw new HttpProblem(429, 'tooManyAttempts');
    entry.count++; resets.set(key, entry);
  };
  app.post('/api/auth/forgot', async (request, reply) => {
    if (!passwordReset) throw new HttpProblem(503, 'authUnavailable');
    if (request.headers.origin && !config.origins.includes(request.headers.origin)) throw new HttpProblem(403, 'forbidden');
    const parsed = forgotPasswordSchema.safeParse(request.body);
    if (!parsed.success) throw new HttpProblem(400, 'invalidEmail');
    // A few links per email, and a cap on reset mail per instance, every 15 minutes.
    limit(`email:${parsed.data.email}`, 3);
    limit('all', 100);
    await passwordReset.request(parsed.data.email, localeSchema.catch('fi').parse(request.headers['x-locale']));
    return reply.code(202).send({ ok: true });
  });
  app.post('/api/auth/reset', async (request) => {
    if (!passwordReset) throw new HttpProblem(503, 'authUnavailable');
    if (request.headers.origin && !config.origins.includes(request.headers.origin)) throw new HttpProblem(403, 'forbidden');
    const parsed = resetPasswordSchema.safeParse(request.body);
    if (!parsed.success) {
      const password = parsed.error.issues.find((issue) => issue.path[0] === 'password');
      throw new HttpProblem(400, password ? password.message : 'resetLinkInvalid');
    }
    limit(`reset:${parsed.data.id}`, 10);
    return { ok: true, role: await passwordReset.reset(parsed.data.id, parsed.data.token, parsed.data.password) };
  });
  app.get('/api/auth/config', async () => ({ configured: !!config.url && !!config.key }));
  app.get('/api/auth/me', async request => ({ user: await service.current(sessionToken(request.headers.cookie)) }));
  app.post('/api/auth/logout', async (request, reply) => {
    if (request.headers.origin && !config.origins.includes(request.headers.origin)) throw new HttpProblem(403, 'forbidden');
    await service.logout(sessionToken(request.headers.cookie));
    return reply.header('set-cookie', sessionCookie('', config.secure, 0)).send({ ok: true });
  });
}
