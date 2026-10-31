import { uuidSchema } from '@vendelia/shared';
import { HttpProblem } from '../../errors';
import type { AuthConfig } from './config';
export interface AuthIdentity { id: string; email: string }
export interface PasswordProvider { verify(email: string, password: string): Promise<AuthIdentity> }
/** Credentials are sent only to the configured Supabase Auth endpoint, never to SQL. */
export class SupabasePasswordProvider implements PasswordProvider {
  constructor(private readonly config: AuthConfig) {}
  async verify(email: string, password: string): Promise<AuthIdentity> {
    if (!this.config.url || !this.config.key) throw new HttpProblem(503, 'authUnavailable');
    let response: Response;
    try {
      response = await fetch(`${this.config.url}/auth/v1/token?grant_type=password`, {
        method: 'POST', headers: { apikey: this.config.key, 'content-type': 'application/json' },
        body: JSON.stringify({ email, password }), cache: 'no-store', redirect: 'error',
        signal: AbortSignal.timeout(10000),
      });
    } catch { throw new HttpProblem(503, 'authUnavailable'); }
    if (response.status === 429) throw new HttpProblem(429, 'tooManyAttempts');
    if ([400, 422].includes(response.status)) throw new HttpProblem(401, 'invalidLogin');
    if (!response.ok) throw new HttpProblem(503, 'authUnavailable');
    const data = await response.json().catch(() => null) as { user?: { id?: string; email?: string }; access_token?: string } | null;
    if (!data?.access_token || !uuidSchema.safeParse(data.user?.id).success || !data.user?.email) {
      throw new HttpProblem(503, 'authUnavailable');
    }
    // Supabase tokens are not returned to the browser or persisted; website sessions are separate.
    return { id: data.user.id!, email: data.user.email };
  }
}
