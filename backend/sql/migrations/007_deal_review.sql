-- Deal submission and review by admins, plus photos uploaded by businesses. Adds columns and one table only;
-- existing deals keep working unchanged. Apply after migrations 001-006.
-- SQL Editor: wrap the whole file in BEGIN; / COMMIT;.
ALTER TABLE public.deals ADD COLUMN IF NOT EXISTS review_note text
  CHECK (review_note IS NULL OR length(review_note) <= 1000);
ALTER TABLE public.deals ADD COLUMN IF NOT EXISTS submitted_at timestamptz;
ALTER TABLE public.deals ADD COLUMN IF NOT EXISTS reviewed_at timestamptz;
ALTER TABLE public.deals ADD COLUMN IF NOT EXISTS reviewed_by uuid REFERENCES public.profiles(user_id) ON DELETE SET NULL;
COMMENT ON COLUMN public.deals.review_note IS 'Reason given by an admin when a deal is rejected or taken off sale; shown to the business.';
COMMENT ON COLUMN public.deals.submitted_at IS 'When the business last sent the deal for review (create or edit).';

CREATE INDEX IF NOT EXISTS deals_status_submitted_idx ON public.deals(status, submitted_at);

CREATE TABLE IF NOT EXISTS public.deal_images (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  merchant_id uuid NOT NULL REFERENCES public.merchants(id) ON DELETE CASCADE,
  content_type text NOT NULL CHECK (content_type IN ('image/jpeg', 'image/png', 'image/webp')),
  data bytea NOT NULL CHECK (octet_length(data) BETWEEN 1 AND 1048576),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS deal_images_merchant_id_idx ON public.deal_images(merchant_id);
COMMENT ON TABLE public.deal_images IS
  'Deal photos uploaded in the business portal (resized in the browser, max 1 MB), served by GET /api/deal-images/:id.';
ALTER TABLE public.deal_images ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.deal_images FROM PUBLIC;
DO $$
DECLARE r text;
BEGIN
  FOREACH r IN ARRAY ARRAY['anon', 'authenticated'] LOOP
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = r) THEN
      EXECUTE format('REVOKE ALL ON TABLE public.deal_images FROM %I', r);
    END IF;
  END LOOP;
END $$;
