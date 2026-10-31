-- Website sessions after Supabase Auth verifies credentials. No passwords/tokens in plaintext.
-- Apply after 002_profiles.sql. SQL Editor: wrap the whole file in BEGIN; / COMMIT;.
CREATE TABLE IF NOT EXISTS public.auth_sessions (
  token_hash text PRIMARY KEY CHECK (token_hash ~ '^[a-f0-9]{64}$'),
  user_id uuid NOT NULL REFERENCES public.profiles(user_id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL,
  CHECK (expires_at > created_at)
);
CREATE INDEX IF NOT EXISTS auth_sessions_user_id_idx ON public.auth_sessions(user_id);
CREATE INDEX IF NOT EXISTS auth_sessions_expires_at_idx ON public.auth_sessions(expires_at);
ALTER TABLE public.auth_sessions ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.auth_sessions FROM PUBLIC;
DO $$
DECLARE r text;
BEGIN
  FOREACH r IN ARRAY ARRAY['anon', 'authenticated'] LOOP
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = r) THEN
      EXECUTE format('REVOKE ALL ON TABLE public.auth_sessions FROM %I', r);
    END IF;
  END LOOP;
END $$;
