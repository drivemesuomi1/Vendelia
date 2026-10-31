-- One shared account profile for customers, business users and admins.
-- Supabase Auth manages email/passwords; this table manages app roles.
-- Requires auth.users. SQL Editor: wrap the entire file in BEGIN; / COMMIT;.
-- CLI: npm run db:migrate -w backend wraps each file in a transaction.
-- No users are created or promoted; no login handlers are changed by this SQL.

CREATE TABLE IF NOT EXISTS public.profiles (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name text NOT NULL CHECK (length(trim(display_name)) BETWEEN 1 AND 120),
  role text NOT NULL DEFAULT 'customer'
    CHECK (role IN ('customer', 'merchant', 'admin')),
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.profiles IS
  'Shared application accounts linked to Supabase Auth. Server must verify identity, active status and role on protected requests.';
COMMENT ON COLUMN public.profiles.user_id IS
  'Existing auth.users.id. Create credentials through Supabase Auth, never through this table.';
COMMENT ON COLUMN public.profiles.role IS
  'customer = ordinary user; merchant = business user; admin = platform staff. Only trusted server/database administration may assign roles.';
COMMENT ON COLUMN public.profiles.is_active IS
  'Server-enforced application access flag; does not disable Supabase Auth itself.';

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.profiles FROM PUBLIC;

-- No browser policies: prevents self-promotion and changes to account access flags.
DO $$
DECLARE r text;
BEGIN
  FOREACH r IN ARRAY ARRAY['anon', 'authenticated'] LOOP
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = r) THEN
      EXECUTE format('REVOKE ALL ON TABLE public.profiles FROM %I', r);
    END IF;
  END LOOP;
END $$;
