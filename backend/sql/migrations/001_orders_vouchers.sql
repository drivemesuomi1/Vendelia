-- Orders and vouchers for the purchase flow. Additive: the catalogue tables are not changed.
-- Safe to re-run (IF NOT EXISTS). Apply with: npm run db:migrate -w backend

CREATE TABLE IF NOT EXISTS public.orders (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 number text NOT NULL UNIQUE CHECK(number ~ '^VD-[A-Z2-9]{6}$'),
 -- 'test_unpaid': created through the temporary payment bypass; never becomes paid.
 status text NOT NULL CHECK(status IN ('pending','paid','failed','test_unpaid')),
 is_test boolean NOT NULL DEFAULT false,
 locale text NOT NULL CHECK(locale IN ('fi','sv','en')),
 email text NOT NULL CHECK(length(trim(email))>0),
 first_name text NOT NULL, last_name text NOT NULL, phone text,
 gift_recipient_name text, gift_message text,
 newsletter boolean NOT NULL DEFAULT false,
 payment_method text NOT NULL,
 total_cents integer NOT NULL CHECK(total_cents>=0),
 vat_by_rate jsonb NOT NULL DEFAULT '{}'::jsonb,
 currency_code text NOT NULL DEFAULT 'EUR' CHECK(currency_code='EUR'),
 -- SHA-256 of the guest access token; the token itself is only given to the buyer's browser.
 access_token_hash text NOT NULL,
 email_status text NOT NULL DEFAULT 'pending' CHECK(email_status IN ('pending','sent','failed')),
 email_sent_at timestamptz, email_error text,
 created_at timestamptz NOT NULL DEFAULT now(), paid_at timestamptz,
 CHECK(is_test = (status = 'test_unpaid'))
);

CREATE TABLE IF NOT EXISTS public.order_items (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
 line_no smallint NOT NULL CHECK(line_no>=1),
 deal_id uuid NOT NULL REFERENCES public.deals(id) ON DELETE RESTRICT,
 option_id uuid NOT NULL REFERENCES public.deal_options(id) ON DELETE RESTRICT,
 qty integer NOT NULL CHECK(qty BETWEEN 1 AND 10),
 unit_price_cents integer NOT NULL CHECK(unit_price_cents>=0),
 total_cents integer NOT NULL CHECK(total_cents>=0),
 vat_bps integer NOT NULL CHECK(vat_bps BETWEEN 0 AND 10000),
 -- Snapshots, so a voucher keeps what was bought even if the deal text changes later.
 title jsonb NOT NULL, option_label jsonb, merchant_name text NOT NULL,
 UNIQUE(order_id, option_id), UNIQUE(order_id, line_no)
);
CREATE INDEX IF NOT EXISTS order_items_order_id_idx ON public.order_items(order_id);

CREATE TABLE IF NOT EXISTS public.vouchers (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 code text NOT NULL UNIQUE CHECK(code ~ '^VND-[A-Z2-9]{4}-[A-Z2-9]{4}$'),
 qr_payload text NOT NULL,
 order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
 order_item_id uuid NOT NULL REFERENCES public.order_items(id) ON DELETE CASCADE,
 deal_id uuid NOT NULL REFERENCES public.deals(id) ON DELETE RESTRICT,
 option_id uuid NOT NULL REFERENCES public.deal_options(id) ON DELETE RESTRICT,
 merchant_id uuid NOT NULL REFERENCES public.merchants(id) ON DELETE RESTRICT,
 status text NOT NULL DEFAULT 'active' CHECK(status IN ('active','redeemed','refunded','expired')),
 is_test boolean NOT NULL DEFAULT false,
 price_cents integer NOT NULL CHECK(price_cents>=0),
 recipient_name text,
 issued_at timestamptz NOT NULL DEFAULT now(),
 expires_at timestamptz NOT NULL,
 cancellable_until timestamptz,
 redeemed_at timestamptz, refunded_at timestamptz,
 CHECK(expires_at > issued_at)
);
CREATE INDEX IF NOT EXISTS vouchers_order_id_idx ON public.vouchers(order_id);

-- Customer data stays out of Supabase's Data API: the backend connects with a direct
-- database role, so RLS without policies plus revoked grants block only the public API.
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vouchers ENABLE ROW LEVEL SECURITY;
DO $$
DECLARE r text;
BEGIN
 FOREACH r IN ARRAY ARRAY['anon','authenticated'] LOOP
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = r) THEN
   EXECUTE format('REVOKE ALL ON public.orders, public.order_items, public.vouchers FROM %I', r);
  END IF;
 END LOOP;
END $$;
