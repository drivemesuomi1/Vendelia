# Voucher purchase flow

Customer details → checkout → order and vouchers saved → PDF voucher emailed.

## What happens on checkout

1. `POST /api/orders` validates the form with the shared `checkoutSchema` and prices the
   cart from the database (browser prices are never used). Unavailable items → `409 itemsUnavailable`.
2. One transaction stores the order, its items (with title/option snapshots) and **one voucher
   per unit bought**. Each voucher gets a unique code `VND-XXXX-XXXX` (no 0/O/1/I/L) and a QR
   payload, both saved on the voucher row.
3. The PDF (one A4 page per voucher, in the order's language) is built from the saved rows and
   emailed to the buyer. The result is recorded on the order (`email_status`, `email_error`).
   An email failure never loses the order: the confirmation page offers the same PDF for download.
4. The browser gets an access token (only its SHA-256 is stored) to load `GET /api/orders/:id`
   and `GET /api/orders/:id/pdf` with the `x-order-token` header.

The PDF binary is not stored in Supabase; downloads regenerate it. Prices, titles,
option labels and merchant display names are snapshotted, but terms, booking
instructions, addresses and some merchant details are still read from the current
catalogue. Freeze these details before accepting real purchases. Duplicate checkout
request protection is also pending.

## QR code and verification

The QR encodes `https://www.vendelia.fi/fi/voucher/<CODE>`, a public check page that shows
whether the code is valid, used or expired (no customer details), backed by
`GET /api/vouchers/:code`. Marking a voucher as used (`/api/merchant/vouchers/redeem`) needs
merchant sign-in and returns `501 redeemUnavailable` until that exists.

## Temporary test checkout (payment bypass)

Payments are not integrated yet. With `PAYMENT_BYPASS=true`:

- `/api/meta` returns `paymentBypass: true`; the checkout hides the payment methods, shows a
  test-mode notice and sends `payment.method = "test"`.
- Orders are stored with `status = 'test_unpaid'` and `is_test = true` (a database CHECK keeps
  the two in step), and every voucher has `is_test = true`.
- The PDF has a red "TEST – NOT PAID" banner and watermark, the email subject starts with
  `[TESTI]`/`[TEST]`, and the confirmation, voucher card and check page show a test badge.
- Optional `PAYMENT_BYPASS_ALLOWED_EMAILS` limits test orders to listed emails or `@domains`.

**To disable:** set `PAYMENT_BYPASS=false` (or remove it) and redeploy. Checkout then answers
`503 paymentUnavailable` until a provider is added. When integrating payments, remove
`TEST_PAYMENT_METHOD` from `shared/src/schemas/order.ts` and the bypass branch in
`OrderService.create` (`backend/src/modules/orders/service.ts`).

## Setup

- Install dependencies from the repo root with `npm install` and restart the server
  after pulling this feature (it adds `nodemailer`, `pdf-lib` and related packages).
- Database: `npm run db:migrate -w backend` applies `backend/sql/migrations/*.sql`,
  one transaction per file. Migration 001 adds `orders`, `order_items`, `vouchers`,
  with RLS on and grants revoked from `anon` and `authenticated`.
  Alternatively, paste the full migration into Supabase SQL Editor between `BEGIN;`
  and `COMMIT;` and run the whole query. Use either method; both apply the same SQL.
  `IF NOT EXISTS` skips existing tables; it does not reconcile a different schema.
  See [database changes and verification](database-changes.md).
- Email: set `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `MAIL_FROM`. For production,
  verify the sending domain (SPF/DKIM) with the email provider so vouchers are not marked as spam.
  Without SMTP in development, emails and PDFs are written to `backend/.data/outbox/`.
- `PUBLIC_SITE_URL` sets the origin used in QR codes and links (default `https://www.vendelia.fi`).
  Use `http://localhost:3000` locally and `https://www.vendelia.fi` on Vercel so
  production PDFs do not contain localhost links. Configure Vercel separately and redeploy.
