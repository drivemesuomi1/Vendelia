import type { MerchantPayoutEntryDTO, MerchantPayoutPreviewDTO } from '@vendelia/shared';
import { splitPrice } from '@/features/portal-demo/money';

/** Screen totals are explicitly for the returned rows, including testing vouchers. No settled balance is implied. */
export function payoutPreviewTotals(rows: MerchantPayoutEntryDTO[]) {
  return rows.reduce((total, row) => ({
    grossCents: total.grossCents + row.grossCents,
    feeCents: total.feeCents + row.feeCents,
    payoutCents: total.payoutCents + row.payoutCents,
    testPayoutCents: total.testPayoutCents + (row.test ? row.payoutCents : 0),
    count: total.count + 1,
  }), { grossCents: 0, feeCents: 0, payoutCents: 0, testPayoutCents: 0, count: 0 });
}

/** Explicit opt-in design examples; never mixed into the merchant's database rows or persisted. */
export function examplePayoutPreview(commissionBps = 1500, commissionVatBps = 2550): MerchantPayoutPreviewDTO {
  const examples = [
    { code: 'EXAMPLE-001', fi: 'Kotisiivous', sv: 'Hemstädning', en: 'Home cleaning', option: '3 h', gross: 8900, date: '2026-11-05T10:30:00Z' },
    { code: 'EXAMPLE-002', fi: 'Rentouttava hieronta', sv: 'Avslappnande massage', en: 'Relaxing massage', option: '60 min', gross: 5900, date: '2026-11-04T14:15:00Z' },
    { code: 'EXAMPLE-003', fi: 'Kotisiivous', sv: 'Hemstädning', en: 'Home cleaning', option: '4 h', gross: 11900, date: '2026-11-03T09:00:00Z' },
  ];
  return { preview: true, commissionBps, commissionVatBps, hasMore: false,
    rows: examples.map((e, i) => ({
      code: e.code, title: { fi: e.fi, sv: e.sv, en: e.en }, optionLabel: { fi: e.option, sv: e.option, en: e.option },
      orderNumber: `EXAMPLE-ORDER-${i + 1}`, dealSlug: '', redeemedAt: e.date, issuedAt: '2026-10-20T09:00:00Z',
      test: true, vatBps: 2550, ...splitPrice(e.gross, 2550, commissionBps, commissionVatBps),
    })),
  };
}
