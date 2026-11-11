-- Allow independent merchant records (e.g. branches/child businesses) to share a Business ID.
-- Apply before deploying duplicate-ID confirmation. SQL Editor: wrap in BEGIN/COMMIT.
-- Names differ between existing installations, so identify only the relevant unique keys by columns.
DO $$
DECLARE c record;
BEGIN
  FOR c IN
    SELECT con.conrelid::regclass AS table_name, con.conname
    FROM pg_constraint con
    WHERE con.contype = 'u' AND (
      (con.conrelid = 'public.merchants'::regclass AND
        (SELECT array_agg(a.attname::text ORDER BY a.attname)
         FROM unnest(con.conkey) k(attnum) JOIN pg_attribute a ON a.attrelid=con.conrelid AND a.attnum=k.attnum)
          IN (ARRAY['business_id'], ARRAY['business_id', 'country_code']))
      OR (con.conrelid = 'public.merchant_account_provisioning'::regclass AND
        (SELECT array_agg(a.attname::text ORDER BY a.attname)
         FROM unnest(con.conkey) k(attnum) JOIN pg_attribute a ON a.attrelid=con.conrelid AND a.attnum=k.attnum)
          = ARRAY['business_id'])
    )
  LOOP
    EXECUTE format('ALTER TABLE %s DROP CONSTRAINT %I', c.table_name, c.conname);
  END LOOP;
END $$;

CREATE INDEX IF NOT EXISTS merchants_country_business_id_idx ON public.merchants(country_code, business_id);
CREATE INDEX IF NOT EXISTS merchant_provisioning_business_id_idx ON public.merchant_account_provisioning(business_id);
-- Exact non-secret business details + login email identify provisioning retries, not the shared Business ID.
CREATE UNIQUE INDEX IF NOT EXISTS merchant_provisioning_details_hash_idx ON public.merchant_account_provisioning(details_hash);

COMMENT ON COLUMN public.merchants.business_id IS
  'Legal Business ID; may be shared by separate merchant records. Relations/ownership use merchants.id, never this ID.';
