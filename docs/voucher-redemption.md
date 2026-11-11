# Business redemption and admin voucher oversight

## Implemented responsibility split

The customer presents a voucher to the business providing the service. That
business checks the code and confirms redemption through its own portal. Admins
can also redeem a voucher through the admin voucher detail screen after explicit
confirmation. The database distinguishes admin and business redemptions.

Apply `backend/sql/migrations/009_voucher_redemption_actor.sql` before deployment.
It adds nullable `vouchers.redeemed_by` (FK to `profiles.user_id`, deletion sets
NULL) and `redeemed_by_role` (`admin` or `merchant`). Old rows remain unknown.
No new environment variables are required.

- Business page: `/{locale}/business/redeem`. Enter code, check validity, then
  explicitly confirm marking it used. Test/unpaid vouchers are visibly labelled.
- Admin page: `/{locale}/admin/vouchers`. Search any voucher code, inspect its
  order/buyer/business and lifecycle timestamps, or browse the latest 25 issued
  and latest 25 used vouchers. `?code=VND-...` links to a voucher. Refresh the
  page to retrieve newly issued/redeemed rows; the list is not a live subscription.
  Active, unexpired vouchers offer “Redeem as admin” and a confirmation step.
  Success refreshes the lists and shows attribution in voucher history.
- All three supported languages (Finnish, Swedish, English) are available.

## Server enforcement and files

`backend/src/modules/orders/routes.ts` verifies the business session and gets its
merchant ID from that session, never from a client-supplied merchant ID. The
app-wide guard in `backend/src/app.ts` restricts `/api/admin/*` to active admins.
Admin accounts do not automatically receive merchant redemption privileges.
The redemption mutation also rejects a supplied foreign Origin.

`POST /api/admin/vouchers/redeem` accepts `{ code }`, requires an active admin
session and returns `{ voucher: AdminVoucherDTO }`. It derives the actor from
the verified session, never request fields. Used/refunded/expired vouchers return
409; missing vouchers return 404. Test/unpaid vouchers remain redeemable.
Both paths use conditional updates to prevent duplicate redemption and races with
refunds. Admin redemption keeps the voucher's merchant and contributes once to
that merchant's payout preview, with no actual payment transfer.

Admin DTOs expose `redeemedByRole` and `redeemedBy` (current profile name/UUID).
After profile deletion the actor is NULL, while the role at redemption remains.
Existing redeemed rows without attribution are displayed as historical/unknown.

`backend/src/modules/orders/service.ts` performs one conditional database update:

```sql
UPDATE public.vouchers v
SET status = 'redeemed', redeemed_at = now(),
    redeemed_by = $3, redeemed_by_role = 'merchant'
FROM public.order_items oi
WHERE oi.id = v.order_item_id
  AND v.code = $1
  AND v.merchant_id = $2
  AND v.status = 'active'
  AND v.expires_at > now()
  AND v.redeemed_at IS NULL
  AND v.refunded_at IS NULL
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
  payment collection. Support can now record unused-voucher state refunds; see the
  [refund runbook](runbooks/refunds.md). Payment-provider refunds remain unimplemented.

## Verification

Use a test voucher in the preview environment:

1. Find it in Admin -> Vouchers and verify its owning business/status.
2. Sign in as a different business: it must not disclose or redeem it.
3. Sign in as its business, check the code and confirm redemption.
4. Refresh the admin page: it should appear under recently used with a timestamp.
5. Try to redeem it again: the backend must refuse.

`backend/tests/merchant-auth.test.ts` covers ownership isolation, unauthenticated
and admin-role refusal on the merchant endpoint, foreign Origin refusal, concurrent redemption (one 200,
one 409), persisted database state, repeat use, expiry and refunded refusal.
It also covers admin redemption authorization, verified actor/role attribution,
ignored forged actor fields, business/admin and admin/refund races, repeat-use
refusal, historical unknown actors and inclusion in the owning merchant's preview.
`backend/tests/deals.test.ts` covers admin-only detail/list access, unknown codes,
buyer/order details and moving to the used list after redemption.

Both integration cases need fresh dedicated databases, respectively
`TEST_MERCHANT_AUTH_DATABASE_URL` (`vendelia_test_merchantauth...`) and
`TEST_DEALS_DATABASE_URL` (`vendelia_test_deals...`). They create/write fixtures;
never set these to production. Run files directly with `node --import tsx` to
inspect individual test counts. This review executed both against temporary
local PostgreSQL databases; no live Supabase data was changed.

## Optional camera QR scanning

Business -> Redeem voucher now offers **Scan QR code** alongside manual entry.
The scanner opens a shared native Dialog, requests video only (preferring the
rear camera), reads the voucher, closes the camera and performs the existing
merchant-scoped lookup. The merchant must still explicitly confirm redemption.
No backend, database migration, new credential or QR generation change is needed.

- `frontend/src/features/merchant/components/VoucherQrScanner.tsx` owns camera
  lifecycle, scan feedback, permission errors and retry/manual fallback.
- `frontend/src/features/merchant/voucher-qr.ts` parses exact voucher codes and
  approved voucher-page URLs, and provides camera-track cleanup.
- The `jsqr` dependency is dynamically imported when scanning starts. It decodes
  image pixels locally, avoiding reliance on the limited native BarcodeDetector
  API. Camera images are never uploaded, stored or logged; only the extracted
  voucher code is sent to the existing authenticated lookup API.
- Accepted QR content: a valid raw code or an absolute `/fi|sv|en/voucher/<code>`
  URL on the current site origin, `https://www.vendelia.fi` or
  `https://vendelia.fi`. Other origins, routes and malformed codes are rejected.
  Scanned URLs are parsed as data and never navigated to.
- The camera stops after a valid scan, dialog close/Escape/backdrop dismissal,
  unmount, page hide or hiding the browser tab. If permission resolves after close,
  the resulting tracks are stopped too.
- No automatic redemption occurs. The backend still enforces ownership, state,
  expiry and single use. Changing the manual code clears previous lookup results.
- Permission denied, no camera, unsupported browser/insecure context and camera
  failures have translated guidance in Finnish, Swedish and English.

Camera access requires HTTPS or localhost plus browser permission. A phone opening
an ordinary HTTP LAN address will generally need an HTTPS test deployment instead.
Use the existing Vercel HTTPS deployment for device testing. Manual code entry
remains available if camera scanning cannot be used.

`frontend/tests/unit/voucher-qr.test.ts` checks accepted/rejected payloads, decodes
an actual generated voucher QR matrix, and verifies camera-track cleanup. Physical
camera permissions, focus and device behavior require a manual phone/laptop test:
open scanner -> allow camera -> show voucher -> verify code -> confirm redemption.
Also test denying permission and closing the scanner while permission is pending.

References: [jsQR usage](https://github.com/cozmo/jsQR) and
[MediaDevices.getUserMedia](https://developer.mozilla.org/en-US/docs/Web/API/MediaDevices/getUserMedia).
