import type { SplitDTO } from "@vendelia/shared";

/**
 * Per-voucher split shown to businesses and admins: commission is charged on the VAT-exclusive price,
 * with VAT on the commission. Same rule as docs/domain/money-vat-commission.md.
 */
export function splitPrice(grossCents: number, vatBps: number, commissionBps: number, commissionVatBps: number): SplitDTO {
  const netCents = Math.round((grossCents * 10000) / (10000 + vatBps));
  const commissionCents = Math.round((netCents * commissionBps) / 10000);
  const commissionVatCents = Math.round((commissionCents * commissionVatBps) / 10000);
  const feeCents = commissionCents + commissionVatCents;
  return { grossCents, netCents, saleVatCents: grossCents - netCents, commissionCents, commissionVatCents, feeCents, payoutCents: grossCents - feeCents };
}
