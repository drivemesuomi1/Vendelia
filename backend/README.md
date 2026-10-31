# Backend

Fastify API backed by the existing Supabase Postgres catalogue tables.

## Structure

```text
src/
  app.ts                         App setup, dependencies, shared hooks and module registration
  server.ts                      Optional standalone HTTP listener
  config.ts                      Platform configuration
  db/index.ts                    Database connection pool
  modules/
    catalogue/
      routes.ts                  GET/POST handlers, validation and HTTP responses
      service.ts                 Catalogue use cases and cart pricing rules
      repository.ts              Parameterized SQL and raw query results
      mapper.ts                  Query rows to public API response objects
      types.ts                   Internal database result types
    auth/
      config.ts                  Auth environment and session cookie settings
      provider.ts                Supabase Auth password verification
      repository.ts              Profile/session SQL
      service.ts                 Login, current identity and logout
      routes.ts                  Auth HTTP handlers
    health/routes.ts             Database health endpoint
    orders/
      routes.ts                  Checkout, guest order/PDF access and voucher lookup
      service.ts                 Transactional order writes, reads and email orchestration
    vouchers/
      pdf.ts                     Voucher PDF rendering
      email.ts                   Email content
      mailer.ts                  SMTP or development file outbox
      text.ts                    Localized voucher wording
sql/migrations/                  Reviewed SQL schema changes, applied separately
scripts/migrate.ts               Runs migration files in filename order
```

The catalogue call path is `routes -> service -> repository -> database`; mappers convert
query results before services return public DTOs. Routes do not contain SQL, and
repositories do not calculate cart totals or decide HTTP status codes. Shared
request validation and public response types remain in `shared/src`.
The orders module currently keeps its SQL in `service.ts`; it does not yet have a
separate repository. Voucher rendering and email code are separate from HTTP routes.

Add future implemented features under their own `modules/<feature>/` folders and
register their routes in `app.ts`. The Next.js/Vercel adapter continues to consume
the same exported `buildApp` function, so deployment setup does not change.

Implemented:

- `POST /api/auth/login`, `POST /api/auth/admin/login`: Auth password verification and profile-gated login.
- `GET /api/auth/me`, `GET /api/auth/config`, `POST /api/auth/logout`: identity, configuration status and logout.
- `GET /api/me/vouchers`: purchases belonging to the current confirmed email.
- `GET /api/health`: runs a database query.
- `GET /api/meta`: active cities/categories, live counts and server policy settings.
- `GET /api/deals`: current public deals with city/category/search/featured filters.
- `GET /api/deals/:slug`: localized content, merchant, options, images and service area.
- `POST /api/cart/quote`: validates IDs/quantities and quotes current database prices.
- `POST /api/orders`: guest test checkout, enabled only by payment bypass configuration.
- `GET /api/orders/:id` and `GET /api/orders/:id/pdf`: require `x-order-token`.
- `GET /api/vouchers/:code` and `POST /api/merchant/vouchers/lookup`: voucher validity lookup.
- `POST /api/merchant/vouchers/redeem`: returns 501 until merchant authentication exists.

Configure `.env` from `.env.example`, then run `npm run dev -w backend` from the
repo root. `npm run db:check -w backend` exercises the API against the configured
database without changing data. Setup, data mapping, test instructions and
deployment details: [database catalogue guide](../docs/database-catalogue.md).

The same app can run inside Next.js on Vercel: set DATABASE_URL in Vercel and
leave BACKEND_URL unset. Next's /api route invokes the Fastify app without starting
a listener. Source code and business rules remain in this backend workspace.

Set up the three purchase tables using [voucher setup](../docs/voucher-flow.md).
Follow [database changes and team workflow](../docs/database-changes.md) when changing SQL.
Migration 002 prepares a shared `profiles` table for customers, business users and
admins, linked to Supabase Auth. Migration 003 adds website sessions.
See [account setup](../docs/accounts.md) for Auth configuration and testing.
Public registration, merchant/admin business-data writes, real payments, redemption and settlement
still need implementations. The broader contract is [API endpoints](../docs/api/endpoints.md);
it includes planned endpoints, not just implemented ones.
Shared schemas and response types are in `shared/src`.
