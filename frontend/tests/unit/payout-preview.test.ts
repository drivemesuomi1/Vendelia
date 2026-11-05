import { expect, it } from 'vitest';
import { examplePayoutPreview, payoutPreviewTotals } from '../../src/features/merchant/payout-preview';

it('keeps examples explicit, includes test earnings and reconciles gross minus fees', () => {
  const example = examplePayoutPreview();
  expect(example.preview).toBe(true);
  expect(example.rows.every(row => row.test && row.code.startsWith('EXAMPLE-'))).toBe(true);
  const totals = payoutPreviewTotals(example.rows);
  expect(totals.count).toBe(3);
  expect(totals.grossCents).toBe(26700);
  expect(totals.grossCents - totals.feeCents).toBe(totals.payoutCents);
  expect(totals.testPayoutCents).toBe(totals.payoutCents);
  const mixed = [example.rows[0]!, { ...example.rows[1]!, test: false }];
  expect(payoutPreviewTotals(mixed).testPayoutCents).toBe(example.rows[0]!.payoutCents);
  expect(payoutPreviewTotals([]).payoutCents).toBe(0);
});

it('uses configured rates for examples without changing earlier results', () => {
  const initial = examplePayoutPreview();
  const noCommission = examplePayoutPreview(0, 2550);
  expect(payoutPreviewTotals(noCommission.rows).payoutCents).toBe(26700);
  expect(initial.rows[0]!.payoutCents).toBe(7565);
});
