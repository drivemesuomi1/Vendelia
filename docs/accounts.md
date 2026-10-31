# Shared user accounts: database setup

## Scope and implementation status

Migration `backend/sql/migrations/002_profiles.sql` creates **one application table**,
`public.profiles`, for ordinary users, business users and admins. Supabase's existing
`auth.users` manages login identities and passwords. No separate `admin_accounts`
table or password table is needed. Catalogue and purchase tables remain unchanged.

The owner confirmed on 2026-10-31 that the earlier admin-only migration had **not**
been applied. Its unapplied SQL file was replaced by `002_profiles.sql`; use the
new file, not an earlier copy of `002_admin_accounts.sql`. Application of this new
migration is still a separate database-owner step.

Login is now implemented through `backend/src/modules/auth/`. The customer
`/login` form and staff `/admin` form use Supabase Auth password verification,
then require an active profile. The admin form additionally requires `role = 'admin'`.
There is no development admin bypass or environment password login anymore.

Migration `003_auth_sessions.sql` adds a technical session table, **not a second
account table**. Apply it after 002 before trying to log in. It stores SHA-256
hashes of random website session tokens, the profile UUID and creation/expiry
timestamps. Tokens are sent in an HttpOnly, SameSite=Strict cookie (`vd_session`),
Secure in production, with an eight-hour lifetime. Logout deletes the server row.

## One table, three roles

| Column | Purpose |
| --- | --- |
| `user_id` | UUID primary key and foreign key to `auth.users.id`; one profile per identity |
| `display_name` | Person's name, 1–120 characters after trimming |
| `role` | `customer` (default), `merchant`, or `admin` |
| `is_active` | Application access flag, initially true |
| `created_at` | Profile creation timestamp |

| Role stored in database | UI meaning |
| --- | --- |
| `customer` | Ordinary user/customer |
| `merchant` | Business user |
| `admin` | Platform staff |

These values match `shared/src/schemas/auth.ts`. Each identity currently has one
role; a business/admin user does not need a duplicate customer identity. 
API authorization must explicitly decide which capabilities each role receives.
A `merchant` role does not establish ownership of any business. Linking people to
specific `merchants` will require `merchant_members` and ownership checks later.
Business/company details stay in `merchants`, rather than being duplicated here.

Email/passwords remain in Supabase Auth. Deleting an Auth user cascades to that
user's profile. RLS is enabled, grants are revoked from `PUBLIC`, `anon` and
`authenticated`, and no browser policies are created. Trusted server access must
use an appropriately privileged database role. Ordinary users cannot assign or
change their own roles through the Data API.

## Apply and provision accounts

1. In the intended Supabase project, open SQL Editor. Paste the entire
   `002_profiles.sql` file between `BEGIN;` and `COMMIT;`, then run it all together.
   Then apply `003_auth_sessions.sql` the same way.
   Alternatively, use the repository command described in
   [database changes](database-changes.md). Supabase's `auth.users` must exist;
   plain local Postgres fixtures do not include it.
2. In **Authentication → Users**, create the intended user using the dashboard's
   user-creation flow and copy the UUID. Use the appropriate confirmed-email or
   invitation flow. Do not insert credentials directly into `auth.users` with SQL.
3. Insert that user's profile. Replace the UUID, name and role as appropriate:

   ```sql
   INSERT INTO public.profiles (user_id, display_name, role)
   VALUES ('PASTE-AUTH-USER-UUID-HERE'::uuid, 'Your name', 'admin')
   ON CONFLICT (user_id) DO NOTHING;
   ```

   Use `customer` for an ordinary user, `merchant` for a business user and `admin`
   for staff. This statement deliberately does not overwrite an existing role
   or reactivate an existing profile. Run it only through trusted database
   administration; do not commit real credentials or account details to SQL files.
   There is no automatic profile-creation trigger yet. Until registration is
   implemented, create profiles explicitly for each account you want to test.
4. Verify:

   ```sql
   SELECT user_id, display_name, role, is_active, created_at
   FROM public.profiles
   ORDER BY created_at;
   ```

5. Record the environment, migration and application date in the team handoff.
   A file in Git does not prove that SQL has been applied to Supabase.

To change a role or disable an account through trusted administration:

```sql
UPDATE public.profiles
SET role = 'merchant'
WHERE user_id = 'PASTE-AUTH-USER-UUID-HERE'::uuid;

-- Separate operation: disables application access once checked by the backend.
UPDATE public.profiles
SET is_active = false
WHERE user_id = 'PASTE-AUTH-USER-UUID-HERE'::uuid;
```

Profile role and active status are rechecked on protected requests. Disabling a
profile immediately blocks its website session on the next request. This does
not itself ban the user in Supabase Auth or revoke Auth tokens.

## Environment and testing

In `backend/.env` locally, or server environment variables on Vercel, set:

```dotenv
SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
SUPABASE_PUBLISHABLE_KEY=YOUR_PUBLISHABLE_KEY
```

Use the same project as `DATABASE_URL`. The publishable key (or legacy anon key)
is sufficient; no service-role key is needed. Find these values in the Supabase
project's connection/API settings. No extra npm dependency is required: the
backend calls Supabase Auth's password endpoint over HTTPS.

Set `FRONTEND_URL` to the frontend origin if it differs from
`http://localhost:3000`; `PUBLIC_SITE_URL` defaults to `https://www.vendelia.fi`.
Browser Auth POSTs with an Origin header must match one of these origins. Next
server actions use the same backend service. For a separate backend deployment,
set the Auth variables there; with Vercel's in-process API set them in Vercel.
Restart local servers after editing `.env`; redeploy after Vercel setting changes.
Retired `ADMIN_EMAIL`, `ADMIN_PASSWORD_HASH` and `ADMIN_SESSION_SECRET` are ignored
and may be removed. Old `vd_admin` cookies are not accepted as authorization.

After applying both migrations and provisioning the confirmed Auth user/profile:

1. Open `/en/admin` and sign in using the admin user's actual email/password.
   Only active admin profiles enter this area. Customer/merchant profiles are denied.
2. Sign out; refresh a protected page to verify the session no longer works.
3. Log in, then set the profile's `is_active = false` in SQL Editor. The next
   protected request must deny access. Restore the flag explicitly to test again.
4. `/en/login` accepts active, confirmed identities with any supported profile
   role. `/api/auth/me` returns the current profile-derived user, without tokens.
5. `/en/account/vouchers` displays purchases belonging to the signed-in user's
   confirmed email. It returns real records, not the admin portal's sample orders.

Credentials are never inserted into application tables. Account profiles must
currently be provisioned explicitly; public signup, confirmation callbacks,
password recovery UI and account editing are not implemented by this change.
Do not treat the existing registration forms as a working signup workflow.

## Session lifecycle and remaining scope

Admin server pages and `/api/admin/*` operations enforce active admin access.
Cookie values are never accepted as a role assertion; role/active state and the
Auth user's confirmation, deletion and ban status are rechecked in the database.
The per-instance login limiter permits five attempts per email/minute and is
supplemented by Supabase's provider limits; it is not a distributed limiter.

Website sessions are separate from Supabase JWT/refresh sessions: Supabase verifies
the initial credentials, and the backend discards the returned tokens. A Supabase
password change/global Auth sign-out alone does not revoke these website sessions.
For incident response or password recovery, revoke the user's website sessions:

```sql
DELETE FROM public.auth_sessions
WHERE user_id = 'PASTE-AUTH-USER-UUID-HERE'::uuid;
```

Expired rows never authorize requests. They can be cleaned up periodically:

```sql
DELETE FROM public.auth_sessions WHERE expires_at <= now();
```

`auth_sessions` has RLS enabled and browser grants revoked, just like profiles.
Auth user deletion cascades through the profile to these sessions. The existing
DB role must have the necessary access to `auth.users`, `profiles`, `auth_sessions`
and purchase tables; the current privileged Supabase connection supports this.

Business portal localStorage login/workflows remain a separate demo. A merchant
profile can authenticate through `/login`, but merchant membership/ownership
links and replacing the business demo are still pending. Admin sample data and
localStorage writes are not converted to database operations by authentication.

The future `docs/domain/database.dbml` differs from these minimal migrations:
its `profiles.id`, `auth_subject` and `platform_role` are not columns created here.
Runtime code should follow the applied SQL and shared types.

Tests: `backend/tests/auth.test.ts` covers the provider adapter and denial paths.
Its PostgreSQL API test uses `TEST_AUTH_DATABASE_URL` pointing to a **fresh** database
named `vendelia_test_auth` or `vendelia_test_auth_<suffix>`. It creates a minimal
Auth schema fixture (not the real Auth service) and applies the catalogue fixtures and migrations 001/002/003.
It uses a stub password provider, never real credentials or Supabase writes.
Frontend tests cover admin login, cookie handling, role gating and logout.

References: [Supabase user data](https://supabase.com/docs/guides/auth/managing-user-data),
[Supabase row-level security](https://supabase.com/docs/guides/database/postgres/row-level-security).
