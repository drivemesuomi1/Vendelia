import { describe, expect, it } from "vitest";
import { addCalendarMonths } from "../../src/domain/dates";
import { canCancel, canRedeem, effectiveStatus, expiryFor, needsExpiryReminder } from "../../src/domain/voucher-lifecycle";

const day = 86_400_000;
const issued = new Date(Date.UTC(2026, 9, 14, 10));

describe("expiry", () => {
  it("is 3 calendar months after purchase", () => {
    expect(expiryFor(issued).toISOString().slice(0, 10)).toBe("2027-01-14");
  });
  it("clamps to the last day of shorter months", () => {
    expect(addCalendarMonths(new Date(Date.UTC(2026, 10, 30)), 3).toISOString().slice(0, 10)).toBe("2027-02-28");
  });
});

describe("redeem", () => {
  const v = { status: "active" as const, issuedAt: issued, expiresAt: expiryFor(issued) };
  it("allows active vouchers", () => expect(canRedeem(v, new Date(issued.getTime() + day))).toEqual({ ok: true }));
  it("rejects used, refunded and expired vouchers", () => {
    expect(canRedeem({ ...v, status: "redeemed" }, issued)).toEqual({ ok: false, reason: "redeemed" });
    expect(canRedeem({ ...v, status: "refunded" }, issued)).toEqual({ ok: false, reason: "refunded" });
    expect(canRedeem(v, new Date(v.expiresAt.getTime() + 1))).toEqual({ ok: false, reason: "expired" });
  });
  it("treats an active voucher past expiry as expired", () => {
    expect(effectiveStatus(v, new Date(v.expiresAt.getTime() + day))).toBe("expired");
  });
});

describe("cancel / refund window", () => {
  const v = { status: "active" as const, issuedAt: issued, expiresAt: expiryFor(issued) };
  it("allows cancelling an unused voucher within 14 days", () => {
    expect(canCancel(v, new Date(issued.getTime() + 13 * day))).toEqual({ ok: true });
  });
  it("blocks cancelling after 14 days", () => {
    expect(canCancel(v, new Date(issued.getTime() + 15 * day))).toEqual({ ok: false, reason: "window_passed" });
  });
  it("blocks cancelling a redeemed voucher", () => {
    expect(canCancel({ ...v, status: "redeemed" }, issued)).toEqual({ ok: false, reason: "not_active" });
  });
});

describe("expiry reminder", () => {
  const v = { status: "active" as const, issuedAt: issued, expiresAt: expiryFor(issued), reminderSentAt: null };
  it("is due 14 days before expiry, once", () => {
    expect(needsExpiryReminder(v, new Date(v.expiresAt.getTime() - 20 * day))).toBe(false);
    expect(needsExpiryReminder(v, new Date(v.expiresAt.getTime() - 10 * day))).toBe(true);
    expect(needsExpiryReminder({ ...v, reminderSentAt: new Date() }, new Date(v.expiresAt.getTime() - 10 * day))).toBe(false);
  });
});
