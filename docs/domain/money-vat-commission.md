# Money, VAT and commission

Source: developer brief (13 Oct 2026). Code: `backend/src/domain/`. Tests: `backend/tests/unit/commission.test.ts`.

- All amounts are **integer cents**. Rates are **basis points** (2550 = 25,5 %).
- The customer price is **VAT-inclusive**. Each deal has its own VAT rate (25,5 %, 13,5 % or 10 %); never assume one rate.
- **Commission = 15 % of the VAT-exclusive sale** (configurable by admin; the rate is snapshotted on every order item and voucher).
- **Commission VAT** (25,5 %) is charged on top of the commission.
- Payout to merchant = customer price − commission − commission VAT.
- Rounding: half away from zero, to whole cents, per voucher. *Confirm with the accountant before launch.*

Worked example (brief): customer pays 100,00 € at 25,5 % →
net 79,68 · sale VAT 20,32 · commission 11,95 · commission VAT 3,05 · payout 85,00.

At 13,5 % the same 100,00 € gives a payout of 83,41 € — the merchant's effective deduction depends on the deal's VAT rate.

## Ledger
`ledger_entries` is append-only, from the merchant's point of view:

| Event | Entries |
|---|---|
| Voucher sold | `sale +gross`, `commission −c`, `commission_vat −cv` |
| Voucher refunded | `refund −gross`, `refund_commission +c`, `refund_commission_vat +cv` |
| Payout | `payout −amount` (and settled entries get `payout_id`) |

Payable balance = entries of **redeemed** vouchers not yet linked to a payout (merchants are paid after redemption).

## Open items for the accountant
Intermediary vs. commission-sale VAT treatment, single-purpose voucher VAT timing, rounding, who bears payment fees.
