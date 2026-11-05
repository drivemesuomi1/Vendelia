# Deal image storage

New merchant uploads use a public Supabase Storage bucket. Migration 007's
`public.deal_images` table is retained in the owner's database for now, but the
running application no longer reads or writes it. Do not edit historical migration 007.
No new SQL migration is required for this transition. The `deals.image_url` and
`gallery_urls` columns continue storing site-relative URLs.

## Configuration

1. In the same Supabase project as Auth/database, open Storage and select the
   bucket. Its exact ID/name here is `Vendelia Main`. Set it to **Public**.
   Uploaded draft photos are publicly readable too; do not upload confidential files.
2. Recommended bucket restrictions: allowed MIME types `image/jpeg`, `image/png`,
   `image/webp`; maximum file size 1 MiB (1048576 bytes).
3. Add to `backend/.env` locally and the server environment in Vercel:

   ```dotenv
   SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
   SUPABASE_SECRET_KEY=YOUR_SERVER_SECRET_KEY
   SUPABASE_STORAGE_BUCKET="Vendelia Main"
   ```

   Reuse the server secret already used for business account provisioning (new
   secret key or legacy service-role JWT). Never use `NEXT_PUBLIC_` for it.
   In Vercel enter `Vendelia Main` as the value without surrounding quotes.
   Restart local processes; redeploy Vercel after changing environment variables.
   With a separate backend, configure these variables on that backend instead.
4. No browser upload/insert policy is needed: uploads use the server credential
   after the existing website session, business role and Origin checks.
   Do not grant anonymous writes. The bucket's public setting allows reads.

## Request and file structure

- `backend/src/modules/deals/storage.ts`: server-only Storage REST adapter,
  immutable UUID object names under `<merchant UUID>/<image UUID>`. Bucket names
  are URL-encoded, including spaces. No additional SDK dependency.
- `backend/src/modules/deals/routes.ts`: validates JPEG/PNG/WebP bytes and size,
  then uploads to Storage. Missing configuration, private buckets and provider
  failures refuse uploads; there is no fallback to new database image writes.
- `POST /api/merchant/uploads`: unchanged JSON `{ contentType, data }`, where
  `data` is base64. Returns `{ url: '/api/deal-images/storage/<merchant>/<image>' }`.
- `GET /api/deal-images/storage/:merchantId/:imageId`: public redirect to the
  configured bucket's public object URL. Supabase serves the actual bytes. Site
  paths preserve gallery validation and work in local, preview and production.
- `GET /api/deal-images/:id`: retired; returns HTTP 410 (`image_retired`)
  without querying PostgreSQL. Previously saved old links no longer serve images.
- Bundled `/deals/...` images and other existing image URLs are unchanged.

The redirect target depends on the bucket and project configuration. Do not
rename/change them after uploads without moving objects too. Files are uploaded
before a deal is saved: abandoned uploads/removals can leave unused objects.
Automatic garbage collection and Storage deletion on merchant deletion are not
implemented. The legacy table's cascading FK does not delete Storage objects.

## Completed transition and retained table

The owner ran the explicit image-copy migration and confirmed migrated deal
references now use Storage paths. The one-off `images:migrate` command and its
script have been retired. No automatic database deletion is performed.

Before deploying this cleanup to another environment, confirm that it has no
remaining deal cover/gallery references to the old `/api/deal-images/<UUID>`
addresses. Any remaining references must be migrated before deployment. Old
bookmarks/other historical links return 410; there is no database image fallback.
For an environment that still needs migration, recover the maintenance script
from the earlier Storage-transition revision in version control.

Retain `deal_images` and its bytes for now as requested by the database owner.
They still consume database space. Dropping the table later requires a reviewed
new migration, a backup, reference checks and deployment coordination; do not add
a drop migration merely to accompany this code cleanup. Migration 007 remains
historical and the current migration runner can recreate its table when replayed.

## Verification

Upload a photo from a signed-in business, save the deal, reload, and open its
preview/gallery. Check that the bucket has `<merchant UUID>/<image UUID>` and the
saved deal URLs start with `/api/deal-images/storage/`. New uploads should not
create any `public.deal_images` rows. Old image URLs should return HTTP 410. Test an anonymous upload: it must return 401.

Automated checks: `node --import tsx backend/tests/deal-storage.test.ts`
checks credential handling, public-bucket enforcement, errors, upload auth/type
validation, redirects and retired URLs without repository access, using mocked
Storage (no remote writes).
`deals.test.ts` retains dedicated test-database compatibility coverage and skips
that integration case unless `TEST_DEALS_DATABASE_URL` is explicitly configured.

## Upload returns 503

- `imageStorageNotConfigured`: verify `SUPABASE_STORAGE_BUCKET`, `SUPABASE_URL`
  and `SUPABASE_SECRET_KEY` in the running server environment. Example files do
  not configure the app. Fully restart local processes after `.env` changes;
  redeploy after changing Vercel environment variables.
- `imageStorageBucketMustBePublic`: the bucket exists but is private. In Supabase
  Storage, open the deal-photo bucket settings and enable Public access. This
  makes every object in that bucket readable; use a bucket dedicated to public
  deal photos.
- `imageStorageUnavailable`: check the exact bucket ID, server credentials and
  connectivity. Do not expose credentials in screenshots or logs.

The photo manager shows these codes as translated messages in English, Finnish
and Swedish rather than falling back to the generic validation error.
