import type { Sql } from 'postgres';
import type { SessionUserDTO } from '@vendelia/shared';
export interface AccountRepository {
  profile(id: string): Promise<SessionUserDTO | null>;
  createSession(hash: string, id: string, expires: string): Promise<void>;
  ensureCustomerProfile(id: string, displayName: string): Promise<void>;
  session(hash: string): Promise<SessionUserDTO | null>;
  deleteSession(hash: string): Promise<void>;
}
export class AuthRepository implements AccountRepository {
  constructor(private readonly sql: Sql) {}
  async profile(id: string): Promise<SessionUserDTO | null> {
    const [row] = await this.sql`
      SELECT p.user_id AS id, u.email, p.display_name AS name, p.role
      FROM public.profiles p JOIN auth.users u ON u.id = p.user_id
      WHERE p.user_id = ${id} AND p.is_active AND u.email_confirmed_at IS NOT NULL AND u.deleted_at IS NULL
        AND (u.banned_until IS NULL OR u.banned_until <= now())`;
    return row ? this.withMerchant({ ...row, merchant: null } as SessionUserDTO) : null;
  }
  /** First Google sign-in creates an ordinary customer profile; an existing profile (any role) is never changed. */
  async ensureCustomerProfile(id: string, displayName: string) {
    await this.sql`INSERT INTO public.profiles (user_id, display_name, role) VALUES (${id}, ${displayName.trim().slice(0, 120) || 'Customer'}, 'customer') ON CONFLICT (user_id) DO NOTHING`;
  }
  async createSession(hash: string, id: string, expires: string) {
    await this.sql`INSERT INTO public.auth_sessions (token_hash, user_id, expires_at) VALUES (${hash}, ${id}, ${expires})`;
  }
  async session(hash: string): Promise<SessionUserDTO | null> {
    const [row] = await this.sql`
      SELECT p.user_id AS id, u.email, p.display_name AS name, p.role
      FROM public.auth_sessions s JOIN public.profiles p ON p.user_id = s.user_id
      JOIN auth.users u ON u.id = p.user_id
      WHERE s.token_hash = ${hash} AND s.expires_at > now() AND p.is_active
        AND u.email_confirmed_at IS NOT NULL AND u.deleted_at IS NULL AND (u.banned_until IS NULL OR u.banned_until <= now())`;
    return row ? this.withMerchant({ ...row, merchant: null } as SessionUserDTO) : null;
  }
  private async withMerchant(user: SessionUserDTO): Promise<SessionUserDTO | null> {
    // Admin/customer login does not depend on this new table. Only merchant profiles need a link.
    if (user.role !== 'merchant') return user;
    const [merchant] = await this.sql`
      SELECT m.id, m.display_name AS name, m.company_name AS "companyName", m.business_id AS "businessId", m.status
      FROM public.merchant_members mm JOIN public.merchants m ON m.id = mm.merchant_id
      WHERE mm.user_id = ${user.id} AND mm.is_active AND m.status IN ('active', 'pending')`;
    return merchant ? { ...user, merchant: merchant as SessionUserDTO['merchant'] } : null;
  }
  async deleteSession(hash: string) { await this.sql`DELETE FROM public.auth_sessions WHERE token_hash = ${hash}`; }
}
