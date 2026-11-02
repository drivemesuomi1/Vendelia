import type { AdminMerchantCreateInput, MerchantStatus } from '@vendelia/shared';
import { HttpProblem } from '../../errors';
import type { MerchantProvisioningService } from './provisioning';
import { MerchantRepository } from './repository';
export class MerchantService {
  constructor(private readonly repository: MerchantRepository, private readonly provisioning: MerchantProvisioningService) {}
  list() { return this.repository.list(); }
  async get(id: string) {
    const [merchant] = await this.repository.list(id);
    if (!merchant) throw new HttpProblem(404, 'not_found');
    return merchant;
  }
  async create(input: AdminMerchantCreateInput, adminId: string) {
    let id: string | null;
    let login: { email: string; passwordSet: boolean } | undefined;
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
    return { merchant: await this.get(id), ...(login ? { login } : {}) };
  }
  async setStatus(id: string, status: MerchantStatus) {
    if (!await this.repository.setStatus(id, status)) throw new HttpProblem(404, 'not_found');
    return this.get(id);
  }
}
