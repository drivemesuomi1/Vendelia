-- Durable recovery for admin-created business accounts. No passwords or tokens are stored.
-- Apply after 005_merchant_members.sql. SQL Editor: wrap in BEGIN; / COMMIT;.
CREATE TABLE IF NOT EXISTS public.merchant_account_provisioning (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id text NOT NULL UNIQUE,
  merchant_id uuid NOT NULL UNIQUE,
  auth_user_id uuid NOT NULL UNIQUE,
  login_email text NOT NULL,
  details_hash text NOT NULL CHECK (details_hash ~ '^[a-f0-9]{64}$'),
  created_by uuid REFERENCES public.profiles(user_id) ON DELETE SET NULL,
  state text NOT NULL DEFAULT 'pending' CHECK (state IN ('pending', 'complete')),
  last_error text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
COMMENT ON TABLE public.merchant_account_provisioning IS
  'Private recovery journal for creating merchant/Auth/profile/membership records. UUIDs are reserved before creation; pending rows intentionally have no FK to not-yet-created users/merchants. Never store passwords or password hashes here.';
ALTER TABLE public.merchant_account_provisioning ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.merchant_account_provisioning FROM PUBLIC;
DO $$
DECLARE r text;
BEGIN
  FOREACH r IN ARRAY ARRAY['anon', 'authenticated'] LOOP
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = r) THEN
      EXECUTE format('REVOKE ALL ON TABLE public.merchant_account_provisioning FROM %I', r);
    END IF;
  END LOOP;
END $$;
