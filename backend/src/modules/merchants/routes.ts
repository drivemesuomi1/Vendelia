import type { FastifyInstance } from 'fastify';
import { adminMerchantCreateSchema, localeSchema, merchantStatusSchema, uuidSchema } from '@vendelia/shared';
import { HttpProblem } from '../../errors';
import type { MerchantService } from './service';
import { sessionToken } from '../auth/config';
/** The app's /api/admin/* hook verifies active admin sessions for every handler. */
export async function merchantRoutes(app: FastifyInstance, { service, auth }: { service: MerchantService; auth: import('../auth/service').AuthService }) {
  app.get('/api/admin/merchants', async () => ({ merchants: await service.list() }));
  app.get<{ Params: { id: string } }>('/api/admin/merchants/:id', async request => {
    if (!uuidSchema.safeParse(request.params.id).success) throw new HttpProblem(400, 'invalidId');
    return { merchant: await service.get(request.params.id) };
  });
  app.post('/api/admin/merchants', async (request, reply) => {
    const parsed = adminMerchantCreateSchema.safeParse(request.body);
    if (!parsed.success) {
      const fields: Record<string, string> = {};
      for (const issue of parsed.error.issues) fields[issue.path.join('.')] ??= issue.message;
      return reply.code(400).send({ error: 'validation_failed', message: 'Invalid business details', fields });
    }
    const admin = await auth.current(sessionToken(request.headers.cookie));
    if (admin?.role !== 'admin') throw new HttpProblem(403, 'forbidden');
    const locale = localeSchema.catch('fi').parse(request.headers['x-locale']);
    return reply.code(201).send(await service.create(parsed.data, admin.id, locale));
  });
  app.post<{ Params: { id: string } }>('/api/admin/merchants/:id/status', async request => {
    const parsed = merchantStatusSchema.safeParse((request.body as { status?: unknown } | null)?.status);
    if (!uuidSchema.safeParse(request.params.id).success || !parsed.success) throw new HttpProblem(400, 'invalid_request');
    return { merchant: await service.setStatus(request.params.id, parsed.data) };
  });
}

/** Merchant IDs always come from the verified session, never from URL/body/query input. */
export async function merchantPortalRoutes(app: FastifyInstance, { repository, auth }: {
  repository: import('./repository').MerchantRepository;
  auth: import('../auth/service').AuthService;
}) {
  app.get('/api/merchant/deals', async request => {
    const user = await auth.current(sessionToken(request.headers.cookie));
    if (!user) throw new HttpProblem(401, 'invalidLogin');
    if (user.role !== 'merchant' || !user.merchant) throw new HttpProblem(403, 'forbidden');
    return { merchant: user.merchant, deals: await repository.ownDeals(user.merchant.id) };
  });
}
