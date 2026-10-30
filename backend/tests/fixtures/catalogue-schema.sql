-- Isolated integration-test schema matching the Supabase catalogue tables.

CREATE TABLE public.cities (
 id text PRIMARY KEY, name jsonb NOT NULL, abbr text NOT NULL UNIQUE,
 country_code text NOT NULL DEFAULT 'FI' CHECK(country_code='FI'),
 sort_order integer NOT NULL DEFAULT 0 CHECK(sort_order>=0), active boolean NOT NULL DEFAULT true,
 CHECK(jsonb_typeof(name)='object' AND coalesce(jsonb_typeof(name->'fi')='string' AND length(trim(name->>'fi'))>0,false))
);
CREATE TABLE public.categories (
 id text PRIMARY KEY, name jsonb NOT NULL, icon text NOT NULL,
 sort_order integer NOT NULL DEFAULT 0 CHECK(sort_order>=0), active boolean NOT NULL DEFAULT true,
 CHECK(jsonb_typeof(name)='object' AND coalesce(jsonb_typeof(name->'fi')='string' AND length(trim(name->>'fi'))>0,false))
);
CREATE TABLE public.merchants (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), country_code text NOT NULL DEFAULT 'FI' CHECK(country_code='FI'),
 business_id text NOT NULL CHECK(business_id ~ '^[0-9]{7}-[0-9]$'),
 company_name text NOT NULL CHECK(length(trim(company_name))>0),
 display_name text NOT NULL CHECK(length(trim(display_name))>0),
 public_phone text, public_email text, website text,
 status text NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','active','suspended')),
 created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(country_code,business_id)
);
CREATE TABLE public.deals (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 merchant_id uuid NOT NULL REFERENCES public.merchants(id) ON DELETE RESTRICT,
 category_id text NOT NULL REFERENCES public.categories(id) ON DELETE RESTRICT,
 city_id text NOT NULL REFERENCES public.cities(id) ON DELETE RESTRICT,
 slug text NOT NULL UNIQUE CHECK(slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
 status text NOT NULL DEFAULT 'draft' CHECK(status IN ('draft','pending','live','rejected')),
 featured boolean NOT NULL DEFAULT false,
 title jsonb NOT NULL, base_title jsonb, description jsonb NOT NULL,
 restrictions jsonb NOT NULL DEFAULT '{"fi":"","sv":"","en":""}',
 inclusions jsonb NOT NULL DEFAULT '{"fi":[],"sv":[],"en":[]}',
 terms jsonb NOT NULL DEFAULT '{"fi":[],"sv":[],"en":[]}',
 how_to jsonb NOT NULL DEFAULT '{"fi":[],"sv":[],"en":[]}',
 area jsonb NOT NULL DEFAULT '{"fi":"","sv":"","en":""}', service_area jsonb,
 street text, zip text CHECK(zip IS NULL OR zip ~ '^[0-9]{5}$'),
 meeting_point boolean NOT NULL DEFAULT false,
 image_url text NOT NULL CHECK(length(trim(image_url))>0),
 gallery_urls text[] NOT NULL DEFAULT ARRAY[]::text[],
 currency_code text NOT NULL DEFAULT 'EUR' CHECK(currency_code='EUR'),
 vat_bps integer NOT NULL CHECK(vat_bps BETWEEN 0 AND 10000),
 reference_price_cents integer CHECK(reference_price_cents IS NULL OR reference_price_cents>=0),
 created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
 CHECK(jsonb_typeof(title)='object' AND coalesce(jsonb_typeof(title->'fi')='string' AND length(trim(title->>'fi'))>0,false)),
 CHECK(jsonb_typeof(description)='object' AND coalesce(jsonb_typeof(description->'fi')='string' AND length(trim(description->>'fi'))>0,false)),
 CHECK(jsonb_typeof(restrictions)='object' AND jsonb_typeof(inclusions)='object'
 AND jsonb_typeof(terms)='object' AND jsonb_typeof(how_to)='object' AND jsonb_typeof(area)='object'
 AND (base_title IS NULL OR jsonb_typeof(base_title)='object')
 AND (service_area IS NULL OR jsonb_typeof(service_area)='object'))
);
CREATE TABLE public.deal_options (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 deal_id uuid NOT NULL REFERENCES public.deals(id) ON DELETE RESTRICT,
 label jsonb, short_label jsonb, group_label jsonb,
 price_cents integer NOT NULL CHECK(price_cents>=100),
 reference_price_cents integer CHECK(reference_price_cents IS NULL OR reference_price_cents>=0),
 sort_order integer NOT NULL DEFAULT 0 CHECK(sort_order>=0), active boolean NOT NULL DEFAULT true,
 created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
 CHECK((label IS NULL OR jsonb_typeof(label)='object')
 AND (short_label IS NULL OR jsonb_typeof(short_label)='object')
 AND (group_label IS NULL OR jsonb_typeof(group_label)='object'))
);
CREATE TABLE public.deal_cities (
 deal_id uuid NOT NULL REFERENCES public.deals(id) ON DELETE CASCADE,
 city_id text NOT NULL REFERENCES public.cities(id) ON DELETE RESTRICT, PRIMARY KEY(deal_id,city_id)
);
CREATE TABLE public.deal_option_price_history (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 option_id uuid NOT NULL REFERENCES public.deal_options(id) ON DELETE RESTRICT,
 price_cents integer NOT NULL CHECK(price_cents>=0), effective_at timestamptz NOT NULL,
 recorded_at timestamptz NOT NULL DEFAULT now(), source text NOT NULL CHECK(source IN ('platform','merchant_evidence')),
 evidence_ref text, CHECK(source<>'merchant_evidence' OR coalesce(length(trim(evidence_ref))>0,false))
);
