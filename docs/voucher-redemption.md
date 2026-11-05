# Business redemption and admin voucher oversight

## Implemented responsibility split

The customer presents a voucher to the business providing the service. That
business checks the code and confirms redemption through its own portal. Admins
inspect vouchers for support and oversight; they do not redeem on behalf of each
business. These requirements are implemented by commits 52c255f and 20b7641.

- Business page: `/{locale}/business/redeem`. Enter code, check validity, then
  explicitly confirm marking it used. Test/unpaid vouchers are visibly labelled.
- Admin page: `/{locale}/admin/vouchers`. Search any voucher code, inspect its
  order/buyer/business and lifecycle timestamps, or browse the latest 25 issued
  and latest 25 used vouchers. `?code=VND-...` links to a voucher. Refresh the
  page to retrieve newly issued/redeemed rows; the list is not a live subscription.
- All three supported languages (Finnish, Swedish, English) are available.

## Server enforcement and files

`backend/src/modules/orders/routes.ts` verifies the business session and gets its
merchant ID from that session, never from a client-supplied merchant ID. The
app-wide guard in `backend/src/app.ts` restricts `/api/admin/*` to active admins.
Admin accounts do not automatically receive merchant redemption privileges.
The redemption mutation also rejects a supplied foreign Origin.

`backend/src/modules/orders/service.ts` performs one conditional database update:

```sql
UPDATE public.vouchers v
SET status = 'redeemed', redeemed_at = now()
FROM public.order_items oi
WHERE oi.id = v.order_item_id
  AND v.code = $1
  AND v.merchant_id = $2
  AND v.status = 'active'
  AND v.expires_at > now()
RETURNING v.price_cents, oi.vat_bps;
```

This guards ownership, expiry and the unused state at the moment of update. Two
concurrent requests can produce only one successful state transition. Rejected
attempts return 409 with a reason (already redeemed, refunded, expired, unknown
or another business). Unauthenticated requests return 401; inappropriate roles
return 403. There is no reversal endpoint.

After redemption, businesses can follow the Payouts link to inspect their own
redeemed vouchers and estimated earnings. This includes labelled test vouchers
and an explicit sample-data mode; see [payout preview](merchant-payout-preview.md).

Frontend components: `features/merchant/components/RedeemPanel.tsx` and
`features/admin/components/AdminVouchers.tsx`. Shared response contracts live in
`shared/src/types/api.ts`.

## Existing database support

No new migration is required for these features:

| Table | Existing fields used |
| --- | --- |
| `vouchers` | Unique `code`, merchant/order/item/deal references, `status`, `is_test`, price, issue/expiry/cancellation/redemption/refund timestamps, recipient |
| `order_items` | Purchased title/option snapshots and VAT rate |
| `orders` | Order number/status, buyer details, payment method, total and email status |
| `merchants`, `deals` | Business name and deal link |
| `profiles`, `auth_sessions`, `merchant_members` | Verified identity, active role/session and business membership |

Migration 001 creates purchase tables; 002/003 provide profiles/sessions and 005
provides merchant membership. The owner's configured Supabase schema was checked
read-only on 2026-11-05: required voucher/order/item/profile/membership columns
were present. No live voucher codes, buyer data or mutations were used for that
schema check. This check does not certify every environment or financial rule.

The database stores records as rows; the fields above are columns. Redemption
updates an existing voucher row rather than creating another voucher.

## Current preview limits

- Test/unpaid vouchers can currently be redeemed and are marked as such in the UI.
  The SQL does not require a paid order. Introduce an explicit payment-eligibility
  policy before real purchases and separate test/real financial reporting.
- Payout values use current configured commission rates. They are estimates,
  not stored historical settlement amounts or actual money transfers.
- The displayed history is built from lifecycle timestamps. There is no separate
  append-only redemption/audit table, staff attribution or reversal history.
- Expired vouchers are displayed as expired at read time; this does not persist
  a status change or establish a scheduled expiry worker.
- The recent-issued list includes test/unpaid orders; "bought" does not prove
  payment collection. Refund display does not implement payment refunds.

## Verification

Use a test voucher in the preview environment:

1. Find it in Admin -> Vouchers and verify its owning business/status.
2. Sign in as a different business: it must not disclose or redeem it.
3. Sign in as its business, check the code and confirm redemption.
4. Refresh the admin page: it should appear under recently used with a timestamp.
5. Try to redeem it again: the backend must refuse.

`backend/tests/merchant-auth.test.ts` covers ownership isolation, unauthenticated
and admin-role refusal, foreign Origin refusal, concurrent redemption (one 200,
one 409), persisted database state, repeat use, expiry and refunded refusal.
`backend/tests/deals.test.ts` covers admin-only detail/list access, unknown codes,
buyer/order details and moving to the used list after redemption.

Both integration cases need fresh dedicated databases, respectively
`TEST_MERCHANT_AUTH_DATABASE_URL` (`vendelia_test_merchantauth...`) and
`TEST_DEALS_DATABASE_URL` (`vendelia_test_deals...`). They create/write fixtures;
never set these to production. Run files directly with `node --import tsx` to
inspect individual test counts. This review executed both against temporary
local PostgreSQL databases; no live Supabase data was changed.
