# First database milestone: the live catalogue

Proposed plan, 30 October 2026. No database changes have been executed.

## Basis and scope

Reviewed the repository, the supplied `Untitled.pdf` database diagram, and the public
HTML for https://www.vendelia.fi/en and its Cleava deal page. This is not a visual
browser test or an inspection of the live database.

The current site has one partner deal, ten purchase options, four service cities,
five categories, three languages, and a gallery. The backend still has only a
health route; its database client exists but is not imported by the server.
Customer, merchant, checkout, voucher and admin screens exist, but their existence
does not mean those workflows have working API implementations.

Build the catalogue first. The first six tables support browsing and server-priced
cart quotes. Add a seventh small table for price history because the current deal
page already makes a specific historical-price claim. Accounts, purchases and
payments remain separate milestones.

## Proposed tables, in creation order

These are proposed columns, not a migration to paste into production. Use SQL
snake_case and map to the existing camelCase shared DTOs in the backend.

### 1. cities

Purpose: populate the city picker and filter deals by service coverage.

- `id text primary key`: keep `helsinki`, `espoo`, `vantaa`, `kauniainen` so current URLs and filters keep working.
- `name jsonb not null`: `{ "fi": "Helsinki", "sv": "Helsingfors", "en": "Helsinki" }`.
- `abbr text not null`: HKI, ESP, VAN, KAU; unique.
- `country_code text not null default 'FI'`: initially constrain to FI.
- `sort_order integer not null default 0`.
- `active boolean not null default true`.

Seed the four existing cities from `frontend/src/lib/fallback-meta.ts`.
A separate countries table is unnecessary for the present Finland-only scope.

### 2. categories

Purpose: drive navigation and deal filtering.

- `id text primary key`: food, beauty, wellness, cleaning, chauffeur.
- `name jsonb not null`: Finnish, Swedish and English names.
- `icon text not null`: existing frontend icon identifier, not arbitrary markup.
- `sort_order integer not null default 0`.
- `active boolean not null default true`.

Seed the five categories from `fallback-meta.ts`. Compute `dealCount` from live
deals; do not store a counter column. Nested categories can wait.

### 3. merchants

Purpose: give every deal a real business owner and populate “Sold by”. It is not a
user account table and does not enable merchant sign-in.

- `id uuid primary key default gen_random_uuid()`.
- `country_code text not null default 'FI'`: initially constrain to FI.
- `business_id text not null`: unique together with country_code.
- `company_name text not null`: legal company name.
- `display_name text not null`: customer-facing trading name.
- `public_phone text`, `public_email text`, `website text`: nullable public contact fields.
- `status text not null default 'pending'`: check pending / active / suspended.
- `created_at timestamptz not null default now()`.
- `updated_at timestamptz not null default now()`: explicitly update on edits.

Do not add passwords, bank details, payment onboarding, staff roles or provider
account IDs yet. Private onboarding contacts can be introduced with registration;
never expose them automatically as public merchant contacts.

Confirm the seed identity first: the live catalogue labels business ID 3631044-9
as Cleava, while the site footer labels that same ID as Mansio Group Oy. These
could be legal/trading names of one entity, but that should be verified, not guessed.

### 4. deals

Purpose: store the current deal page and its publishing state.

- `id uuid primary key default gen_random_uuid()`.
- `merchant_id uuid not null references merchants(id)`.
- `category_id text not null references categories(id)`.
- `city_id text not null references cities(id)`: primary city displayed on cards.
- `slug text not null unique`: existing Cleava slug must be preserved.
- `status text not null default 'draft'`: check draft / pending / live / rejected, matching current DTOs.
- `featured boolean not null default false`.
- `title jsonb not null`, `description jsonb not null`, `restrictions jsonb not null`.
- `base_title jsonb`: nullable, matching the DTO.
- `inclusions jsonb not null`, `terms jsonb not null`, `how_to jsonb not null`: locale-keyed arrays.
- `area jsonb not null`: localized short area text, allowing empty text.
- `service_area jsonb`: nullable localized service description for customer-address services.
- `street text`, `zip text`: nullable for services delivered at the customer's address.
- `meeting_point boolean not null default false`.
- `image_url text not null`: cover image path or URL.
- `gallery_urls text[] not null default '{}'`: ordered additional image paths/URLs.
- `currency_code text not null default 'EUR'`: initially constrain to EUR.
- `vat_bps integer not null`: integer rate, e.g. 2550 means 25.5%; not a decimal money amount.
- `reference_price_cents integer`: nullable deal-level fallback supported by the current DTO.
- `created_at timestamptz not null default now()`, `updated_at timestamptz not null default now()`.

Use JSONB for localized text because the app already expects `{fi, sv, en}`.
Validate its shape with the shared Zod schemas and add basic DB shape checks.
Store real foreign keys and prices in typed columns rather than one giant JSON blob.

Images can stay in `frontend/public/` now. A separate deal_images table and Storage
uploads become useful when merchants manage photos, alt text or galleries themselves.

Do not store `fromPriceCents`, `optionCount`, `defaultOptionId`, `merchantName` or
discount percentage: derive those from options and joins. Map missing street/zip
to the DTO shape when serializing. Require an address or a suitable service-area
description before publishing; do not invent a venue address for Cleava.

### 5. deal_options

Purpose: model each purchasable package independently, including all ten current options.

- `id uuid primary key default gen_random_uuid()`.
- `deal_id uuid not null references deals(id)`.
- `label jsonb`: nullable full localized name.
- `short_label jsonb`: nullable compact label such as “3 h”.
- `group_label jsonb`: nullable group such as Home cleaning / Move-out cleaning.
- `price_cents integer not null`: check >= 100, matching the present input minimum.
- `reference_price_cents integer`: nullable per-option reference override.
- `sort_order integer not null default 0`.
- `active boolean not null default true`.
- `created_at timestamptz not null default now()`, `updated_at timestamptz not null default now()`.

Amounts stay integer EUR cents; 8900 means EUR 89.00. VAT and commission stay
integer basis points. Reject negative reference prices and inconsistent discount
inputs. A reference price alone is not evidence of a historical minimum.

Currency is inherited from the parent deal. Do not mix currencies within a deal.
Retain the current option UUIDs when seeding so existing browser carts still resolve.

### 6. deal_cities

Purpose: represent where a service is available, separately from a business venue.

- `deal_id uuid not null references deals(id)`.
- `city_id text not null references cities(id)`.
- Composite primary key `(deal_id, city_id)`.

Seed four coverage rows for Cleava. `deals.city_id` is its primary display city;
filtering uses deal_cities. Include the primary city in coverage when saving the
deal, in the same transaction. A service city is not a merchant location.
For future venue deals, locations can be introduced without discarding city coverage.

### 7. deal_option_price_history

Purpose: keep a small append-only record of prices before prices become editable.
The current page explicitly says “Lowest price at this business in the last 30 days”.

- `id uuid primary key default gen_random_uuid()`.
- `option_id uuid not null references deal_options(id)`.
- `price_cents integer not null`: check nonnegative.
- `effective_at timestamptz not null`: when that selling price started applying.
- `recorded_at timestamptz not null default now()`: when Vendelia recorded it.
- `source text not null`: check platform / merchant_evidence.
- `evidence_ref text`: nullable private reference to supporting merchant records.

Record the initial actual option price, then append an event on every price change
in the same DB transaction as the option update. No artificial historical dates.
Index `(option_id, source, effective_at)`. Keep merchant evidence distinct from
platform price events; they are not automatically one interchangeable price series.

Starting history today cannot establish the merchant's previous 30 days of prices,
and Vendelia price records alone do not prove all prices charged by that business.
Only show the specific historical-price claim when appropriate evidence supports
it; otherwise suppress that sentence and unsupported discount/reference claims.
This is an evidence limitation, not a legal determination about the applicable rules.
The seventh table can be deferred only if that history-dependent feature is removed
and catalogue price editing remains outside the first milestone.

## Implementation sequence and completion checks

1. Verify the Supabase project/environment and a read-only DB query. Inventory any
   existing tables before applying migrations. Do not reset a database to start this plan.
2. Create `backend/src/db/schema.ts` and `backend/drizzle.config.ts`. Add working
   backend `db:generate` and `db:migrate` scripts; the root currently forwards a
   generation command that the backend does not implement. Keep migration files in Git.
3. Generate/review/apply migration 1 for cities and categories. Seed four cities and
   five categories. Check names, order, IDs and uniqueness in Supabase Table Editor.
4. Generate/review/apply migration 2 for merchants, deals, deal_options, deal_cities
   and price history. Add indexes for foreign keys, city coverage lookups, live-deal
   filters and option ordering; foreign keys do not automatically index referencing columns.
   Use restrictive deletes on merchant/deal/option records with business history and
   deactivate/archive instead. Junction rows may cascade on an intentional parent delete.
5. Seed the confirmed merchant, existing deal, ten options and four coverage rows,
   preserving slug/deal/option IDs from `catalogue.ts`. Seed one initial platform price
   event per option using the actual import time; historical merchant evidence is separate.
   Use an idempotent seed transaction that cannot duplicate records or overwrite later edits.
6. Implement GET `/api/meta`, GET `/api/deals`, GET `/api/deals/:slug`, then POST
   `/api/cart/quote`. Keep existing DTO response shapes. Expose only live deals with
   active merchants/categories/cities/options. A non-published detail slug returns 404.
   Compute counts/prices from the same visibility rules; count distinct deals across joins.
7. Replace hardcoded partner catalogue merging in `features/deals/api.ts` and local
   partner pricing in `features/cart/api.ts`. Otherwise a DB price change or unpublished
   deal can be masked by stale fallback data. Keep public pages clear about API outages.
   Keep IDs/quantities in localStorage; no cart tables are needed.
8. Update shared schemas and the merchant form before enabling catalogue writes:
   the form/schema currently allow only six options, one city, mandatory street/zip,
   and omit option groups/short labels/per-option reference prices/service areas/gallery.
   Fix those contracts together rather than silently losing current content.
9. Verify each city finds Cleava once, only the cleaning category contains it, all
   ten options are returned in order, translations/gallery survive, and a changed DB
   price affects the page and cart after refresh. Verify draft/suspended records are
   hidden even on a direct slug URL. Reject option/deal mismatches and stale/disabled
   options in cart quotes. Add meaningful API/database tests for these behaviors.
10. Deploy the Fastify API and configure Vercel BACKEND_URL. Verify deployed pages
    use the API rather than the old built-in partner catalogue. Confirm real checkout
    remains unavailable until the purchase milestone is complete.

Use Drizzle-generated, reviewed migrations as the schema source of truth. Use
Supabase Table Editor to inspect results, avoiding untracked manual schema edits.

## Access boundaries

Keep Next.js -> Fastify -> Supabase Postgres. No browser DB credentials are needed.
If these tables are in public, explicitly enable RLS in the migrations; SQL-created
tables do not automatically receive Table Editor's RLS defaults. Initially give
anon/authenticated no access policies or unnecessary table grants because browser
Data API access is not part of this architecture. Alternatively, use a private
application schema that is not exposed through the Data API.

Direct connections using an owner/bypass role are not protected by those browser
RLS policies. Fastify must enforce visibility/authorization itself, including the
merchant's status. Restrict runtime DB permissions before opening write workflows.
Never assume the existing Next.js admin cookie automatically authorizes Fastify.

Sources: https://supabase.com/docs/guides/database/postgres/row-level-security and
https://supabase.com/docs/guides/database/drizzle .

## Later milestones, triggered by working features

- Accounts and merchant submissions: choose Supabase Auth before implementing custom
  passwords/sessions; add profiles linked by primary-key FK to auth.users and
  merchant_members with a composite key and owner/manager/staff authorization. Map
  that to current API roles deliberately. Merchant status is separate from user identity.
  Add accepted terms versions and an audit trail alongside real registration/review.
  Supabase guidance: https://supabase.com/docs/guides/auth/managing-user-data .
- Merchant/admin editing: add authenticated submission/review endpoints, reviewed
  publishing and audit_log. Add configurable settings only when their editing screen
  is made functional. Keep current global defaults in server config meanwhile.
- Real purchasing: design orders, immutable order-item content/price/rate snapshots
  (or deal_versions), payments, idempotent verified provider callbacks, vouchers,
  cancellation/refunds, and a reliable delivery/outbox mechanism together. Add durable
  merchant financial records and reconcile payment totals before accepting real money.
  Do not treat live mutable deal rows as the record of what a buyer purchased.
- Redemption and settlement: add redemptions with atomic single-use enforcement,
  redemption abuse controls, ledger_entries, payouts/payout_lines and invoice records
  as required by the selected payment/settlement model. Settlement records must be
  designed before funds move to merchants, not retrofitted after payouts.
- Multiple venues/markets: merchant_locations/deal_locations, countries/currencies,
  dated VAT and commission rules when the actual scope requires them. Do not infer
  tax rates or statutory obligations from this plan's example values.
- Reviews, support tickets, DAC7 exports and advanced reporting: introduce according
  to launch scope and actual obligations; their absence from this catalogue milestone
  is not a conclusion that they can be omitted from a commercial launch.

First acceptance target: the current public catalogue and cart quote are served
from Supabase through Fastify, without hardcoded data concealing database behavior.
