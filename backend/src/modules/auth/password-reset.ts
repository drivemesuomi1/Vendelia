import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';
import type { Sql } from 'postgres';
import type { Locale, SessionUserDTO } from '@vendelia/shared';
import { HttpProblem } from '../../errors';
import type { Mailer } from '../vouchers/mailer';
import { buildResetEmail } from './reset-email';
import type { PasswordAdmin } from './user-provisioner';

/** How long a reset link works. Asking again sends a new link and the old one stops working. */
export const RESET_MINUTES = 60;
const sha256 = (value: string) => createHash('sha256').update(value).digest('hex');

/**
 * "Forgot password" by email, sent through our own mailer (not Supabase's limited built-in email).
 *
 * A random token goes in the link; only its SHA-256 hash and expiry are stored, in the user's app_metadata,
 * which users cannot edit. Setting the new password goes through the Auth admin API, then the token is
 * cleared and every website session of that user is ended.
 */
export class PasswordResetService {
  constructor(
    private readonly sql: Sql,
    private readonly admin: PasswordAdmin,
    private readonly mailer: Mailer,
    private readonly siteUrl: string,
  ) {}

  /** Sends a reset link if the email belongs to an active account. Says nothing either way. */
  async request(email: string, locale: Locale) {
    const [user] = await this.sql<{ id: string }[]>`
      SELECT u.id FROM auth.users u JOIN public.profiles p ON p.user_id = u.id
      WHERE lower(u.email) = ${email} AND p.is_active AND u.email_confirmed_at IS NOT NULL AND u.deleted_at IS NULL
        AND (u.banned_until IS NULL OR u.banned_until <= now())
      LIMIT 1`;
    if (!user) return;
    const token = randomBytes(32).toString('hex');
    const link = new URL(`/${locale}/reset-password`, this.siteUrl);
    link.searchParams.set('u', user.id);
    link.searchParams.set('t', token);
    try {
      await this.admin.updateUser(user.id, { appMetadata: {
        vendelia_reset: sha256(token),
        vendelia_reset_expires: new Date(Date.now() + RESET_MINUTES * 60_000).toISOString(),
      } });
      await this.mailer.send({ to: email, ...buildResetEmail({ locale, link: link.toString(), minutes: RESET_MINUTES }), attachments: [] });
    } catch (error) {
      // Logged without the link. The visitor still gets the neutral answer, so failures don't reveal which emails exist.
      console.error('Password reset request failed:', (error as Error).name, (error as { code?: string }).code ?? '');
    }
  }

  /** Sets the new password when the link is valid; returns the role so the page can point to the right sign-in. */
  async reset(id: string, token: string, password: string): Promise<SessionUserDTO['role']> {
    const [user] = await this.sql<{ hash: string | null; expires: string | null; role: SessionUserDTO['role'] }[]>`
      SELECT u.raw_app_meta_data->>'vendelia_reset' AS hash, u.raw_app_meta_data->>'vendelia_reset_expires' AS expires, p.role
      FROM auth.users u JOIN public.profiles p ON p.user_id = u.id
      WHERE u.id = ${id} AND p.is_active AND u.deleted_at IS NULL`;
    if (!user?.hash || !user.expires || Date.parse(user.expires) < Date.now()) throw new HttpProblem(400, 'resetLinkInvalid');
    const given = Buffer.from(sha256(token), 'hex');
    const stored = Buffer.from(user.hash, 'hex');
    if (stored.length !== given.length || !timingSafeEqual(stored, given)) throw new HttpProblem(400, 'resetLinkInvalid');

    await this.admin.updateUser(id, { password, appMetadata: { vendelia_reset: null, vendelia_reset_expires: null } });
    // Anyone signed in with the old password is signed out everywhere.
    await this.sql`DELETE FROM public.auth_sessions WHERE user_id = ${id}`;
    return user.role;
  }
}
