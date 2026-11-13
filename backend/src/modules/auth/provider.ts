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

export interface OAuthIdentity extends AuthIdentity { name: string | null }
export interface OAuthProvider {
  authorizeUrl(redirectTo: string, challenge: string): string;
  exchange(code: string, verifier: string): Promise<OAuthIdentity>;
}
/** Google sign-in through Supabase Auth with PKCE: the code is only useful together with the verifier kept in the browser's cookie. */
export class SupabaseGoogleProvider implements OAuthProvider {
  constructor(private readonly config: AuthConfig) {}
  authorizeUrl(redirectTo: string, challenge: string) {
    if (!this.config.url || !this.config.key) throw new HttpProblem(503, 'authUnavailable');
    const query = new URLSearchParams({ provider: 'google', redirect_to: redirectTo, code_challenge: challenge, code_challenge_method: 's256' });
    return `${this.config.url}/auth/v1/authorize?${query}`;
  }
  async exchange(code: string, verifier: string): Promise<OAuthIdentity> {
    if (!this.config.url || !this.config.key) throw new HttpProblem(503, 'authUnavailable');
    let response: Response;
    try {
      response = await fetch(`${this.config.url}/auth/v1/token?grant_type=pkce`, {
        method: 'POST', headers: { apikey: this.config.key, 'content-type': 'application/json' },
        body: JSON.stringify({ auth_code: code, code_verifier: verifier }), cache: 'no-store', redirect: 'error',
        signal: AbortSignal.timeout(10000),
      });
    } catch { throw new HttpProblem(503, 'authUnavailable'); }
    if (!response.ok) throw new HttpProblem(response.status === 429 ? 429 : 401, response.status === 429 ? 'tooManyAttempts' : 'invalidLogin');
    const data = await response.json().catch(() => null) as { access_token?: string; user?: { id?: string; email?: string; user_metadata?: { full_name?: string; name?: string } } } | null;
    if (!data?.access_token || !uuidSchema.safeParse(data.user?.id).success || !data.user?.email) throw new HttpProblem(503, 'authUnavailable');
    const meta = data.user.user_metadata;
    return { id: data.user.id!, email: data.user.email, name: meta?.full_name?.trim() || meta?.name?.trim() || null };
  }
}
