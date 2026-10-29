/** Adds calendar months; if the day does not exist in the target month, uses its last day (31 Jan + 1 → 28/29 Feb). */
export function addCalendarMonths(date: Date, months: number): Date {
  const y = date.getUTCFullYear();
  const m = date.getUTCMonth() + months;
  const lastDay = new Date(Date.UTC(y, m + 1, 0)).getUTCDate();
  const d = Math.min(date.getUTCDate(), lastDay);
  return new Date(Date.UTC(y, m, d, date.getUTCHours(), date.getUTCMinutes(), date.getUTCSeconds(), date.getUTCMilliseconds()));
}

export function addDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * 86_400_000);
}

/** Whole days from `from` until `to` (negative when `to` is in the past). */
export function daysUntil(from: Date, to: Date): number {
  return Math.ceil((to.getTime() - from.getTime()) / 86_400_000);
}
