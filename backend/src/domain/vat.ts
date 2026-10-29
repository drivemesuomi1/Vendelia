import { VAT_RATES_BPS } from "@vendelia/shared";
import { BPS, roundCents } from "./money";

/** Finnish VAT rates (basis points). The rate is chosen per deal, never assumed. */
export const VAT_RATES = {
  general: 2550,
  reduced: 1350,
  reducedLow: 1000,
} as const;

/** VAT charged on Vendelia's commission (domestic taxable intermediary service). */
export const COMMISSION_VAT_BPS = VAT_RATES.general;

export function isAllowedVatRate(bps: number): boolean {
  return (VAT_RATES_BPS as readonly number[]).includes(bps);
}

/** VAT-exclusive part of a VAT-inclusive price. */
export function netFromGross(grossCents: number, vatBps: number): number {
  return roundCents((grossCents * BPS) / (BPS + vatBps));
}

/** VAT included in a VAT-inclusive price. */
export function vatIncluded(grossCents: number, vatBps: number): number {
  return grossCents - netFromGross(grossCents, vatBps);
}
