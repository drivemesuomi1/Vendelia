/**
 * Money is integer cents everywhere. Rates are basis points (1 % = 100 bps).
 * Rounding: half away from zero to whole cents (confirm with accountant before launch).
 */
export const BPS = 10_000;

export function roundCents(value: number): number {
  return Math.sign(value) * Math.round(Math.abs(value));
}

/** amount × rate, rounded to cents. */
export function applyBps(amountCents: number, bps: number): number {
  return roundCents((amountCents * bps) / BPS);
}

export function sum(values: number[]): number {
  return values.reduce((a, b) => a + b, 0);
}
