import { createHash } from 'node:crypto';
import type { AdminMerchantCreateInput } from '@vendelia/shared';
import { HttpProblem } from '../../errors';
import type { UserProvisioner } from '../auth/user-provisioner';
import type { MerchantRepository } from './repository';

/** Forward recovery: Auth is outside the SQL transaction, so retries use a durable reserved identity. */
export class MerchantProvisioningService {
  constructor(private readonly repository: MerchantRepository, private readonly users: UserProvisioner) {}
  async create(input: AdminMerchantCreateInput, adminId: string) {
    this.users.assertConfigured();
    const { login, ...business } = input;
    if (!login) throw new HttpProblem(400, 'invalid_request');
    // This fingerprints only non-secret details. Passwords and their hashes never enter SQL.
    const fingerprint = createHash('sha256').update(JSON.stringify({ business, email: login.email })).digest('hex');
    const operation = await this.repository.prepareProvisioning(business, login.email, fingerprint, adminId);
    try {
      let passwordSet = false;
      const merchantId = await this.repository.completeProvisioning(operation.id, fingerprint, business, async current => {
        const existing = await this.users.find(current.auth_user_id);
        const identity = existing ?? await this.users.create({
          id: current.auth_user_id, email: login.email, password: login.password, provisioningId: current.id,
        });
        passwordSet = !existing;
        if (identity.id !== current.auth_user_id || identity.email !== login.email || identity.provisioningId !== current.id) {
          throw new HttpProblem(409, 'provisioningConflict');
        }
      });
      return { merchantId, login: { email: login.email, passwordSet } };
    } catch (error) {
      const code = error instanceof HttpProblem ? error.code : 'provisioningPending';
      // Record only a controlled error code; never persist exception messages or credentials.
      await this.repository.recordProvisioningError(operation.id, code).catch(() => {});
      if (error instanceof HttpProblem) throw error;
      console.error('Merchant account provisioning needs recovery:', operation.id);
      throw new HttpProblem(503, 'provisioningPending');
    }
  }
}
