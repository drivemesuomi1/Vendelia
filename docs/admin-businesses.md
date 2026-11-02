# Admin-created businesses

## Scope

The admin can add a business record, optionally creating its Supabase Auth login
at the same time. `Manage businesses`, its detail page and the overview's business
counts read Supabase through admin-protected APIs. Creation/status changes persist
in `public.merchants`. With **Create business login** selected, the backend also
creates an Auth user, merchant profile and owner membership. Without it, only the
business is saved. See [account provisioning](merchant-account-provisioning.md).

The business portal now has [database-backed login](merchant-login.md), using
separately provisioned Auth users, profiles and merchant membership. Old browser-demo businesses
are not automatically imported. Existing database merchants are listed, including
those without the new optional fields. Deal review/financial demo sections remain
separate; their presence does not imply a working database workflow.

## Code structure

| Location | Responsibility |
| --- | --- |
| `frontend/src/app/[locale]/(admin)/admin/businesses/page.tsx` | Checks admin access and loads persisted businesses |
| `frontend/src/features/admin/components/ManageBusinesses.tsx` | Add drawer, status actions, optional account provisioning and one-time credential display |
| `frontend/src/features/admin/api.ts` | Browser requests for merchant creation and status changes |
| `frontend/src/app/[locale]/(admin)/admin/businesses/[id]/page.tsx` | Loads a persisted business by UUID |
| `frontend/src/features/admin/components/StoredBusinessDetail.tsx` | Displays the saved business details |
| `frontend/src/features/admin/components/AdminOverview.tsx` | Uses database business rows; deal-review metrics remain demo data |
| `frontend/src/features/portal-demo/password.ts` | Generates an initial password in memory; account creation happens only through the server |
| `shared/src/schemas/merchant.ts` | Shared input validation, Business ID check digit, status and DTO types |
| `backend/src/modules/merchants/routes.ts` | HTTP validation, response codes and API handlers |
| `backend/src/modules/merchants/service.ts` | Business operations and duplicate/not-found handling |
| `backend/src/modules/merchants/repository.ts` | Parameterized SQL and active city/category checks |
| `backend/src/app.ts` | Registers the merchants module; enforces the admin session and Origin checks |
| `backend/tests/merchants.test.ts` | Validation and isolated PostgreSQL API tests |

The persisted path is UI → API → routes → service → repository → `merchants`.
When account creation is selected, credentials enter the authorized provisioning
path described in [account provisioning](merchant-account-provisioning.md). They
never enter the merchant insert, journal payload or persistent browser storage.

## Required migration

Apply `backend/sql/migrations/004_merchant_contact_and_classification.sql` before
using the updated business screens. In Supabase SQL Editor, paste the entire file
between `BEGIN;` and `COMMIT;` and run it together. Alternatively use the migration
runner described in [database changes](database-changes.md). This migration adds
three nullable columns to the existing table, preserving existing merchant rows:

| UI field | Database column | Change |
| --- | --- | --- |
| Name shown to customers | `merchants.display_name` | Already exists |
| Registered company name | `merchants.company_name` | Already exists |
| Business ID | `merchants.business_id` | Already exists; unique with country code |
| Contact person | `merchants.contact_name` | New nullable text column |
| Contact email | `merchants.public_email` | Already exists; optional |
| Phone | `merchants.public_phone` | Already exists; optional |
| City | `merchants.city_id` | New nullable FK to `cities.id`, delete restricted |
| Category | `merchants.category_id` | New nullable FK to `categories.id`, delete restricted |
| Initial status | `merchants.status` | Already exists; UI offers active/pending |

`city_id` and `category_id` describe the business's primary classification, not all
its venues or service coverage. Individual deals keep their own city/category and
`deal_cities` coverage. The new fields remain null for existing rows; no guessed
classification or contact name is backfilled. The new API requires contact name,
city and category for new businesses.

The contact email is a **public** contact address and can appear on deal pages or
voucher documents; it is not a sign-in email. An omitted email/phone is stored as
NULL. An email supplied by the admin must be valid; it need not be unique across
businesses.

Sign-in email and Temporary password (including Generate) are now functional when
Create business login is selected. They are required only in that mode. Passwords
are sent to the server for Supabase Auth creation, never to merchant columns or
browser storage. Public contact email remains independent. Newly issued passwords
are displayed once in component memory and emailed with the sign-in email and
portal link to the new login's address; retries never reset an existing password
or send another email.

Apply migrations 005 and 006, then configure the server-only `SUPABASE_SECRET_KEY`
for account provisioning. Ordinary business-only saves need the migration schema
but do not require the new key. See [setup and recovery](merchant-account-provisioning.md).
Pushing/deploying code does not apply SQL. No migration has been applied to shared
Supabase by the coding agent.

## API and authorization

All endpoints require a current, active admin profile through the existing
`/api/admin/*` backend hook. Non-admin users cannot read or mutate these records.
Browser mutations must also pass the existing Origin check.

| Method | Endpoint | Result |
| --- | --- | --- |
| GET | `/api/admin/merchants` | Persisted businesses plus current live/total deal counts |
| GET | `/api/admin/merchants/:id` | One persisted business, or 404 |
| POST | `/api/admin/merchants` | Creates a business and returns it (201) |
| POST | `/api/admin/merchants/:id/status` | Updates status and `updated_at` |

Creation body: `name`, `companyName`, `businessId`, `contactName`, `publicEmail`,
`phone`, `cityId`, `categoryId`, `status`. An optional `login: { email, password }` is handled by the separate provisioning
service; unknown credential/role fields are rejected. Country
code is set by the server to `FI`. Shared validation checks the Finnish Business
ID's format/check digit, required fields, lengths and optional email. SQL verifies
that the selected city/category are currently active. Duplicate Finnish Business
IDs return 409 `business_exists`; unavailable reference rows return 400
`invalidMerchantReference`. Database failures surface as errors, not empty demo data.

Businesses are inserted with generated UUIDs and database timestamps. A business
alone does not create a public deal. Suspending a merchant hides its deals through
the existing public catalogue visibility rules. Status changes are therefore live
business operations; they are not just local UI flags.

## Verification and team handoff

1. Apply migration 004 in the intended project; record environment, filename,
   application date and verification in the handoff.
2. Restart locally or deploy the code, then sign in as an active admin.
3. Open Manage businesses and add a business with a valid Finnish Business ID.
   Leave contact email blank to test the optional field, or supply a public email.
4. Reload the page and inspect Supabase's `merchants` row. Check column mapping;
   With Create business login unchecked, Auth/profiles remain unchanged. When
   selected, verify the new Auth user, merchant profile and owner membership.
5. Open the business's detail page. Check real contacts, status and deal counts.
6. Try the same Business ID again: expect a duplicate error with no second row.
7. Confirm a customer or signed-out client cannot call these admin endpoints.

Automated tests in `backend/tests/merchants.test.ts` exercise schema compatibility,
repeat migration application, mapping/persistence, duplicates, active reference
checks, admin authorization, account suspension and catalogue visibility. Its
integration test requires a fresh `TEST_MERCHANT_DATABASE_URL` database named
`vendelia_test_merchants` or `vendelia_test_merchants_<suffix>`. It creates fixtures
and writes test rows only in that database; never use shared Supabase for this test.

Email invitations, password-management UI, editing/deleting business records, admin notes and
database-backed deal review remain later work. Merchant login and ownership links
are documented in [merchant login](merchant-login.md). The old
`BusinessDetail` component is retained only for the legacy demo; the actual admin
detail route now uses `StoredBusinessDetail`. The password helper is also reused
by the new form for temporary-password generation.
