import { uuidSchema } from '@vendelia/shared';
import { HttpProblem } from '../../errors';

export interface ProvisionedUser { id: string; email: string; provisioningId: string | null }
export interface UserProvisioner {
  assertConfigured(): void;
  find(id: string): Promise<ProvisionedUser | null>;
  create(input: { id: string; email: string; password: string; provisioningId: string }): Promise<ProvisionedUser>;
}

/** Password changes, email confirmation and app_metadata (where reset and sign-up code hashes are kept) through the Auth admin API. */
export interface PasswordAdmin {
  updateUser(id: string, changes: { password?: string; emailConfirm?: boolean; appMetadata?: Record<string, unknown> }): Promise<void>;
}
/** Customer sign-up: an unconfirmed Auth user that cannot sign in until the emailed code is entered. */
export interface SignupAdmin extends PasswordAdmin {
  createUnconfirmed(input: { email: string; password: string; appMetadata: Record<string, unknown> }): Promise<{ id: string }>;
}

/** Server-only Auth admin API. Never exposes the secret key, raw provider errors or passwords. */
export class SupabaseUserProvisioner implements UserProvisioner, SignupAdmin {
  constructor(private readonly url: string, private readonly secretKey: string) {}
  assertConfigured() {
    if (!this.url || !this.secretKey) throw new HttpProblem(503, 'provisioningNotConfigured');
  }
  private async request(path: string, body?: unknown, method = body ? 'POST' : 'GET'): Promise<Response> {
    this.assertConfigured();
    try {
      return await fetch(`${this.url}/auth/v1/admin/users${path}`, {
        method, redirect: 'error', cache: 'no-store',
        headers: {
          apikey: this.secretKey,
          // Legacy service-role keys are JWTs. Opaque sb_secret keys are handled by the API gateway.
          ...(this.secretKey.startsWith('eyJ') ? { authorization: `Bearer ${this.secretKey}` } : {}),
          ...(body ? { 'content-type': 'application/json' } : {}),
        },
        body: body ? JSON.stringify(body) : undefined, signal: AbortSignal.timeout(8000),
      });
    } catch { throw new HttpProblem(503, 'provisioningPending'); }
  }
  private async user(response: Response): Promise<ProvisionedUser> {
    const data = await response.json().catch(() => null) as {
      id?: string; email?: string; app_metadata?: { vendelia_provisioning_id?: string };
    } | null;
    if (!data?.email || !uuidSchema.safeParse(data.id).success) throw new HttpProblem(503, 'provisioningPending');
    return { id: data.id!, email: data.email.toLowerCase(), provisioningId: data.app_metadata?.vendelia_provisioning_id ?? null };
  }
  async find(id: string): Promise<ProvisionedUser | null> {
    const response = await this.request(`/${encodeURIComponent(id)}`);
    if (response.status === 404) return null;
    if (!response.ok) throw new HttpProblem(503, 'provisioningUnavailable');
    return this.user(response);
  }
  async create(input: { id: string; email: string; password: string; provisioningId: string }): Promise<ProvisionedUser> {
    const response = await this.request('', {
      id: input.id, email: input.email, password: input.password, email_confirm: true,
      app_metadata: { vendelia_provisioning_id: input.provisioningId },
    });
    if (!response.ok) {
      const data = await response.json().catch(() => null) as { code?: string; error_code?: string } | null;
      const code = data?.error_code ?? data?.code;
      if (['email_exists', 'user_already_exists'].includes(code ?? '')) throw new HttpProblem(409, 'email_taken');
      if ([400, 422].includes(response.status)) throw new HttpProblem(400, 'merchantCredentialsRejected');
      throw new HttpProblem(503, 'provisioningPending');
    }
    return this.user(response);
  }
  async createUnconfirmed(input: { email: string; password: string; appMetadata: Record<string, unknown> }) {
    // email_confirm false: Supabase sends no email itself, and the account cannot sign in until confirmed.
    const response = await this.request('', {
      email: input.email, password: input.password, email_confirm: false, app_metadata: input.appMetadata,
    }).catch(() => { throw new HttpProblem(503, 'authUnavailable'); });
    if (!response.ok) {
      const data = await response.json().catch(() => null) as { code?: string; error_code?: string } | null;
      const code = data?.error_code ?? data?.code ?? '';
      if (['email_exists', 'user_already_exists'].includes(code)) throw new HttpProblem(409, 'email_taken');
      if (code === 'weak_password') throw new HttpProblem(400, 'weakPassword');
      if (['email_address_invalid', 'validation_failed'].includes(code)) throw new HttpProblem(400, 'invalidEmail');
      throw new HttpProblem(503, 'authUnavailable');
    }
    return { id: (await this.user(response).catch(() => { throw new HttpProblem(503, 'authUnavailable'); })).id };
  }
  async updateUser(id: string, changes: { password?: string; emailConfirm?: boolean; appMetadata?: Record<string, unknown> }) {
    const response = await this.request(`/${encodeURIComponent(id)}`, {
      ...(changes.password ? { password: changes.password } : {}),
      ...(changes.emailConfirm ? { email_confirm: true } : {}),
      ...(changes.appMetadata ? { app_metadata: changes.appMetadata } : {}),
    }, 'PUT').catch(() => { throw new HttpProblem(503, 'authUnavailable'); });
    if (response.ok) return;
    const data = await response.json().catch(() => null) as { code?: string; error_code?: string } | null;
    const code = data?.error_code ?? data?.code ?? '';
    if (code === 'weak_password') throw new HttpProblem(400, 'weakPassword');
    if (code === 'same_password') throw new HttpProblem(400, 'samePassword');
    throw new HttpProblem(503, 'authUnavailable');
  }
}
