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
    health/routes.ts             Database health endpoint
```

The call path is `routes -> service -> repository -> database`; mappers convert
query results before services return public DTOs. Routes do not contain SQL, and
repositories do not calculate cart totals or decide HTTP status codes. Shared
request validation and public response types remain in `shared/src`.

Add future implemented features under their own `modules/<feature>/` folders and
register their routes in `app.ts`. The Next.js/Vercel adapter continues to consume
the same exported `buildApp` function, so deployment setup does not change.

Implemented:

- `GET /api/health`: runs a database query.
- `GET /api/meta`: active cities/categories, live counts and server policy settings.
- `GET /api/deals`: current public deals with city/category/search/featured filters.
- `GET /api/deals/:slug`: localized content, merchant, options, images and service area.
- `POST /api/cart/quote`: validates IDs/quantities and quotes current database prices.

Configure `.env` from `.env.example`, then run `npm run dev -w backend` from the
repo root. `npm run db:check -w backend` exercises the API against the configured
database without changing data. Setup, data mapping, test instructions and
deployment details: [database catalogue guide](../docs/database-catalogue.md).

The same app can run inside Next.js on Vercel: set DATABASE_URL in Vercel and
leave BACKEND_URL unset. Next's /api route invokes the Fastify app without starting
a listener. Source code and business rules remain in this backend workspace.

Sign-in, merchant/admin write routes, orders, payments, vouchers and settlement
still need implementations. The remaining contract is [API endpoints](../docs/api/endpoints.md).
Shared schemas and response types are in `shared/src`.
