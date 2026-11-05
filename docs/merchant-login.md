# Merchant login and business membership

## Implemented scope

The `/en/business` portal (also `/fi/business` and `/sv/business`) now authenticates
against Supabase Auth and uses database-backed website sessions. It no longer
accepts browser demo credentials or the development `123` shortcut.

A merchant must have all of:

1. A confirmed, non-banned Supabase Auth user (`auth.users`).
2. An active `profiles` row with `role = 'merchant'`.
3. An active `merchant_members` row linking the profile to an existing `merchants` row.
4. A business status of `active` or `pending`. Suspended businesses cannot enter.

Existing admin/customer login still works without querying `merchant_members` for
those roles. Business login explicitly rejects admin/customer accounts; use a
separate business identity to test it. Authorization uses the UUID link, never a
matching `public_email`, Business ID supplied by the browser or localStorage.

## Database: one new table

Apply `backend/sql/migrations/005_merchant_members.sql`. It creates only
`public.merchant_members`; credentials remain in Supabase Auth and account roles
remain in the existing shared `profiles` table.

| Column | Purpose |
| --- | --- |
| `user_id` | Primary key; references `profiles.user_id`, deletion cascades |
| `merchant_id` | Required reference to `merchants.id`, deletion restricted |
| `member_role` | `owner` (default), `manager` or `staff` |
| `is_active` | Membership access flag, initially true |
| `created_at` | Creation timestamp |

This first portal supports **one business per user**. A business may have several
staff accounts. That matches the current session DTO's singular `merchant` field.
Supporting one user switching between several businesses later requires changing
this constraint, the session contract and adding explicit business selection.
All three member roles currently have the same read-only portal capabilities.

The table has RLS enabled, no browser policies, and grants revoked from `PUBLIC`,
`anon` and `authenticated`. Only trusted server/database administration can assign
membership. No existing table or account is changed by this migration.

## Create accounts from the admin form

For a new business, the admin Add business form now supports **Create business
login**. Apply 005 plus 006 and configure `SUPABASE_SECRET_KEY` first. The form then
creates the Auth user, profile and owner membership together through the backend;
manual Auth/profile inserts are not needed for that flow. See
[account provisioning](merchant-account-provisioning.md).

## Manual alternative for an existing business

1. Apply migration 005 in the intended Supabase project. In SQL Editor, paste the
   full file between `BEGIN;` and `COMMIT;` and run it together. Migrations 002/003
   must already exist; migration 004 remains required for admin business management.
   Code deployment does not run migrations. The coding agent has not applied 005
   to shared Supabase.
2. Add the business in the existing admin portal, or reuse an existing merchant.
   Find its UUID in Supabase or with this read-only query:

   ```sql
   SELECT id, display_name, business_id, status
   FROM public.merchants
   ORDER BY display_name;
   ```

3. In **Supabase → Authentication → Users → Add user → Create new user**, enter
   the business user's actual sign-in email and chosen password. Confirm the
   email for the test account, and copy its User UID. Use a separate identity from
   your admin account. Never insert a plaintext password into SQL.
4. Replace the placeholders and run the following in SQL Editor:

   ```sql
   BEGIN;

   INSERT INTO public.profiles (user_id, display_name, role)
   VALUES ('AUTH-USER-UUID'::uuid, 'Business contact name', 'merchant')
   ON CONFLICT (user_id) DO NOTHING;

   INSERT INTO public.merchant_members (user_id, merchant_id, member_role)
   VALUES ('AUTH-USER-UUID'::uuid, 'MERCHANT-UUID'::uuid, 'owner')
   ON CONFLICT (user_id) DO NOTHING;

   COMMIT;
   ```

   These inserts intentionally do not overwrite an existing account role or move
   an existing membership to another business. If the profile already exists,
   inspect it and explicitly authorize any role/link change. Simply adding a
   membership does not change an admin/customer profile into a merchant profile.
5. Verify the result:

   ```sql
   SELECT p.user_id, p.display_name, p.role, p.is_active AS profile_active,
     mm.is_active AS membership_active, mm.member_role,
     m.id AS merchant_id, m.display_name AS business_name, m.status
   FROM public.profiles p
   JOIN public.merchant_members mm ON mm.user_id = p.user_id
   JOIN public.merchants m ON m.id = mm.merchant_id
   WHERE p.user_id = 'AUTH-USER-UUID'::uuid;
   ```

6. Restart/deploy the updated code, visit `/en/business`, and sign in with the Auth
   email/password from step 3. The dashboard shows the linked business and only
   its saved deals. Sign out and confirm the protected data is no longer accessible.

No new environment variables are required: reuse `DATABASE_URL`, `SUPABASE_URL`
and `SUPABASE_PUBLISHABLE_KEY` from the working admin setup, all for the same
project. Admin account provisioning additionally needs the server-only secret key
and migration 006; ordinary merchant sign-in still uses the existing publishable key.

## Authorization and sessions

The existing eight-hour, hashed-token session system is reused. Every session
lookup rechecks profile, Auth user, membership and merchant status. Disabling the
profile or membership, removing the link, or suspending the business denies its
next protected request, including existing sessions. Pending businesses can read
their saved deals; that does not publish them or enable writes.

For permanent session revocation after a password reset, membership reassignment
or incident response, use the documented `auth_sessions` deletion procedure in
[account setup](accounts.md). A flag restored before expiry can otherwise permit
an existing session again. Supabase password changes alone do not delete website
sessions. Login is shared per browser cookie: signing in as a different account
replaces the current browser's website session.

## APIs and files

| Location/API | Purpose |
| --- | --- |
| `POST /api/auth/merchant/login` | Verifies password, active merchant role and membership before creating a session |
| `GET /api/auth/me` | Returns the profile with its authorized business, or null |
| `GET /api/merchant/deals` | Lists only the business from the verified session; ignores supplied merchant IDs |
| `POST /api/merchant/vouchers/lookup` | Requires merchant login; rejects codes belonging to other businesses |
| `POST /api/merchant/vouchers/redeem` | Requires merchant login; atomically redeems an owned active, unexpired voucher once |
| `backend/src/modules/auth/repository.ts` | Membership and current-business checks for merchant profiles |
| `backend/src/modules/auth/service.ts` and `routes.ts` | Role-specific login audiences and shared session flow |
| `backend/src/modules/merchants/repository.ts` and `routes.ts` | SQL scoped to the session's merchant UUID |
| `frontend/src/features/merchant/components/BusinessGate.tsx` | Real login screen and business shell; no demo-store identity |
| `frontend/src/features/merchant/components/MerchantDashboard.tsx` | Database deal cards, review feedback and create/edit forms |
| `frontend/src/app/[locale]/(business)/business/` | Server session checks on the layout and individual pages |

## Remaining work and tests

Merchant deal creation/editing, Storage uploads, admin review and business
redemption are implemented. The business verifies the code when providing the
service; the admin portal provides read-only voucher lookup and recent issued/used
lists. See [voucher workflow and limits](voucher-redemption.md). Real payment
processing, settlement and account self-service remain separate work.

Legacy components under `features/portal-demo/` remain design references. Real
business routes use verified server sessions and persisted deals. Admin finance
screens still include demo data.

`backend/tests/merchant-auth.test.ts` covers role/link checks, migration replay,
business isolation, membership deactivation, suspension, logout and voucher
ownership using a stub Auth provider and isolated PostgreSQL. The integration
test requires a fresh `TEST_MERCHANT_AUTH_DATABASE_URL` database named
`vendelia_test_merchantauth` or `vendelia_test_merchantauth_<suffix>`. It creates
fixtures and writes only in that database, never production Supabase.
