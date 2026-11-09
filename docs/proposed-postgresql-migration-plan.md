# Proposed migration from Supabase Postgres to another PostgreSQL instance

Status: **proposed; not implemented or approved for production cutover**.
Prepared: 2026-11-09.

## Objective and scope

Provide a reproducible way to create Vendelia's application tables on another
PostgreSQL instance. The initial objective is structure only; existing production
records are not required for the initial restore exercise. A later move of live
records is a separate migration with backups, reconciliation and cutover controls.

Do not deploy this plan by changing only DATABASE_URL. The current backend still
uses Supabase Auth and Storage and directly joins auth.users in database queries.

The retired public.deal_images bytes table is intentionally excluded from the new
baseline. Photos remain in Supabase Storage. This plan does not delete that table
or any records in the existing Supabase project.

## Export and verification evidence

`backend/sql/schema-postgres.sql` is a schema-only export from PostgreSQL 17.11,
produced by pg_dump 18.6 with public schema selection, deal_images excluded, and
ownership/ACL statements omitted. Treat it as an exported baseline candidate,
not a complete backup or an automatically applied migration.

It contains:

| Object | Count |
| --- | ---: |
| Application tables | 14 |
| Primary keys | 14 |
| Foreign keys | 23 |
| Explicit non-constraint index definitions | 13 |
| User triggers | 3 |
| Tables with RLS enabled | 14 |

No table data, ownership assignments or GRANT/REVOKE statements are included.
No CREATE POLICY statements are present. The timestamp-update function is included.
The export represents the source at export time, not an automatically refreshed
view of the production database.

A fresh isolated local PostgreSQL instance was used to test the original export:

1. The first restore stopped at CREATE SCHEMA public because a fresh database
   already had that schema. The restore ran in one transaction, so partial objects
   were not left behind.
2. A temporary copy using CREATE SCHEMA IF NOT EXISTS public then stopped at the
   profiles.user_id foreign key because auth.users was absent.
3. With a minimal auth.users(id uuid primary key) fixture in the temporary test
   database, the adjusted copy restored all 14 application tables.
4. Tests verified duplicate-key rejection, missing deal/Auth foreign-key rejection,
   invalid deal status and invalid option price rejection, the updated_at trigger,
   and exclusion of deal_images. All restored constraints were validated.
5. Test rows were rolled back. The original export and production database were
   not changed. The temporary Auth fixture is not an authentication implementation.

Temporary local artifacts may disappear; the enduring evidence is this record
and the export. No permanent restore-test automation is added by this document.

## Proposed architecture decision

Recommended first stage: move application Postgres only while retaining hosted
Supabase Auth and Storage. This limits the initial work and avoids simultaneously
replacing credentials, email login and image delivery. It requires backend changes
before the new application database can be used.

| Area | Current implementation | Required decision/change |
| --- | --- | --- |
| Application data | public tables in Supabase Postgres | Restore on target PostgreSQL |
| Identity | Supabase Auth API plus SQL joins to auth.users | Retain Auth API; remove cross-database SQL dependency |
| Profiles and membership | Application UUIDs/roles linked to Auth UUIDs | Preserve user UUIDs and merchant membership |
| Website sessions | Hashed tokens in public.auth_sessions | Retain local session model; preserve revocation behavior |
| Provisioning | Auth Admin API plus application recovery journal | Keep retry/recovery semantics across the two systems |
| Images | Supabase Storage and server redirects | Retain bucket/project configuration initially |
| Financial state | Voucher/order state and payout estimates | Preserve existing behavior; migration does not implement settlement |

If the eventual objective is to leave Supabase entirely, separately choose and
implement an Auth service and object-storage provider, or evaluate self-hosted
Supabase. A PostgreSQL server alone does not replace those services.

## Phase 1: prepare a portable baseline

- Preserve the raw export as source evidence. Create a reviewed installation
  baseline separately rather than silently rewriting migration history.
- Make public schema creation compatible with an empty destination database.
- Resolve the external auth.users foreign key according to the chosen identity
  design. PostgreSQL cannot enforce a foreign key into another server's database.
- Keep profiles.user_id as the identity UUID. Validate that identity through the
  chosen Auth integration rather than inventing fake Auth rows in production.
- Preserve all other required primary/foreign keys, unique/check constraints,
  indexes, comments, triggers, localized JSON fields and integer-cent money fields.
- Exclude deal_images from the baseline; retain deals.image_url/gallery_urls and
  the Storage routes/configuration.
- Review target PostgreSQL/version compatibility, available functions/extensions
  and psql dump-script support. Use a recent compatible psql client for the
  pg_dump 18.6 script, including its restrict/unrestrict commands.

Completion criterion: the reviewed baseline restores in a single transaction on
an empty target without missing schemas, roles or dependencies.

## Phase 2: adapt backend identity access

Relevant files include backend/src/modules/auth/repository.ts, provider.ts,
service.ts, user-provisioner.ts and merchant provisioning modules.

- Replace direct auth.users joins with the selected identity-validation design.
- Preserve confirmed-email, active-profile, role and membership checks.
- Preserve handling of deleted/banned Auth users and session revocation; a UUID
  match or cached profile alone must not grant indefinite access.
- Retain admin/customer/merchant separation and merchant ownership enforcement.
- Retain server-only Auth Admin credentials and retry-safe account provisioning.
- Test account creation, login, logout, deactivation, membership removal,
  suspension and recovery when Auth or the application database is unavailable.

Completion criterion: existing authenticated workflows work against the target
PostgreSQL database without querying a nonexistent auth.users table there.

## Phase 3: destination permissions and migration tracking

- Create an application database and deliberately selected application/migration
  roles. Do not assume Supabase's postgres/anon/authenticated/service_role roles
  exist or blindly recreate their privileged grants.
- Define necessary schema/table/function/sequence permissions and default grants.
- Review RLS: the export enables it on every table but contains no policies.
  A normal non-owner role can therefore be denied even after table grants.
  Choose and test an intentional access model; do not disable RLS globally simply
  to make errors disappear.
- Test authorization in the backend as well as database privileges.
- Introduce migration history/baselining before production use. The current raw
  SQL runner replays historical files; migration 002 still assumes auth.users and
  migration 007 recreates deal_images. Do not run the complete old folder after
  installing a new portable baseline.
- Preserve historical migrations unchanged. Record which history the new baseline
  incorporates and apply only subsequent compatible migrations once tracking is
  implemented.

Completion criterion: least-needed access works, unauthorized requests fail, and
repeated deployment does not replay incompatible historical setup SQL.

## Phase 4: repeatable isolated validation

Use a new database, not the live Supabase project. Validate:

- Expected objects, all validated constraints, defaults, indexes and triggers.
- Required seed/reference rows such as categories/cities. Review any catalogue
  seed before using it; test fixtures are not automatically production records.
- Catalogue, deal options/review and Storage images/uploads.
- Profile/account provisioning, all login audiences and session revocation.
- Orders, voucher generation, PDFs/email, merchant-scoped QR lookup/redemption,
  concurrent redemption/refund protection and admin voucher/refund views.
- Payout preview calculations without inventing settlement/payment history.
- TLS, network access, runtime environment loading, connection limits and health.

Completion criterion: documented automated and HTTPS staging checks pass using
the chosen target roles and intended Auth/Storage integration.

## Phase 5: initial empty deployment or later data migration

For an initial empty installation, restore the reviewed baseline and add only
approved reference/catalogue/account setup data. No customer records need moving.

For a later migration of current records, additionally:

- Take a schema and consistent data backup; store private exports outside Git.
- Preserve UUIDs, foreign-key relationships, money, status and lifecycle timestamps.
- Coordinate a final write freeze or a separately designed replication approach;
  independent dumps during active writes are not a cutover consistency strategy.
- Define restore ordering and verify counts, foreign keys, representative records
  and financial/state invariants before switching traffic.
- Keep Auth and Storage in place for the recommended first stage. A full exit
  needs separate Auth and actual object-file export/reconciliation, not only SQL.
- Keep session-token dumps private; consider invalidating website sessions and
  requiring fresh login as an explicit cutover decision.

## Phase 6: cutover and rollback

- Use an HTTPS staging deployment first and preserve the existing live deployment.
- Back up the destination, record source/target versions and applied baseline.
- Configure the destination DATABASE_URL and the reviewed access/TLS settings.
  Keep Auth, Storage, SMTP and origin variables appropriate to the chosen design.
- Switch production only after verification and a coordinated final sync if data
  is being preserved. Observe application errors, latency and connection usage.
- Roll back before accepting new destination writes if possible. Once the new
  database accepts writes, merely restoring the old connection string can lose
  those writes; define reconciliation or a new write freeze before rollback.
- Retain source exports/backups until the owner explicitly approves cleanup.

## Team/agent instructions

- Current production stays on Supabase until this plan is separately implemented
  and the database owner approves cutover.
- Never apply schema-postgres.sql to the existing production database.
- Never create the minimal auth.users test fixture as a production Auth solution.
- Never commit database passwords, private data dumps or Auth/Storage credentials.
- Do not claim this schema-only export is a full application/data backup.
- Document future baseline, backend and migration-runner changes together.
