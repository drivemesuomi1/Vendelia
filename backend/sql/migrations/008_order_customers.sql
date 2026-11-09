-- Optional account ownership; guest orders and existing order/voucher rows are preserved.
-- Matches the SQL already applied manually by the database owner.
-- Runner supplies the transaction; use BEGIN/COMMIT around this file in SQL Editor.
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS customer_id uuid
  REFERENCES public.profiles(user_id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS orders_customer_id_idx ON public.orders(customer_id);

COMMENT ON COLUMN public.orders.customer_id IS
  'Purchasing account, assigned by the backend from a verified session. NULL for unlinked guest orders.';
