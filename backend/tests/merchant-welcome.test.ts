import { it } from 'node:test';
import assert from 'node:assert/strict';
import type { AdminMerchantCreateInput } from '@vendelia/shared';
import { MerchantService } from '../src/modules/merchants/service.js';
import type { MerchantProvisioningService } from '../src/modules/merchants/provisioning.js';
import type { MerchantRepository } from '../src/modules/merchants/repository.js';
import type { MailMessage, Mailer } from '../src/modules/vouchers/mailer.js';

const input = {
  name: 'Cleava', companyName: 'Cleava Oy', businessId: '3631044-9', contactName: 'Owner', cityId: 'helsinki', categoryId: 'cleaning',
  login: { email: 'owner@example.com', password: 'Temp-password-123!' },
} as AdminMerchantCreateInput;
const merchantId = '00000000-0000-4000-8000-0000000000aa';
const repository = { list: async () => [{ id: merchantId, name: 'Cleava' }] } as unknown as MerchantRepository;
const provisioning = (passwordSet: boolean) =>
  ({ create: async () => ({ merchantId, login: { email: 'owner@example.com', passwordSet } }) }) as unknown as MerchantProvisioningService;
const mail = { siteUrl: 'https://www.vendelia.fi', supportEmail: 'info@vendelia.fi' };

it('emails the sign-in email and password to a newly created business login', async () => {
  const sent: MailMessage[] = [];
  const mailer: Mailer = { send: async (message) => { sent.push(message); return { id: '1' }; } };
  const result = await new MerchantService(repository, provisioning(true), mailer, mail).create(input, 'admin', 'fi');
  assert.equal(result.login?.emailed, true);
  assert.equal(sent.length, 1);
  assert.equal(sent[0]!.to, 'owner@example.com');
  for (const body of [sent[0]!.text, sent[0]!.html]) {
    assert.match(body, /owner@example\.com/);
    assert.match(body, /Temp-password-123!/);
    assert.match(body, /https:\/\/www\.vendelia\.fi\/fi\/business/);
  }
  assert.doesNotMatch(JSON.stringify(result), /Temp-password-123!/);
});

it('does not email a password for a replayed account, and reports a failed email without failing creation', async () => {
  const sent: MailMessage[] = [];
  const mailer: Mailer = { send: async (message) => { sent.push(message); return { id: '1' }; } };
  const replay = await new MerchantService(repository, provisioning(false), mailer, mail).create(input, 'admin');
  assert.equal(replay.login?.emailed, undefined);
  assert.equal(sent.length, 0);

  const failing: Mailer = { send: async () => { throw new Error('smtp down'); } };
  const original = console.error; console.error = () => {};
  try {
    const result = await new MerchantService(repository, provisioning(true), failing, mail).create(input, 'admin');
    assert.equal(result.merchant.id, merchantId);
    assert.equal(result.login?.emailed, false);
  } finally { console.error = original; }
});
