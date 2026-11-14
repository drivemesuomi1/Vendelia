-- Customers request refunds; only an admin can approve (the refund itself is recorded on the voucher).
-- Runner supplies the transaction; wrap in BEGIN/COMMIT in Supabase SQL Editor.
CREATE TABLE IF NOT EXISTS public.refund_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  voucher_id uuid NOT NULL REFERENCES public.vouchers(id) ON DELETE CASCADE,
  requested_by uuid REFERENCES public.profiles(user_id) ON DELETE SET NULL,
  reason text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved')),
  created_at timestamptz NOT NULL DEFAULT now(),
  resolved_at timestamptz
);

-- One open request per voucher.
CREATE UNIQUE INDEX IF NOT EXISTS refund_requests_one_pending_idx
  ON public.refund_requests(voucher_id) WHERE status = 'pending';
