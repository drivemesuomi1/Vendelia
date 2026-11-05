import { randomUUID } from 'node:crypto';
import { uuidSchema } from '@vendelia/shared';
import { HttpProblem } from '../../errors';

export interface DealImageStorage {
  upload(merchantId: string, contentType: string, data: Buffer): Promise<string>;
  publicUrl(merchantId: string, imageId: string): string;
}

/** Server-only Storage adapter. Objects are immutable; website sessions authorize uploads in routes.ts. */
export class SupabaseDealImageStorage implements DealImageStorage {
  private readonly url: string;
  private readonly bucket: string;
  private readonly secret: string;
  constructor(env: NodeJS.ProcessEnv = process.env, private readonly request: typeof fetch = fetch) {
    this.url = (env.SUPABASE_URL ?? '').trim().replace(/\/+$/, '');
    this.bucket = (env.SUPABASE_STORAGE_BUCKET ?? '').trim();
    this.secret = (env.SUPABASE_SECRET_KEY ?? '').trim();
  }
  private configured() {
    if (!this.url || !this.bucket || !this.secret) throw new HttpProblem(503, 'imageStorageNotConfigured');
    const url = new URL(this.url);
    if (url.protocol !== 'https:' && !['localhost', '127.0.0.1'].includes(url.hostname)) {
      throw new HttpProblem(503, 'imageStorageNotConfigured');
    }
  }
  private objectPath(merchantId: string, imageId: string) {
    if (!uuidSchema.safeParse(merchantId).success || !uuidSchema.safeParse(imageId).success) {
      throw new HttpProblem(400, 'invalidId');
    }
    return `${encodeURIComponent(this.bucket)}/${merchantId}/${imageId}`;
  }
  private headers() {
    return {
      apikey: this.secret,
      ...(this.secret.startsWith('eyJ') ? { authorization: `Bearer ${this.secret}` } : {}),
    };
  }
  publicUrl(merchantId: string, imageId: string) {
    this.configured();
    return `${this.url}/storage/v1/object/public/${this.objectPath(merchantId, imageId)}`;
  }
  async upload(merchantId: string, contentType: string, data: Buffer): Promise<string> {
    this.configured();
    const id = randomUUID();
    const objectPath = this.objectPath(merchantId, id);
    try {
      // A private bucket would produce broken public images: refuse before uploading.
      const bucket = await this.request(`${this.url}/storage/v1/bucket/${encodeURIComponent(this.bucket)}`, {
        headers: this.headers(), redirect: 'error', cache: 'no-store', signal: AbortSignal.timeout(15000),
      });
      if (!bucket.ok) throw new HttpProblem(503, 'imageStorageUnavailable');
      const settings = await bucket.json() as { public?: boolean };
      if (settings.public !== true) throw new HttpProblem(503, 'imageStorageBucketMustBePublic');
      const response = await this.request(`${this.url}/storage/v1/object/${objectPath}`, {
        method: 'POST', headers: { ...this.headers(), 'content-type': contentType,
          'cache-control': 'max-age=31536000', 'x-upsert': 'false' },
        body: new Uint8Array(data), redirect: 'error', signal: AbortSignal.timeout(15000),
      });
      if (!response.ok) throw new HttpProblem(503, 'imageStorageUnavailable');
      return `/api/deal-images/storage/${merchantId}/${id}`;
    } catch (error) {
      if (error instanceof HttpProblem) throw error;
      throw new HttpProblem(503, 'imageStorageUnavailable');
    }
  }
}
