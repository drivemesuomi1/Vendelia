import type { FastifyInstance, FastifyRequest } from 'fastify';
import { dealImageUploadSchema, dealInputSchema, dealReviewSchema, uuidSchema, type DealStatus } from '@vendelia/shared';
import { HttpProblem } from '../../errors';
import { sessionToken } from '../auth/config';
import type { AuthService } from '../auth/service';
import type { DealRepository } from './repository';
import type { DealImageStorage } from './storage';

const STATUSES: DealStatus[] = ['draft', 'pending', 'live', 'rejected'];

/** First bytes of each allowed format, so the declared type has to match the actual file. */
function sniff(data: Buffer, contentType: string) {
  if (contentType === 'image/jpeg') return data[0] === 0xff && data[1] === 0xd8 && data[2] === 0xff;
  if (contentType === 'image/png') return data.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
  return data.subarray(0, 4).toString('ascii') === 'RIFF' && data.subarray(8, 12).toString('ascii') === 'WEBP';
}

function validationProblem(issues: { path: (string | number)[]; message: string }[]) {
  const fields: Record<string, string> = {};
  for (const issue of issues) fields[issue.path.join('.')] ??= issue.message;
  return { error: 'validation_failed', message: 'Invalid deal details', fields };
}

/**
 * Business portal deal workflow (create, edit, own list, photo upload), admin review, and public deal photos.
 * The merchant comes only from the verified session. /api/admin/* is already guarded by the app-wide admin hook.
 */
export async function dealRoutes(app: FastifyInstance, { repository, auth, origins, images }: { repository: DealRepository; auth: AuthService; origins: string[]; images: DealImageStorage }) {
  const merchantOf = async (request: FastifyRequest) => {
    if (!['GET', 'HEAD'].includes(request.method) && request.headers.origin && !origins.includes(request.headers.origin)) {
      throw new HttpProblem(403, 'forbidden');
    }
    const user = await auth.current(sessionToken(request.headers.cookie));
    if (!user) throw new HttpProblem(401, 'invalidLogin');
    if (user.role !== 'merchant' || !user.merchant) throw new HttpProblem(403, 'forbidden');
    return user.merchant.id;
  };
  const dealId = (id: string) => {
    if (!uuidSchema.safeParse(id).success) throw new HttpProblem(400, 'invalidId');
    return id;
  };

  app.get('/api/merchant/deal-cards', async request => ({ deals: await repository.ownCards(await merchantOf(request)) }));

  app.get<{ Params: { id: string } }>('/api/merchant/deals/:id', async request => {
    const deal = await repository.own(await merchantOf(request), dealId(request.params.id));
    if (!deal) throw new HttpProblem(404, 'deal_not_found');
    return { deal };
  });

  app.post('/api/merchant/deals', async (request, reply) => {
    const merchantId = await merchantOf(request);
    const parsed = dealInputSchema.safeParse(request.body);
    if (!parsed.success) return reply.code(400).send(validationProblem(parsed.error.issues));
    return reply.code(201).send(await repository.create(merchantId, parsed.data));
  });

  app.put<{ Params: { id: string } }>('/api/merchant/deals/:id', async (request, reply) => {
    const merchantId = await merchantOf(request);
    const id = dealId(request.params.id);
    const parsed = dealInputSchema.safeParse(request.body);
    if (!parsed.success) return reply.code(400).send(validationProblem(parsed.error.issues));
    return repository.update(merchantId, id, parsed.data);
  });

  app.post('/api/merchant/uploads', { bodyLimit: 1_450_000 }, async (request, reply) => {
    const merchantId = await merchantOf(request);
    const parsed = dealImageUploadSchema.safeParse(request.body);
    if (!parsed.success) throw new HttpProblem(400, 'unsupported_file_type');
    const data = Buffer.from(parsed.data.data, 'base64');
    if (!data.length || data.length > 1_048_576 || !sniff(data, parsed.data.contentType)) throw new HttpProblem(400, 'unsupported_file_type');
    const url = await images.upload(merchantId, parsed.data.contentType, data);
    return reply.code(201).send({ url });
  });

  // Stable site paths preserve shared gallery validation; the CDN serves the actual bytes.
  app.get<{ Params: { merchantId: string; imageId: string } }>('/api/deal-images/storage/:merchantId/:imageId', async (request, reply) => {
    const url = images.publicUrl(dealId(request.params.merchantId), dealId(request.params.imageId));
    return reply.header('cache-control', 'public, max-age=300').redirect(url);
  });

  // Retired PostgreSQL image URLs fail cleanly without touching the retained legacy table.
  app.get<{ Params: { id: string } }>('/api/deal-images/:id', async (request, reply) => {
    dealId(request.params.id);
    return reply.code(410).send({ error: 'image_retired', message: 'This image URL has been retired' });
  });

  app.get<{ Querystring: { status?: string; merchantId?: string } }>('/api/admin/deals', async request => {
    const status = request.query.status && request.query.status !== 'all' ? request.query.status : null;
    if (status && !STATUSES.includes(status as DealStatus)) throw new HttpProblem(400, 'invalid_request');
    const merchantId = request.query.merchantId ? dealId(request.query.merchantId) : null;
    return { deals: await repository.adminList(status as DealStatus | null, merchantId) };
  });

  app.get<{ Params: { id: string } }>('/api/admin/deals/:id', async request => {
    const deal = await repository.adminGet(dealId(request.params.id));
    if (!deal) throw new HttpProblem(404, 'deal_not_found');
    return { deal };
  });

  app.post<{ Params: { id: string } }>('/api/admin/deals/:id/review', async request => {
    const id = dealId(request.params.id);
    const parsed = dealReviewSchema.safeParse(request.body);
    if (!parsed.success) throw new HttpProblem(400, 'invalid_request');
    const note = parsed.data.note?.trim() || null;
    if (parsed.data.decision === 'reject' && !note) throw new HttpProblem(400, 'reasonRequired');
    const admin = await auth.current(sessionToken(request.headers.cookie));
    return { deal: await repository.review(id, parsed.data.decision, note, admin!.id) };
  });
}
