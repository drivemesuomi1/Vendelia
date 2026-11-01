-- Support admin-created businesses without creating business login accounts.
-- Existing rows remain unchanged; new fields are nullable for legacy merchants.
-- SQL Editor: wrap the entire file in BEGIN; / COMMIT;.
ALTER TABLE public.merchants
  ADD COLUMN IF NOT EXISTS contact_name text
    CHECK (contact_name IS NULL OR length(trim(contact_name)) BETWEEN 1 AND 120),
  ADD COLUMN IF NOT EXISTS city_id text REFERENCES public.cities(id) ON DELETE RESTRICT,
  ADD COLUMN IF NOT EXISTS category_id text REFERENCES public.categories(id) ON DELETE RESTRICT;

COMMENT ON COLUMN public.merchants.contact_name IS 'Business contact person; not an Auth account or sign-in name.';
COMMENT ON COLUMN public.merchants.city_id IS 'Primary business city; deal coverage remains in deal_cities.';
COMMENT ON COLUMN public.merchants.category_id IS 'Primary business category; individual deals retain their own category.';
-- public_email and public_phone already exist and are used for public contact details.
-- No credentials are stored in merchants, and no Auth users or profiles are created.
