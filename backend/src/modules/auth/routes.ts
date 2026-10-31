import type { FastifyInstance } from 'fastify';
import { loginSchema } from '@vendelia/shared';
import { HttpProblem } from '../../errors';
import { sessionCookie, sessionToken, type AuthConfig } from './config';
import type { AuthService } from './service';
export async function authRoutes(app: FastifyInstance, { service, config }: { service: AuthService; config: AuthConfig }) {
  // Bounded per-instance limiter supplements Supabase Auth's provider-side limits.
  const attempts = new Map<string, { count: number; until: number }>();
  for (const [path, adminOnly] of [['/api/auth/login', false], ['/api/auth/admin/login', true]] as const) {
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
      const result = await service.login(parsed.data.email, parsed.data.password, adminOnly);
      await service.logout(sessionToken(request.headers.cookie));
      return reply.header('set-cookie', sessionCookie(result.token, config.secure)).send({ user: result.user });
    });
  }
  app.get('/api/auth/config', async () => ({ configured: !!config.url && !!config.key }));
  app.get('/api/auth/me', async request => ({ user: await service.current(sessionToken(request.headers.cookie)) }));
  app.post('/api/auth/logout', async (request, reply) => {
    if (request.headers.origin && !config.origins.includes(request.headers.origin)) throw new HttpProblem(403, 'forbidden');
    await service.logout(sessionToken(request.headers.cookie));
    return reply.header('set-cookie', sessionCookie('', config.secure, 0)).send({ ok: true });
  });
}
