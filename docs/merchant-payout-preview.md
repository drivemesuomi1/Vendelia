# Business payout preview

The business sidebar has **Payouts** immediately after **Redeem voucher**, at
`/{locale}/business/payouts`. This is a read-only earnings preview backed by
existing redeemed vouchers. It does not record payout batches or send money.
No SQL migration or new environment variable is required.

## Screen behavior

- Projected payout, redeemed voucher value, platform fees and voucher count.
- Actual test/unpaid vouchers are included for testing, with clear badges and
  a separate note showing their contribution to the projected amount.
- Search voucher codes, order numbers or purchased deal/option titles.
- Expand a voucher to see issue/redemption dates, its order number, sale VAT,
  VAT-exclusive sale, commission, commission VAT and estimated earnings.
- An explicit **View example** toggle shows three labelled sample rows. They are
  never mixed with real rows, saved to the database or used as a silent fallback
  after API failure. **Your vouchers** returns to the business's own rows.
- Loading, error/retry, empty, no-search-results and responsive layouts are covered.
- **Refresh** reloads saved redemptions. The successful redemption notice links
  directly to this page.
- English, Finnish and Swedish translations are provided.

There is intentionally no invented transfer date, paid status or payout history.
The page explains that scheduling and settlement are not connected. Amounts are
computed from current configured commission rates and may change if those rates
change. They are not frozen financial records or an outstanding account balance.

## API and data boundaries

`GET /api/merchant/payouts` requires an authenticated merchant with an active
membership. The merchant UUID comes from the verified session; client-provided
merchant IDs are ignored. Admin/customer roles cannot use this merchant route.
No buyer email, name, phone or gift-recipient data is returned.

`OrderService.merchantPayoutPreview()` joins `vouchers`, `order_items`, `orders`
and `deals`. It includes only the session business's vouchers with
`status='redeemed'` and a non-null `redeemed_at`, newest first. Refunded vouchers
are excluded. It returns at most 200 rows, with `hasMore` when additional rows
exist. When truncated, the UI explicitly says its totals cover only those 200;
these totals must not be used as a full settlement balance.

Gross value comes from the voucher; item title/option/VAT come from the purchase
snapshot. Earnings use the same integer-cent calculation as redemption and admin
voucher lookup: gross minus commission on the VAT-exclusive sale minus VAT on
that commission. No extra payout row is created when redeeming; the next read
includes the updated voucher once.

The response is `MerchantPayoutPreviewDTO`, containing `preview: true`, current
commission rates, `rows` and `hasMore`. Each `MerchantPayoutEntryDTO` contains the
voucher/order/deal reference, dates, test flag, sale VAT rate and split amounts.

## Code structure

- `backend/src/modules/orders/routes.ts`: authenticated preview route.
- `backend/src/modules/orders/service.ts`: session-scoped query and common split.
- `shared/src/types/api.ts`: preview and row contracts.
- `frontend/src/features/merchant/components/MerchantPayouts.tsx`: screen.
- `frontend/src/features/merchant/payout-preview.ts`: displayed-row totals and
  explicit sample data; never persists anything.
- `frontend/src/components/layout/PortalShell.tsx`: navigation entry.
- `frontend/src/app/[locale]/(business)/business/payouts/page.tsx`: server guard.

## Validation and future settlement

The dedicated PostgreSQL merchant-auth integration test covers merchant isolation,
ignored merchant-ID input, unauthorized/admin refusal, included test vouchers,
fee/payout calculations and refunded-row exclusion. It runs only against a fresh
`TEST_MERCHANT_AUTH_DATABASE_URL`, never the production database. Frontend tests
cover example separation, current rates and gross/fee/earnings reconciliation.

Before adding real settlement, design historical commission snapshots and a
ledger/payout allocation model with unique voucher accounting, refund/reversal
handling and persistent payout statuses. Extend this preview into actual payout
batches only after the database owner approves a migration. The current page
must not be treated as evidence that any transfer is queued or complete.
