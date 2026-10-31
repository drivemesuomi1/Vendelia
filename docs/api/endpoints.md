# API endpoints

Base: `http://127.0.0.1:4000` (the frontend proxies `/api/*`). JSON in/out. Errors: `{ error, message, fields? }` —
`error` and `fields` values are translation keys (`frontend/messages/*.json` → `errors.*`).
Auth: httpOnly session cookie `vd_session`. Roles: `customer`, `merchant`, `admin` (admin passes every role check).

## Authentication implementation status

Implemented: `POST /api/auth/login`, `POST /api/auth/admin/login`,
`GET /api/auth/me`, `GET /api/auth/config`, `POST /api/auth/logout`, and
`GET /api/me/vouchers`. Login requires Supabase Auth credentials, an active
confirmed profile and migrations 002/003. Admin login additionally requires the
admin role. See [account setup](../accounts.md).

The remaining authentication/merchant endpoints below are a planned contract,
not implemented signup or merchant ownership functionality. Website sessions
are separate from Supabase Auth tokens, expire after eight hours, and are
revoked in the database on logout. `/api/admin/*` requires an active admin profile.

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
| POST | `/api/merchant/uploads` | Multipart image (jpg/png/webp, 5 MB) → `{ url }` |
| POST | `/api/merchant/vouchers/lookup` | `{ code }` → valid / not_found / other_merchant / redeemed / refunded / expired |
| POST | `/api/merchant/vouchers/redeem` | `{ code }` — atomic single use |
| GET | `/api/merchant/payouts` | Statement for the current period + pending payout + history |

## Admin
| GET | `/api/admin/deals?status` | Review queue |
|---|---|---|
| POST | `/api/admin/deals/:id/review` | `{ decision: approve|reject, note? }` |
| GET | `/api/admin/merchants` · POST `/api/admin/merchants/:id/status` | List / activate / suspend |
| GET/PUT | `/api/admin/settings/commission` | `{ rateBps }` |
| GET/POST | `/api/admin/refunds` | List / support refund `{ code }` |
| GET | `/api/admin/audit` · `/api/admin/emails` | Audit log, email outbox |
| POST | `/api/admin/jobs/:name/run` | `voucher-expiry`, `expiry-reminders`, `payout-run`, `dac7-report` |
