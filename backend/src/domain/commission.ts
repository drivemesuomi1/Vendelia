import type { SplitDTO } from "@vendelia/shared";
import { applyBps } from "./money";
import { COMMISSION_VAT_BPS, netFromGross } from "./vat";

export const DEFAULT_COMMISSION_BPS = 1500;

/**
 * Splits a customer payment between merchant and platform.
 * Commission = rate × VAT-exclusive sale; commission VAT is added on top of the commission.
 *
 * Example (brief): 100.00 at 25.5 % VAT → net 79.68, commission 11.95, commission VAT 3.05, payout 85.00.
 */
export function splitSale(
  grossCents: number,
  vatBps: number,
  commissionBps: number = DEFAULT_COMMISSION_BPS,
  commissionVatBps: number = COMMISSION_VAT_BPS,
): SplitDTO {
  const netCents = netFromGross(grossCents, vatBps);
  const saleVatCents = grossCents - netCents;
  const commissionCents = applyBps(netCents, commissionBps);
  const commissionVatCents = applyBps(commissionCents, commissionVatBps);
  const feeCents = commissionCents + commissionVatCents;
  return {
    grossCents,
    netCents,
    saleVatCents,
    commissionCents,
    commissionVatCents,
    feeCents,
    payoutCents: grossCents - feeCents,
  };
}
