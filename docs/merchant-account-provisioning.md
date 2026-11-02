# Create a business and login from the admin portal

## Setup and migration order

Keep `005_merchant_members.sql` unchanged and apply it first. Then apply
`006_merchant_account_provisioning.sql`. The first creates the user/business link;
the second adds a private recovery journal for the multi-step creation process.
These are additions to the existing profiles, sessions and merchants schema, not
replacement account/password tables. Earlier migrations 002–004 must already be
applied. See [database workflow](database-changes.md).

In Supabase SQL Editor, run each complete file between `BEGIN;` and `COMMIT;`, or
use the repository migration command. Deployments do not run SQL automatically.
The coding agent has not applied these files to shared Supabase.

Set the following **server-only** environment variable in `backend/.env` locally
and in Vercel's server environment for the deployed in-process API:

```dotenv
SUPABASE_SECRET_KEY=YOUR_SUPABASE_SECRET_KEY
```

Find/create a secret key under Supabase project Settings → API Keys. A new
`sb_secret_...` key is preferred; the legacy `service_role` JWT is also supported
as the value of this variable. Never prefix the variable with `NEXT_PUBLIC_`,
place the value in SQL, commit it, or give it to browser code. Use the same project
as `DATABASE_URL` and `SUPABASE_URL`. Keep `SUPABASE_PUBLISHABLE_KEY` for ordinary
password sign-in; it does not replace the new admin-only key.

For an external backend, configure the key on that backend instead. Restart local
processes/redeploy after changing environment variables. Without the secret key,
ordinary login and business-only creation still work after the migrations; only
account provisioning is unavailable. No extra npm dependency is required.

## Admin steps

1. Sign into the admin portal and open Add business.
2. Enter the company, Business ID, contact and city/category details.
3. Select **Create business login**. This option is initially off so saving a
   business alone does not silently create an account.
4. Enter a sign-in email and choose/generate a password. Public contact email is
   separate and need not match. Passwords require at least 12 characters and at
   most 72 UTF-8 bytes; Supabase's configured password policy also applies.
5. Submit. On success, the new password is displayed once in component memory
   when the server confirms it was set by this request. Copy/share it securely
   before closing; it cannot be retrieved from Auth afterward. No email is sent
   automatically, and no first-login password-change UI is implemented yet.
6. Sign in at `/en/business` (or the other locale routes) with the new credentials.

The backend creates a confirmed Supabase Auth identity, a merchant profile and an
owner membership. It does not sign the admin out or replace their browser session.
Pending businesses can read their saved deals; suspended businesses cannot sign in.

Leave Create business login unchecked to save only the company record. No Auth
user/profile/membership is created in that mode. The existing manual provisioning
steps in [merchant login](merchant-login.md) remain available for businesses that
already exist: the Add business form does not attach new credentials to an
unrelated existing merchant or Auth identity.

## Implementation

| File | Responsibility |
| --- | --- |
| `shared/src/schemas/merchant.ts` | Base merchant schema plus optional, strictly validated `login: { email, password }` creation input |
| `frontend/src/features/admin/components/ManageBusinesses.tsx` | Explicit create-login option, credential validation and one-time credential display |
| `frontend/src/features/admin/api.ts` | Sends login credentials only when provisioning was selected |
| `backend/src/modules/auth/user-provisioner.ts` | Server-only Supabase Auth admin create/get requests with controlled errors |
| `backend/src/modules/merchants/provisioning.ts` | Orchestrates provisioning and retry behavior without storing secrets |
| `backend/src/modules/merchants/repository.ts` | Journal, transaction locks and atomic merchant/profile/membership writes |
| `backend/src/modules/merchants/service.ts` | Chooses ordinary creation or account provisioning |
| `backend/src/modules/merchants/routes.ts` | Active-admin authorization and HTTP validation |
| `backend/sql/migrations/006_merchant_account_provisioning.sql` | Private recovery-journal schema |

The creation endpoint remains `POST /api/admin/merchants`. Its optional `login`
object contains only `email` and `password`. Role, owner membership and Auth UUIDs
are assigned by the server, never accepted from the browser. Responses include
`merchant` and, for provisioning, `login: { email, passwordSet }`; passwords are
never echoed by the backend.

Supabase Auth hashes/stores credentials. Application SQL, journal rows, localStorage
and logs never receive passwords or password hashes. The frontend holds a password
only while editing or showing a newly issued credential, and clears it on close.
The password provider's response body/errors and secret headers are never logged.

## Transaction boundaries and recovery

Supabase Auth creation cannot participate in the application's SQL transaction.
The implementation uses forward recovery instead of deleting arbitrary Auth users
when an operation fails:

1. Validate references and reserve an operation, business UUID and Auth UUID in a
   durable journal row. A transaction-scoped advisory lock serializes operations
   for the same Finnish Business ID, including ordinary business creation.
2. Get/create the reserved Auth UUID with a server-controlled operation marker.
   Existing users with the same email are rejected; they are not adopted, reset,
   promoted or deleted.
3. In one SQL transaction, create the merchant, merchant profile and owner
   membership and mark the operation complete. An incomplete transaction rolls
   back those application records together.
4. If a timeout occurred after Auth committed, retrying the same operation finds
   the reserved UUID and marker and finishes the application transaction without
   creating another user or setting another password.

The journal has one record per Business ID. Repeated successful submissions with
identical non-secret details return the original merchant, including after a lost
HTTP response. This is creation idempotency, not an edit/reset-password endpoint.
Password values are excluded from the details fingerprint. Changing the password
on a retry does **not** reset an already-created account; `passwordSet=false`
tells the UI to show the original-password notice instead of the newly typed value.

For an incomplete attempt, retry with the original business details/email/password.
A changed payload is rejected with `provisioningConflict`. After a definitive email
or password rejection with no Auth user created at the reserved UUID, correcting
those details is allowed. If connectivity is uncertain, preserve the original
form values; they are not recoverable from the one-way details fingerprint alone.

## Recovery journal

`merchant_account_provisioning` stores the operation ID, Business ID, reserved
merchant/Auth UUIDs, login email, non-secret details fingerprint, initiating admin,
state (`pending`/`complete`), controlled error code and timestamps. The reserved
UUIDs deliberately have no FK to not-yet-created records. RLS is enabled and
browser grants are revoked. Completed rows should remain for retry detection.

Inspect unresolved operations only through trusted database administration:

```sql
SELECT id, business_id, auth_user_id, merchant_id, login_email,
       state, last_error, created_at, updated_at
FROM public.merchant_account_provisioning
WHERE state = 'pending'
ORDER BY created_at;
```

An incomplete Auth identity without a profile/membership cannot use the business
portal. If a job cannot be resumed, review its reserved Auth UUID and application
records before performing any manual cleanup. Never delete a pre-existing user
by email or remove a completed operation as a blanket workaround. Fix the cause
and retry when possible. There is no automatic retry worker in this milestone.

## Verification

- `backend/tests/merchant-provisioning.test.ts` covers input validation, the Auth
  admin adapter, account creation, linked merchant login, concurrent/repeated
  requests, duplicate-email rejection, safe email correction, partial Auth failure
  recovery and lack of passwords in application rows/responses.
- PostgreSQL integration requires a fresh `TEST_PROVISIONING_DATABASE_URL` database
  named `vendelia_test_provisioning` or `vendelia_test_provisioning_<suffix>`. It uses
  a fake Auth admin adapter and synthetic users, never real Supabase writes.
- Existing business-only creation/access-control tests still run with migrations
  005/006 applied to their isolated fixtures.
- Live verification requires applying SQL and configuring the real server key.

References: [Supabase Auth admin API](https://supabase.com/docs/reference/javascript/admin-api),
[createUser](https://supabase.com/docs/reference/javascript/auth-admin-createuser).
