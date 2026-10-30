# Backend

Fastify API backed by the existing Supabase Postgres catalogue tables.

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
