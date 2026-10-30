# Database-backed catalogue

The frontend now reads catalogue data only through Fastify. The old hardcoded
partner catalogue and reference-data fallbacks have been removed from runtime code.
The import snapshot remains in `backend/sql/seed-catalogue.sql` for reproducibility.

## Setup

1. Install dependencies from the repo root: `npm install`.
2. Configure `backend/.env` using `backend/.env.example`. Set DATABASE_URL to the
   Supabase pooler connection URI; never put it in a NEXT_PUBLIC variable.
3. Use the seven existing tables created in Supabase. If importing into an empty
   catalogue, run `backend/sql/seed-catalogue.sql` in Supabase SQL Editor. The seed
   fills missing records, preserves existing values and does not invent past prices.
4. Start both processes with `npm run dev`. Backend dotenv resolves its file
   relative to the database module, so it works from either workspace or repo root.
5. Run `npm run db:check -w backend` for a read-only API smoke check against the
   configured database. It prints reference counts, live deal counts, option counts,
   starting prices and whether cart prices match the database.

## Mapping

| Database data | API | Frontend consumers |
| --- | --- | --- |
| Active cities/categories and live category counts | GET /api/meta | Pickers, filters, navigation, footer city list |
| Live deals + active merchants/categories/cities/options | GET /api/deals | Homepage and browse cards |
| Localized deal text/lists, public merchant contacts, gallery, service area, ordered options/groups | GET /api/deals/:slug | Deal detail and option picker |
| Deal coverage cities | GET /api/deals?city=... | Coverage filters, including all four Cleava cities |
| Current active option prices and deal VAT | POST /api/cart/quote | Cart, drawer and checkout quote |

Only live deals belonging to active merchants with active categories, primary cities,
at least one active coverage city and at least one active option are public. These
rules apply to detail slugs and cart quotes, not just list pages. Draft/hidden slugs
return 404. Metadata counts count each deal once, regardless of coverage row count.
Disabled coverage cities are removed from the city picker and cannot match filters.

Prices are integer EUR cents; VAT is integer basis points. Summary starting prices,
option counts, default option IDs and category counts are calculated from current
rows. Card reference prices correspond to the cheapest active option. Detail also
exposes the deal-level reference, while explicit per-option references (including
null, meaning no reference) take precedence in the option picker. Price-history
rows alone do not establish a merchant's previous 30-day minimum; the unsupported
historical-minimum sentence has been removed from the picker.

The browser sends IDs and quantities. The API rejects malformed identifiers,
quantities outside 1–10, duplicate options and carts over 20 lines. Unknown,
disabled or mismatched option/deal pairs are returned as unavailable. Prices
submitted by a browser are ignored. The existing line-level included-VAT rounding
is retained. All quote items are read in one database statement.

## Freshness and failures

API responses use Cache-Control: no-store and Next server fetches use no-store.
Metadata is deduplicated within a React server render, not globally cached.
Reload a page or navigate to fetch current database rows; already-open pages are
not realtime subscriptions. A database/API outage produces a translated retry
screen, not a fake empty catalogue or an old hardcoded deal. Cart errors do not
fall back to browser pricing.

The health endpoint executes SELECT 1 and reports failure if the database is
unreachable. It does not verify table shape; db:check exercises the real queries.

No additional table, migration or data update is required by this integration.
It matches the existing seven-table schema. Backend runtime access continues
through DATABASE_URL; no browser Data API grants/policies are required. Direct
database roles can bypass RLS, so the API explicitly enforces public visibility.

## What remains configuration

The seven-table schema does not include platform_settings or commission_rules.
Commission, commission VAT, voucher duration and refund window live in backend
environment configuration, returned through /api/meta. Their values are no longer
duplicated in the frontend's fallback metadata. Relevant customer-facing labels
interpolate those values. UI translations, branding and banner artwork/layout stay
in code; they are not merchant catalogue records. Banner photo tags reference their
specific category IDs but only render when those categories exist in API metadata.
Navigation uses database categories, with Cleaning and Chauffeur services grouped
under the desktop Services dropdown. Labels, icons and availability remain database-backed;
the grouping is a presentation rule. Mobile keeps the original direct service links.

Price-history writes, merchant submissions/reviews, accounts, orders, payments,
voucher issuance and settlement are separate workflows and are not implemented by
this read integration. Existing portal screens do not imply working write endpoints.
Do not use the Next admin cookie as backend authorization without implementing
verification. Images remain files served by the frontend; their paths live in DB.

## Tests

`npm run typecheck`, `npm test` and `npm run build` are the standard checks.
Frontend tests verify empty results/404s/outages do not resurrect old data, and cart
items are sent to the API rather than priced locally. Backend unit tests validate
inputs and configuration.

To run the PostgreSQL API suite, supply TEST_DATABASE_URL pointing to a **fresh,
dedicated** database named vendelia_test (or vendelia_test_<suffix>), then run
`npm test -w backend`. The suite creates its fixture tables and seeds them; it
changes prices, cities and publication flags only in that test database. It never
uses DATABASE_URL, never drops tables, and refuses a different database name.
Integration tests are skipped when TEST_DATABASE_URL is absent. Local fixture DDL
matches the catalogue columns/constraints but does not exercise Supabase Data API
permissions. Test database changes do not touch Supabase.
The GitHub Actions check job provisions a fresh Postgres service and runs this suite.

## Deployment

Deploy Fastify on a Node host with DATABASE_URL, API_HOST=0.0.0.0 and FRONTEND_URL set
to https://www.vendelia.fi. Set Vercel's BACKEND_URL to that API's HTTPS origin,
without /api appended, and rebuild/redeploy the frontend so its rewrite is updated.
Server components fetch that origin and browsers use the same-origin /api proxy.
No Supabase credentials belong in the Vercel browser bundle. Local code changes
do not change the public site until the API and frontend are deployed.
