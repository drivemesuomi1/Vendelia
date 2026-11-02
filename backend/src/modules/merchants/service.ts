import type { AdminMerchantCreateInput, Locale, MerchantStatus } from '@vendelia/shared';
import { HttpProblem } from '../../errors';
import type { Mailer } from '../vouchers/mailer';
import type { MerchantProvisioningService } from './provisioning';
import { MerchantRepository } from './repository';
import { buildMerchantWelcomeEmail } from './welcome-email';

/** Where sign-in emails link to and who they name as support. */
export interface MerchantMailConfig { siteUrl: string; supportEmail: string }

export class MerchantService {
  constructor(
    private readonly repository: MerchantRepository,
    private readonly provisioning: MerchantProvisioningService,
    private readonly mailer?: Mailer,
    private readonly mail?: MerchantMailConfig,
  ) {}
  list() { return this.repository.list(); }
  async get(id: string) {
    const [merchant] = await this.repository.list(id);
    if (!merchant) throw new HttpProblem(404, 'not_found');
    return merchant;
  }
  async create(input: AdminMerchantCreateInput, adminId: string, locale: Locale = 'fi') {
    let id: string | null;
    let login: { email: string; passwordSet: boolean; emailed?: boolean } | undefined;
    try {
      if (input.login) {
        const result = await this.provisioning.create(input, adminId);
        id = result.merchantId; login = result.login;
      } else id = await this.repository.create(input);
    }
    catch (error) {
      if ((error as { code?: string }).code === '23505') throw new HttpProblem(409, 'business_exists');
      throw error;
    }
    if (!id) throw new HttpProblem(400, 'invalidMerchantReference');
    const merchant = await this.get(id);
    // Only a password set in this request is emailed; a replayed/recovered account keeps its original one.
    if (login?.passwordSet && input.login) login.emailed = await this.sendSignIn(merchant.name, input.login, locale);
    return { merchant, ...(login ? { login } : {}) };
  }
  async setStatus(id: string, status: MerchantStatus) {
    if (!await this.repository.setStatus(id, status)) throw new HttpProblem(404, 'not_found');
    return this.get(id);
  }

  /** Emails the sign-in details to the new login. Failure never undoes the account; the admin sees it instead. */
  private async sendSignIn(businessName: string, login: { email: string; password: string }, locale: Locale) {
    if (!this.mailer || !this.mail) return false;
    try {
      const message = buildMerchantWelcomeEmail({
        locale, businessName, email: login.email, password: login.password,
        loginUrl: `${this.mail.siteUrl}/${locale}/business`, supportEmail: this.mail.supportEmail,
      });
      await this.mailer.send({ to: login.email, ...message, attachments: [] });
      return true;
    } catch (error) {
      // The error text is logged without the message body, so the password never reaches the logs.
      console.error('Business sign-in email failed:', (error as Error).name, (error as { code?: string }).code ?? '');
      return false;
    }
  }
}
