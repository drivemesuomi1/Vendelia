# Voucher lifecycle

Code: `backend/src/domain/voucher-lifecycle.ts`. Tests: `backend/tests/unit/voucher-lifecycle.test.ts`.

```
active ──redeem (merchant, once)──▶ redeemed
  │──cancel (customer, unused, ≤ 14 days from purchase)──▶ refunded
  │──support refund (admin, unused, any time)──▶ refunded
  └──expiry passed──▶ expired          (nightly job; also treated as expired immediately)
```

- One voucher per unit bought; each has its own code `VND-XXXX-XXXX` (no 0/O/1/I).
- Valid for **3 calendar months** from purchase (clamped to month end: 30 Nov → 28 Feb).
- Exact expiry is shown on the deal page, at checkout, on the voucher, in "My vouchers" and in the confirmation email.
- Redemption is a single atomic `UPDATE … WHERE status='active' AND expires_at > now` — two tills cannot redeem the same code.
- Expiry reminder email 14 days before expiry, once.
- Refund: voucher → `refunded`, ledger reversal, provider refund, acknowledgement email.

*Statutory withdrawal rules and dated bookings still need the legal review noted in the brief.*
