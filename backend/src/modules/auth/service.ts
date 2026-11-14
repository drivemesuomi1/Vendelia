import { createHash, randomBytes } from 'node:crypto';
import type { SessionUserDTO } from '@vendelia/shared';
import { HttpProblem } from '../../errors';
import { sessionLength } from './config';
import type { OAuthIdentity, PasswordProvider } from './provider';
import type { AccountRepository } from './repository';
export const hashSession = (token: string) => createHash('sha256').update(token).digest('hex');
export class AuthService {
  constructor(private readonly repository: AccountRepository, private readonly provider: PasswordProvider) {}
  async login(email: string, password: string, audience: 'customer' | 'admin' | 'merchant' = 'customer', remember?: boolean) {
    const identity = await this.provider.verify(email, password);
    const user = await this.repository.profile(identity.id);
    if (!user || user.role !== audience || (user.role === 'merchant' && !user.merchant)) throw new HttpProblem(401, 'invalidLogin');
    return this.startSession(user, remember);
  }
  /** Google accounts are for customers only; staff and business logins keep their password flow. */
  async loginWithIdentity(identity: OAuthIdentity, remember = true) {
    await this.repository.ensureCustomerProfile(identity.id, identity.name ?? identity.email.split('@')[0]!);
    const user = await this.repository.profile(identity.id);
    if (!user || user.role !== 'customer') throw new HttpProblem(401, 'invalidLogin');
    return this.startSession(user, remember);
  }
  private async startSession(user: SessionUserDTO, remember: boolean | undefined) {
    const length = sessionLength(remember);
    const token = randomBytes(32).toString('hex');
    await this.repository.createSession(hashSession(token), user.id, new Date(Date.now() + length.seconds * 1000).toISOString());
    return { user, token, cookieMaxAge: length.cookieMaxAge };
  }
  async current(token: string | undefined): Promise<SessionUserDTO | null> {
    return token ? this.repository.session(hashSession(token)) : null;
  }
  async logout(token: string | undefined) { if (token) await this.repository.deleteSession(hashSession(token)); }
}
