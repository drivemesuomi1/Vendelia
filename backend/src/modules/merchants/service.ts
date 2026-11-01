import type { AdminMerchantInput, MerchantStatus } from '@vendelia/shared';
import { HttpProblem } from '../../errors';
import { MerchantRepository } from './repository';
export class MerchantService {
  constructor(private readonly repository: MerchantRepository) {}
  list() { return this.repository.list(); }
  async get(id: string) {
    const [merchant] = await this.repository.list(id);
    if (!merchant) throw new HttpProblem(404, 'not_found');
    return merchant;
  }
  async create(input: AdminMerchantInput) {
    let id: string | null;
    try { id = await this.repository.create(input); }
    catch (error) {
      if ((error as { code?: string }).code === '23505') throw new HttpProblem(409, 'business_exists');
      throw error;
    }
    if (!id) throw new HttpProblem(400, 'invalidMerchantReference');
    return this.get(id);
  }
  async setStatus(id: string, status: MerchantStatus) {
    if (!await this.repository.setStatus(id, status)) throw new HttpProblem(404, 'not_found');
    return this.get(id);
  }
}
