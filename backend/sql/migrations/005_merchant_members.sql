-- Link business login identities to business records. No passwords or Auth users are created.
-- Apply after migrations 002/003; existing merchants are reused.
-- SQL Editor: wrap the whole file in BEGIN; / COMMIT;.
CREATE TABLE IF NOT EXISTS public.merchant_members (
  user_id uuid PRIMARY KEY REFERENCES public.profiles(user_id) ON DELETE CASCADE,
  merchant_id uuid NOT NULL REFERENCES public.merchants(id) ON DELETE RESTRICT,
  member_role text NOT NULL DEFAULT 'owner' CHECK (member_role IN ('owner', 'manager', 'staff')),
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS merchant_members_merchant_id_idx ON public.merchant_members(merchant_id);
COMMENT ON TABLE public.merchant_members IS
  'Trusted link from a profile to its business. Current portal supports one business per user; multiple staff may share a business. Profile must separately have merchant role.';
ALTER TABLE public.merchant_members ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.merchant_members FROM PUBLIC;
DO $$
DECLARE r text;
BEGIN
  FOREACH r IN ARRAY ARRAY['anon', 'authenticated'] LOOP
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = r) THEN
      EXECUTE format('REVOKE ALL ON TABLE public.merchant_members FROM %I', r);
    END IF;
  END LOOP;
END $$;
