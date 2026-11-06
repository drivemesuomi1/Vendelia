# API endpoints

Base: `http://127.0.0.1:4000` (the frontend proxies `/api/*`). JSON in/out. Errors: `{ error, message, fields? }` —
`error` and `fields` values are translation keys (`frontend/messages/*.json` → `errors.*`).
Auth: httpOnly session cookie `vd_session`. Roles: `customer`, `merchant`, `admin` (admin access is explicit; merchant operations require a linked merchant account).

## Authentication implementation status

Implemented: `POST /api/auth/login`, `POST /api/auth/admin/login`,
`GET /api/auth/me`, `GET /api/auth/config`, `POST /api/auth/logout`, and
`GET /api/me/vouchers`, `POST /api/auth/merchant/login` and `GET /api/merchant/deals`. Login requires Supabase Auth credentials, an active
confirmed profile and migrations 002/003. Admin login additionally requires the
admin role. See [account setup](../accounts.md).

The remaining authentication/merchant endpoints below are a planned contract,
not implemented signup functionality. Merchant ownership uses migration 005;
see [merchant login](../merchant-login.md). Merchant voucher lookup now requires
a linked business session; recording redemption atomically updates the owned voucher. Website sessions
are separate from Supabase Auth tokens, expire after eight hours, and are
revoked in the database on logout. `/api/admin/*` requires an active admin profile.

For the implemented business/admin voucher workflow and current limits, see
[voucher redemption](../voucher-redemption.md).

## Public
| Method | Path | Purpose |
|---|---|---|
| GET | `/api/health` | Liveness, DB driver, payment provider |
| GET | `/api/meta` | Cities, categories (with live deal counts), commission rate, validity/refund constants |
| GET | `/api/deals?city&category&q&featured` | Live deals |
| GET | `/api/deals/:slug` | Deal detail |
| POST | `/api/cart/quote` | `{ items }` → server prices, VAT per rate, unavailable items |
| POST | `/api/orders` | Checkout (`checkoutSchema`); header `x-locale`. Returns order id + guest access token |
| GET | `/api/orders/:id` | Order + vouchers (owner session or `x-order-token`) |
| POST | `/api/payments/:orderId/mock-confirm` | Mock provider "payment succeeded" (`x-order-token`) |
| POST | `/api/payments/webhook` | Reserved for real provider webhooks (501 for now) |
| POST | `/api/auth/register` · `/login` · `/logout` | Customer accounts (rate-limited) |
| GET | `/api/auth/me` | Current user or null |
| GET | `/api/merchants/lookup/:businessId` | Company name from the PRH/YTJ register |
| POST | `/api/merchants/register` | Business sign-up (status: pending) |

## Customer (signed in)
| GET | `/api/me/vouchers` | Own vouchers (account or same email) |
|---|---|---|
| POST | `/api/me/vouchers/cancel` | `{ code }` — 14-day cancellation of an unused voucher |
| PATCH | `/api/me` | Update name |

## Merchant
| GET | `/api/merchant/overview` | KPIs + deals |
|---|---|---|
| GET/POST | `/api/merchant/deals` | List / create (goes to review) |
| GET/PUT | `/api/merchant/deals/:id` | Read / update (back to review) |
| POST | `/api/merchant/commission-preview` | `{ priceCents, vatBps }` → split |
| POST | `/api/merchant/uploads` | Merchant session; JSON `{ contentType, data }` (base64 JPEG/PNG/WebP, decoded max 1 MiB) → `{ url }`; uploads to public Supabase Storage |
| GET | `/api/deal-images/storage/:merchantId/:imageId` | Public redirect to Supabase Storage object; UUID path components |
| GET | `/api/deal-images/:id` | Retired legacy URL; HTTP 410 (`image_retired`), no database access |
| POST | `/api/merchant/vouchers/lookup` | `{ code }` → valid / not_found / other_merchant / redeemed / refunded / expired |
| POST | `/api/merchant/vouchers/redeem` | `{ code }` — linked merchant only; atomically marks an owned active, unexpired voucher used; refuses repeated use with 409 |
| GET | `/api/merchant/payouts` | Implemented read-only earnings preview from the latest 200 owned redeemed vouchers; includes labelled test vouchers; no transfers or payout history |

## Admin

Business list/detail/create/status endpoints are implemented and require migration
004 plus an active admin session. Creating a merchant without `login` does not create an Auth user. Optional
`login: { email, password }` provisions a new linked account after migration 006
and server-secret setup; see [provisioning](../merchant-account-provisioning.md).
See [admin business setup](../admin-businesses.md). Other admin routes below remain
planned unless otherwise documented.

| GET | `/api/admin/deals?status` | Review queue |
| GET | `/api/admin/vouchers?view=bought\|used` | Admin-only latest 25 issued or redeemed vouchers from the database |
| GET | `/api/admin/vouchers/:code` | Admin-only voucher, buyer, order and business details |
|---|---|---|
| POST | `/api/admin/deals/:id/review` | `{ decision: approve|reject, note? }` |
| GET/POST | `/api/admin/merchants` | List / create business records, with optional new login provisioning |
| GET | `/api/admin/merchants/:id` | Business details |
| POST | `/api/admin/merchants/:id/status` | Activate / suspend / mark pending |
| GET/PUT | `/api/admin/settings/commission` | `{ rateBps }` |
| GET/POST | `/api/admin/refunds` | Implemented: latest 100 saved refund details / `{ code }` atomically marks an unused voucher refunded; no payment-provider money movement |
| GET | `/api/admin/audit` · `/api/admin/emails` | Audit log, email outbox |
| POST | `/api/admin/jobs/:name/run` | `voucher-expiry`, `expiry-reminders`, `payout-run`, `dac7-report` |
