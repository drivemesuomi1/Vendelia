import { createHash, randomBytes } from 'node:crypto';
import type { SessionUserDTO } from '@vendelia/shared';
import { HttpProblem } from '../../errors';
import { SESSION_SECONDS } from './config';
import type { PasswordProvider } from './provider';
import type { AccountRepository } from './repository';
export const hashSession = (token: string) => createHash('sha256').update(token).digest('hex');
export class AuthService {
  constructor(private readonly repository: AccountRepository, private readonly provider: PasswordProvider) {}
  async login(email: string, password: string, adminOnly = false) {
    const identity = await this.provider.verify(email, password);
    const user = await this.repository.profile(identity.id);
    if (!user || (adminOnly && user.role !== 'admin')) throw new HttpProblem(401, 'invalidLogin');
    const token = randomBytes(32).toString('hex');
    await this.repository.createSession(hashSession(token), user.id, new Date(Date.now() + SESSION_SECONDS * 1000).toISOString());
    return { user, token };
  }
  async current(token: string | undefined): Promise<SessionUserDTO | null> {
    return token ? this.repository.session(hashSession(token)) : null;
  }
  async logout(token: string | undefined) { if (token) await this.repository.deleteSession(hashSession(token)); }
}
