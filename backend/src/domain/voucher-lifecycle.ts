import type { VoucherStatus } from "@vendelia/shared";
import { addCalendarMonths, addDays, daysUntil } from "./dates";

export const VOUCHER_VALIDITY_MONTHS = 3;
export const REFUND_WINDOW_DAYS = 14;
export const EXPIRY_REMINDER_DAYS = 14;

/**
 * issued(active) ──redeem──▶ redeemed
 *        │──cancel (≤14 days, unused)──▶ refunded
 *        └──past expiry──▶ expired
 * Redeemed, refunded and expired are final.
 */
export interface VoucherState {
  status: VoucherStatus;
  issuedAt: Date;
  expiresAt: Date;
}

export function expiryFor(issuedAt: Date): Date {
  return addCalendarMonths(issuedAt, VOUCHER_VALIDITY_MONTHS);
}

export function refundDeadline(issuedAt: Date): Date {
  return addDays(issuedAt, REFUND_WINDOW_DAYS);
}

/** Effective status: an "active" voucher past its expiry is treated as expired even before the nightly job runs. */
export function effectiveStatus(v: VoucherState, now: Date): VoucherStatus {
  if (v.status === "active" && now.getTime() > v.expiresAt.getTime()) return "expired";
  return v.status;
}

export type RedeemCheck = { ok: true } | { ok: false; reason: "redeemed" | "refunded" | "expired" };

export function canRedeem(v: VoucherState, now: Date): RedeemCheck {
  const s = effectiveStatus(v, now);
  return s === "active" ? { ok: true } : { ok: false, reason: s };
}

export type CancelCheck = { ok: true } | { ok: false; reason: "not_active" | "window_passed" };

/** Business policy: unused vouchers can be cancelled for a full refund within 14 days of purchase. */
export function canCancel(v: VoucherState, now: Date): CancelCheck {
  if (effectiveStatus(v, now) !== "active") return { ok: false, reason: "not_active" };
  if (now.getTime() > refundDeadline(v.issuedAt).getTime()) return { ok: false, reason: "window_passed" };
  return { ok: true };
}

export function needsExpiryReminder(v: VoucherState & { reminderSentAt: Date | null }, now: Date): boolean {
  if (effectiveStatus(v, now) !== "active" || v.reminderSentAt) return false;
  const days = daysUntil(now, v.expiresAt);
  return days >= 0 && days <= EXPIRY_REMINDER_DAYS;
}
