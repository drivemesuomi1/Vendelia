-- Record the account and role that performed redemption. Existing history is unknown.
-- Runner supplies the transaction; wrap in BEGIN/COMMIT in Supabase SQL Editor.
ALTER TABLE public.vouchers
  ADD COLUMN IF NOT EXISTS redeemed_by uuid REFERENCES public.profiles(user_id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS redeemed_by_role text CHECK (redeemed_by_role IN ('admin', 'merchant'));

CREATE INDEX IF NOT EXISTS vouchers_redeemed_by_idx ON public.vouchers(redeemed_by);

COMMENT ON COLUMN public.vouchers.redeemed_by IS
  'Verified profile that performed redemption. NULL for historical rows or deleted profiles.';
COMMENT ON COLUMN public.vouchers.redeemed_by_role IS
  'Role at redemption: admin or merchant. Historical redemptions remain NULL (unknown).';
