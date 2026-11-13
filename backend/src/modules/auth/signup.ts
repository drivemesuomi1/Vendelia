import { createHash, randomInt, timingSafeEqual } from 'node:crypto';
import type { Sql } from 'postgres';
import type { Locale } from '@vendelia/shared';
import { HttpProblem } from '../../errors';
import type { Mailer } from '../vouchers/mailer';
import { buildSignupCodeEmail } from './signup-email';
import type { SignupAdmin } from './user-provisioner';

/** How long a sign-up code works, and how many wrong tries it allows before a new code is needed. */
export const CODE_MINUTES = 15;
export const CODE_ATTEMPTS = 5;
const hashCode = (email: string, code: string) => createHash('sha256').update(`${email}:${code}`).digest('hex');

interface Pending { id: string; confirmed: boolean; signup: string | null; hash: string | null; expires: string | null; attempts: number }

/**
 * Customer sign-up with an emailed 6-digit code, sent through our own mailer.
 *
 * The Auth user is created unconfirmed, so it cannot sign in (Supabase refuses the password grant and our
 * profile queries require a confirmed email) and its email is not trusted for matching orders. Only the code's
 * hash, expiry and wrong-try count are stored, in the user's app_metadata, which users cannot edit.
 * The right code confirms the email through the admin API.
 */
export class SignupService {
  constructor(private readonly sql: Sql, private readonly admin: SignupAdmin, private readonly mailer: Mailer) {}

  private async find(email: string): Promise<Pending | undefined> {
    const [row] = await this.sql<Pending[]>`
      SELECT id, email_confirmed_at IS NOT NULL AS confirmed,
        raw_app_meta_data->>'vendelia_signup' AS signup,
        raw_app_meta_data->>'vendelia_code' AS hash,
        raw_app_meta_data->>'vendelia_code_expires' AS expires,
        coalesce((raw_app_meta_data->>'vendelia_code_attempts')::int, 0) AS attempts
      FROM auth.users WHERE lower(email) = ${email} AND deleted_at IS NULL LIMIT 1`;
    return row;
  }

  private newCode(email: string) {
    const code = String(randomInt(0, 1_000_000)).padStart(6, '0');
    return {
      code,
      meta: {
        vendelia_signup: 'customer',
        vendelia_code: hashCode(email, code),
        vendelia_code_expires: new Date(Date.now() + CODE_MINUTES * 60_000).toISOString(),
        vendelia_code_attempts: 0,
      },
    };
  }

  private async send(email: string, code: string, locale: Locale) {
    try {
      await this.mailer.send({ to: email, ...buildSignupCodeEmail({ locale, code, minutes: CODE_MINUTES }), attachments: [] });
    } catch (error) {
      console.error('Sign-up code email failed:', (error as Error).name, (error as { code?: string }).code ?? '');
      throw new HttpProblem(503, 'mailUnavailable');
    }
  }

  /** Creates the locked account (or refreshes an unfinished sign-up) and emails the code. */
  async register(email: string, password: string, locale: Locale) {
    const existing = await this.find(email);
    // Confirmed accounts and accounts created another way (Google, businesses, admins) are never touched here.
    if (existing && (existing.confirmed || existing.signup !== 'customer')) throw new HttpProblem(409, 'email_taken');
    const { code, meta } = this.newCode(email);
    if (existing) {
      // Signing up again before finishing: the latest password and code win; earlier codes stop working.
      await this.admin.updateUser(existing.id, { password, appMetadata: meta });
    } else {
      await this.admin.createUnconfirmed({ email, password, appMetadata: meta });
    }
    await this.send(email, code, locale);
  }

  /** Sends a fresh code for an unfinished sign-up. Says nothing about other emails. */
  async resend(email: string, locale: Locale) {
    const pending = await this.find(email);
    if (!pending || pending.confirmed || pending.signup !== 'customer') return;
    const { code, meta } = this.newCode(email);
    await this.admin.updateUser(pending.id, { appMetadata: meta });
    await this.send(email, code, locale);
  }

  /** Checks the code; the right one confirms the email. Returns the user to sign in. */
  async verify(email: string, code: string): Promise<{ id: string; email: string }> {
    const pending = await this.find(email);
    if (!pending || pending.confirmed || pending.signup !== 'customer') throw new HttpProblem(400, 'codeInvalid');
    if (!pending.hash || !pending.expires || Date.parse(pending.expires) < Date.now() || pending.attempts >= CODE_ATTEMPTS) {
      throw new HttpProblem(400, 'codeExpired');
    }
    const given = Buffer.from(hashCode(email, code), 'hex');
    const stored = Buffer.from(pending.hash, 'hex');
    if (stored.length !== given.length || !timingSafeEqual(stored, given)) {
      await this.admin.updateUser(pending.id, { appMetadata: { vendelia_code_attempts: pending.attempts + 1 } });
      throw new HttpProblem(400, pending.attempts + 1 >= CODE_ATTEMPTS ? 'codeExpired' : 'codeInvalid');
    }
    await this.admin.updateUser(pending.id, {
      emailConfirm: true,
      appMetadata: { vendelia_code: null, vendelia_code_expires: null, vendelia_code_attempts: null },
    });
    return { id: pending.id, email };
  }
}
