# Database changes and team workflow

## Current scope

The database owner manages shared Supabase changes. Frontend/backend commits do
not automatically change Supabase: neither development startup nor Vercel builds
run the migration command.

For a future move to another PostgreSQL instance, see the
[proposed migration plan](proposed-postgresql-migration-plan.md). The schema-only
export `backend/sql/schema-postgres.sql` excludes retired `deal_images`, but still
needs public-schema/Auth compatibility work before it is an installation baseline.
It is outside `migrations/`, is not run automatically, and contains no live records.

The owner's schema exports reviewed on 2026-10-31 contained these seven tables:
`cities`, `categories`, `merchants`, `deals`, `deal_options`, `deal_cities`, and
`deal_option_price_history`. The UUID primary keys on `deals`, `deal_options` and
`merchants` match the references required by migration 001.

| Migration | Adds | Existing catalogue changes |
| --- | --- | --- |
| `backend/sql/migrations/001_orders_vouchers.sql` | `orders`, `order_items`, `vouchers`, constraints, indexes and access restrictions | None |
| `backend/sql/migrations/002_profiles.sql` | Shared `profiles` for customer/merchant/admin roles, linked to existing Supabase `auth.users`, with RLS and access restrictions | None |
| `backend/sql/migrations/003_auth_sessions.sql` | Hashed, revocable, eight-hour website sessions referencing profiles | None |
| `backend/sql/migrations/004_merchant_contact_and_classification.sql` | Business contact name and primary city/category references | Adds three nullable columns to `merchants`; existing values preserved |
| `backend/sql/migrations/005_merchant_members.sql` | Links business users to merchants, with member role, active flag, RLS and access restrictions | None |
| `backend/sql/migrations/006_merchant_account_provisioning.sql` | Private recovery journal for optional admin business-account creation; no passwords | None |
| `backend/sql/migrations/007_deal_review.sql` | Legacy `deal_images` bytes table with merchant FK and restricted access | Review note, submission/review timestamps, reviewer FK and queue index on `deals` |
| `backend/sql/migrations/008_order_customers.sql` | No new table | Nullable `orders.customer_id` FK to `profiles.user_id`, with index; deletion sets the link to NULL |
| `backend/sql/migrations/009_voucher_redemption_actor.sql` | No new table | Nullable `vouchers.redeemed_by` FK to profiles (delete sets NULL), actor index and `redeemed_by_role` (`admin`/`merchant`) |

## Redemption attribution (009)

Apply 009 before deploying admin redemption: merchant redemption and admin
voucher/refund reads also use the new columns. The SQL is additive and replayable;
wrap the complete file in BEGIN/COMMIT in Supabase SQL Editor. It has not been
applied to shared Supabase by the coding agent. Existing schema exports predate
009 and need subsequent migrations when restored.

Admin voucher details offer explicit confirmation of redemption through
`POST /api/admin/vouchers/redeem`. Both admin and business redemption atomically
save status, timestamp, verified profile UUID and the role at redemption. Clients
cannot choose the actor. Profile deletion sets the UUID to NULL but preserves
the recorded role; displayed actor names come from the current profile.
Historical actor/role values remain NULL (unknown); no backfill guesses are made.

Admins can redeem any business's active, unexpired voucher, including test/unpaid
vouchers. Refunded, previously used or expired vouchers cannot be redeemed.
Admin/business redemption and support refunds compete on the same conditional
row update, so only one can succeed. The voucher remains assigned to its original
merchant and contributes once to that merchant's existing payout preview. This
feature does not transfer money or create a settlement record.

## Order account ownership (008)

The database owner reports applying the equivalent SQL manually. Migration 008
records that change for other environments and can be rerun against that same
definition. Apply it before deploying the corresponding backend. Existing schema
exports predate 008; restore them and apply this migration separately.

Checkout obtains `customer_id` from the verified website session, never from the
request body. All three profile roles can buy, including test/unpaid checkout.
Guests (including invalid/expired sessions) continue with NULL ownership and
the existing order access token. Contact email is retained for delivery and may
differ from the signed-in account email.

Customer voucher listing and PDF downloads authorize by account UUID. For legacy
or guest orders only (`customer_id IS NULL`), the confirmed account email may
still match the order email. Email matching never grants access to another
account's linked order. Linked purchases survive an account email change;
unlinked guest purchases still depend on the current confirmed email. No automatic
backfill/claim or new customer-only role restriction is introduced. Deleting the
profile preserves orders with NULL ownership, so the guest-email rule applies
again. Guest token access and existing voucher/merchant relationships are unchanged.

## Deal image Storage transition

New business photo uploads now go to a public Supabase Storage bucket, configured
with `SUPABASE_STORAGE_BUCKET` (currently `Vendelia Main`) and the existing server
secret. No new table migration is needed. The running application no longer
reads or writes `deal_images`; the owner is retaining its rows in Supabase for
now. The old `/api/deal-images/:id` endpoint returns 410 without a database query.
New cover/gallery paths use `/api/deal-images/storage/<merchant>/<image>` and
redirect to Storage. The owner completed the one-off image-copy migration; its
command/script have been retired. Other environments must complete reference
migration before deploying this cleanup. See [image storage](deal-image-storage.md).
Migration 007 remains historical; no drop migration is included, and replaying
007 with the current migration runner can recreate the table if it is absent.

The exports were taken before migration 001. This document records compatibility
and code requirements, not a live deployment ledger. Verify each target database
after applying SQL; local, test and production environments can differ.

Shared profile setup and account-provisioning SQL are documented in
[user accounts](accounts.md). The owner confirmed the earlier admin-only SQL was
not applied; the unapplied migration was replaced with `002_profiles.sql`. Migration 002 requires Supabase Auth's
`auth.users` table, which plain local Postgres fixtures do not provide. This is a
prerequisite for login. Apply 003 as well: the admin and general login forms now
use Supabase Auth and profile roles, with database-backed website sessions.

## Admin business records

On 2026-11-01 the admin Add business flow was connected to `merchants`, without
merchant login provisioning. Migration 004 is required before using the updated
business list, detail and overview. Contact email maps to existing `public_email`;
only `contact_name`, `city_id` and `category_id` are new. See
[admin business setup](admin-businesses.md) for mappings and verification.
SQL has been tested locally, not applied to shared Supabase by the coding agent.

## Business login

Migration 005 adds the membership link required for merchant-role users to enter
the real business portal. Credentials stay in Supabase Auth; the existing shared
profile and session tables are reused. See [merchant login](merchant-login.md)
for manual account provisioning, SQL, file structure and current limits. Admin Add business can now optionally create the Auth user/profile/membership.
Apply 005 then 006 and configure the server secret for that flow; see
[account provisioning](merchant-account-provisioning.md). Business-only creation
remains available with the option unchecked.

## Merchant payout preview

The business Payouts page now reads existing redeemed voucher/order/item rows.
There are no payout-table writes or new migrations. Test vouchers are included
for review; current commission rates determine estimates. See
[payout preview architecture and limits](merchant-payout-preview.md).

## Admin support refunds

Admin support refunds now atomically update existing `vouchers.status` and
`refunded_at` columns; used/refunded vouchers are rejected. The refund history
reads saved order/item/business relationships. No SQL migration is required.
Order status, payments and accounting are unchanged. See
[refund implementation and rollout](runbooks/refunds.md).

## Purchase relationships

- Every new table has an auto-generated UUID `id` primary key.
- `orders.number` and `vouchers.code` are unique.
- `order_items.order_id` references `orders.id`; `deal_id` and `option_id` reference
  the existing catalogue tables.
- `vouchers` references its order, order item, deal, option and merchant.
- Deleting an order cascades to its items and vouchers. Deleting an order item
  cascades to its vouchers. Avoid deleting real purchase records.
- Referenced catalogue deals, options and merchants are protected by `ON DELETE RESTRICT`.
- Prices remain integer EUR cents; VAT rates remain integer basis points.
- RLS is enabled on all three new tables and grants are revoked from `anon` and
  `authenticated`. The backend uses its server-side database role; browser clients
  should use the implemented API rather than access these purchase tables directly.

Foreign keys validate that referenced rows exist. They do not, by themselves,
enforce every cross-table rule (such as an option belonging to the supplied deal);
the backend validates checkout pairs and constructs the related records.

## Applying migration 001

Choose one method, targeting the intended Supabase project:

1. Supabase SQL Editor: paste the entire migration file between `BEGIN;` and
   `COMMIT;`, then run it as one query.
2. From the repo root: configure `backend/.env` with the intended `DATABASE_URL`,
   install dependencies with `npm install`, then run `npm run db:migrate -w backend`.

The runner executes all `.sql` files in filename order, each in a transaction.
It currently has no migration-history table and reruns files on every invocation.
Migration 001 uses `IF NOT EXISTS`, which skips existing tables without validating
or updating their columns. Do not use this behavior to reconcile schema drift.

Check the resulting tables and RLS flags in SQL Editor:

```sql
SELECT c.relname AS table_name, c.relrowsecurity AS rls_enabled
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public'
  AND c.relkind = 'r'
  AND c.relname IN ('orders', 'order_items', 'vouchers')
ORDER BY c.relname;
```

Expect three rows, each with `rls_enabled = true`. Then configure the restricted
test checkout and email settings in [voucher setup](voucher-flow.md), and place a
test order. Verify saved records without exposing buyer details or access tokens:

```sql
SELECT o.number, o.status, o.is_test, o.total_cents, o.email_status,
  (SELECT count(*) FROM public.order_items oi WHERE oi.order_id = o.id) AS item_lines,
  (SELECT count(*) FROM public.vouchers v WHERE v.order_id = o.id) AS voucher_count
FROM public.orders o
ORDER BY o.created_at DESC
LIMIT 10;
```

One line with quantity two produces two vouchers. With payment bypass enabled,
expect `test_unpaid` and `is_test = true`. Verify the emailed/downloaded PDF and QR
origin as well. Merchant redemption now persists `status` and `redeemed_at` on
the existing voucher row; admin voucher views read existing order/item/merchant
relationships. No new migration is needed. See [voucher workflow](voucher-redemption.md).

## Team change procedure

1. Describe each schema change in a new numbered file under `backend/sql/migrations/`.
   Once a migration is shared/applied, add a new migration rather than silently
   editing the old one. Account for the runner's current replay behavior, or add
   migration tracking before introducing migrations that cannot safely be rerun.
2. Coordinate application to shared Supabase with the database owner. Record the
   target environment, migration filename, application date and verification in
   the PR or team handoff. Never include database credentials or customer records.
3. Keep SQL, backend writes/reads, shared validation/types and relevant test fixtures
   consistent. The runtime currently uses raw SQL; a diagram is not an applied schema.
4. Document any new environment variables in `.env.example` and the feature guide.
   Install changed dependencies locally; update Vercel variables and redeploy separately.
5. Verify against a dedicated test database before shared deployment. Never point
   fixture-creation tests at the production database.

Shared profiles now have a migration with `customer`, `merchant` and `admin` roles.
Login is connected to Supabase Auth and profiles; public registration remains pending.
Merchant membership, deal editing/admin review and recording redemption are
implemented. Real payments and settlement remain later work. Legacy browser demo
records and admin sample financial data are not Supabase records. The large `docs/domain/database.dbml` is a future design, not a migration
or a description of every table currently deployed.
