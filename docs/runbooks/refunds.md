# Admin support refunds

## Implemented now

Admin -> Refunds uses saved Supabase voucher/order records, with no demo fallback.
Enter a voucher code, look up the purchase, review the business/customer/value,
then select **Record refund**. Only an unused voucher can be refunded. Support
may override the cancellation window and expiry; already-used vouchers are
rejected even if the page was opened before the business redeemed it.

The backend atomically updates the existing voucher:

```sql
UPDATE public.vouchers
SET status = 'refunded', refunded_at = now()
WHERE code = $1
  AND status IN ('active', 'expired')
  AND redeemed_at IS NULL
  AND refunded_at IS NULL;
```

This makes the voucher unusable in public checks and business redemption. A refund
racing with redemption can have only one winner because both conditional updates
lock the same row. Repeating a refund returns 409 and preserves its original date.
Full voucher value is recorded; partial refunds and undo are not supported.

This is a **voucher-state refund only**. No money transfer, provider refund, ledger
reversal, refund email or audit event is implemented. The screen states this.
Test/unpaid vouchers are supported and labelled. Order status remains unchanged:
refunding one voucher must not mark a multi-voucher order fully refunded. The
existing order status constraint has no `refunded` value.

## APIs and files

- `GET /api/admin/refunds`: latest 100 saved refunded vouchers with purchase,
  customer, business, value and refund timestamps. `hasMore` indicates additional
  records; search and summary cover only the returned rows, not lifetime totals.
- `POST /api/admin/refunds`: `{ code }` -> `{ voucher: AdminVoucherDTO }`.
- `GET /api/admin/vouchers/:code`: review a purchase before confirming.
- All endpoints use the existing active-admin server guard. Mutation requests
  with an untrusted supplied Origin are rejected. Customers/merchants cannot
  trigger support refunds or read the admin refund list.
- Errors: invalid code 400; unknown voucher 404; used/already refunded/ineligible
  state 409. No customer details are returned to unauthorized callers.
- `backend/src/modules/orders/service.ts`: atomic update and saved refund list.
- `backend/src/modules/orders/routes.ts`: validation and API registration.
- `frontend/src/features/admin/components/RefundsPanel.tsx`: review/confirm,
  loading/errors, searchable history, summaries and expandable details.
- `frontend/src/app/[locale]/(admin)/admin/refunds/page.tsx`: admin session guard.
- `AdminRefundListDTO` reuses `AdminVoucherDTO`. The old `AdminRefundRowDTO` is a
  legacy demo contract and is not used by the live refund screen.

The UI has English, Finnish and Swedish translations. Search supports voucher,
order, deal, business and customer email. Full voucher details link to Admin ->
Vouchers. No fake refund history appears when requests fail.

## Database and rollout

No new SQL migration is required. Migration 001 already provides `vouchers.status`,
`refunded_at`, `redeemed_at`, expiry and order/item/business relationships.
Deploy the code and reload the admin Refunds page. No live refund was executed by
the coding agent. Refund data must come from explicit admin confirmation.

## Verification

Use a test voucher in the intended preview environment:

1. Look up an unused code and verify its business, order, customer and amount.
2. Confirm the refund; verify `vouchers.status='refunded'` and `refunded_at` is set.
3. Refresh the page: the voucher remains in refund history.
4. A business lookup must show refunded; redemption must be refused.
5. Repeat the refund: it must be rejected without changing its timestamp.
6. Check used, unknown and malformed codes, and non-admin access.

Dedicated local PostgreSQL integration tests in `merchant-auth.test.ts` cover
these cases, support refunds after expiry/cancellation window, duplicate requests,
refund-vs-redemption races, saved list details and unchanged order status. Fixture
tests require a fresh `TEST_MERCHANT_AUTH_DATABASE_URL` named
`vendelia_test_merchantauth...`; never point it at production.

## Later payment integration

Before using this as a real-money refund workflow, design refund request/provider
status records, idempotent payment operations, accounting reversals, actor/reason
audit records and customer notifications. A provider refund is external to the
PostgreSQL transaction; do not assume a database rollback can undo money movement.

## Business portal scope

Refund history and administration remain in the admin portal. At the owner’s
request, the business Payouts page has no refunded-voucher section or refund
notification bell. Business code lookup still reports a refunded voucher as
refunded so it cannot be redeemed. Unused vouchers never entered the projected
payout, so recording their refund does not deduct their value from that total.
