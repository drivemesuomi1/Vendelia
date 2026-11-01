import type { FastifyInstance } from 'fastify';
import { adminMerchantSchema, merchantStatusSchema, uuidSchema } from '@vendelia/shared';
import { HttpProblem } from '../../errors';
import type { MerchantService } from './service';
/** The app's /api/admin/* hook verifies active admin sessions for every handler. */
export async function merchantRoutes(app: FastifyInstance, { service }: { service: MerchantService }) {
  app.get('/api/admin/merchants', async () => ({ merchants: await service.list() }));
  app.get<{ Params: { id: string } }>('/api/admin/merchants/:id', async request => {
    if (!uuidSchema.safeParse(request.params.id).success) throw new HttpProblem(400, 'invalidId');
    return { merchant: await service.get(request.params.id) };
  });
  app.post('/api/admin/merchants', async (request, reply) => {
    const parsed = adminMerchantSchema.safeParse(request.body);
    if (!parsed.success) {
      const fields: Record<string, string> = {};
      for (const issue of parsed.error.issues) fields[issue.path.join('.')] ??= issue.message;
      return reply.code(400).send({ error: 'validation_failed', message: 'Invalid business details', fields });
    }
    return reply.code(201).send({ merchant: await service.create(parsed.data) });
  });
  app.post<{ Params: { id: string } }>('/api/admin/merchants/:id/status', async request => {
    const parsed = merchantStatusSchema.safeParse((request.body as { status?: unknown } | null)?.status);
    if (!uuidSchema.safeParse(request.params.id).success || !parsed.success) throw new HttpProblem(400, 'invalid_request');
    return { merchant: await service.setStatus(request.params.id, parsed.data) };
  });
}
