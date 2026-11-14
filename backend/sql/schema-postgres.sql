--
-- PostgreSQL database dump
--

\restrict raymZdbdn6LVnfPpCksVGFICzDLIxEk60gj3nI83MOWLO2TsJyV9f4IEq1rxAod

-- Dumped from database version 17.11
-- Dumped by pg_dump version 18.6

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: public; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA public;


--
-- Name: SCHEMA public; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON SCHEMA public IS 'standard public schema';


--
-- Name: vendelia_set_updated_at(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.vendelia_set_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO ''
    AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: auth_sessions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.auth_sessions (
    token_hash text NOT NULL,
    user_id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    expires_at timestamp with time zone NOT NULL,
    CONSTRAINT auth_sessions_check CHECK ((expires_at > created_at)),
    CONSTRAINT auth_sessions_token_hash_check CHECK ((token_hash ~ '^[a-f0-9]{64}$'::text))
);


--
-- Name: categories; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.categories (
    id text NOT NULL,
    name jsonb NOT NULL,
    icon text NOT NULL,
    sort_order integer DEFAULT 0 NOT NULL,
    active boolean DEFAULT true NOT NULL,
    CONSTRAINT categories_name_check CHECK (((jsonb_typeof(name) = 'object'::text) AND COALESCE(((jsonb_typeof((name -> 'fi'::text)) = 'string'::text) AND (length(TRIM(BOTH FROM (name ->> 'fi'::text))) > 0)), false))),
    CONSTRAINT categories_sort_order_check CHECK ((sort_order >= 0))
);


--
-- Name: cities; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.cities (
    id text NOT NULL,
    name jsonb NOT NULL,
    abbr text NOT NULL,
    country_code text DEFAULT 'FI'::text NOT NULL,
    sort_order integer DEFAULT 0 NOT NULL,
    active boolean DEFAULT true NOT NULL,
    CONSTRAINT cities_country_check CHECK ((country_code = 'FI'::text)),
    CONSTRAINT cities_name_check CHECK (((jsonb_typeof(name) = 'object'::text) AND COALESCE(((jsonb_typeof((name -> 'fi'::text)) = 'string'::text) AND (length(TRIM(BOTH FROM (name ->> 'fi'::text))) > 0)), false))),
    CONSTRAINT cities_sort_order_check CHECK ((sort_order >= 0))
);


--
-- Name: deal_cities; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.deal_cities (
    deal_id uuid NOT NULL,
    city_id text NOT NULL
);


--
-- Name: deal_option_price_history; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.deal_option_price_history (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    option_id uuid NOT NULL,
    price_cents integer NOT NULL,
    effective_at timestamp with time zone NOT NULL,
    recorded_at timestamp with time zone DEFAULT now() NOT NULL,
    source text NOT NULL,
    evidence_ref text,
    CONSTRAINT price_history_evidence_check CHECK (((source <> 'merchant_evidence'::text) OR COALESCE((length(TRIM(BOTH FROM evidence_ref)) > 0), false))),
    CONSTRAINT price_history_price_check CHECK ((price_cents >= 0)),
    CONSTRAINT price_history_source_check CHECK ((source = ANY (ARRAY['platform'::text, 'merchant_evidence'::text])))
);


--
-- Name: deal_options; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.deal_options (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    deal_id uuid NOT NULL,
    label jsonb,
    short_label jsonb,
    group_label jsonb,
    price_cents integer NOT NULL,
    reference_price_cents integer,
    sort_order integer DEFAULT 0 NOT NULL,
    active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT deal_options_labels_check CHECK ((((label IS NULL) OR (jsonb_typeof(label) = 'object'::text)) AND ((short_label IS NULL) OR (jsonb_typeof(short_label) = 'object'::text)) AND ((group_label IS NULL) OR (jsonb_typeof(group_label) = 'object'::text)))),
    CONSTRAINT deal_options_price_check CHECK ((price_cents >= 100)),
    CONSTRAINT deal_options_reference_price_check CHECK (((reference_price_cents IS NULL) OR (reference_price_cents >= 0))),
    CONSTRAINT deal_options_sort_order_check CHECK ((sort_order >= 0))
);


--
-- Name: deals; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.deals (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    merchant_id uuid NOT NULL,
    category_id text NOT NULL,
    city_id text NOT NULL,
    slug text NOT NULL,
    status text DEFAULT 'draft'::text NOT NULL,
    featured boolean DEFAULT false NOT NULL,
    title jsonb NOT NULL,
    base_title jsonb,
    description jsonb NOT NULL,
    restrictions jsonb DEFAULT '{"en": "", "fi": "", "sv": ""}'::jsonb NOT NULL,
    inclusions jsonb DEFAULT '{"en": [], "fi": [], "sv": []}'::jsonb NOT NULL,
    terms jsonb DEFAULT '{"en": [], "fi": [], "sv": []}'::jsonb NOT NULL,
    how_to jsonb DEFAULT '{"en": [], "fi": [], "sv": []}'::jsonb NOT NULL,
    area jsonb DEFAULT '{"en": "", "fi": "", "sv": ""}'::jsonb NOT NULL,
    service_area jsonb,
    street text,
    zip text,
    meeting_point boolean DEFAULT false NOT NULL,
    image_url text NOT NULL,
    gallery_urls text[] DEFAULT ARRAY[]::text[] NOT NULL,
    currency_code text DEFAULT 'EUR'::text NOT NULL,
    vat_bps integer NOT NULL,
    reference_price_cents integer,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    review_note text,
    submitted_at timestamp with time zone,
    reviewed_at timestamp with time zone,
    reviewed_by uuid,
    CONSTRAINT deals_currency_check CHECK ((currency_code = 'EUR'::text)),
    CONSTRAINT deals_description_check CHECK (((jsonb_typeof(description) = 'object'::text) AND COALESCE(((jsonb_typeof((description -> 'fi'::text)) = 'string'::text) AND (length(TRIM(BOTH FROM (description ->> 'fi'::text))) > 0)), false))),
    CONSTRAINT deals_image_url_check CHECK ((length(TRIM(BOTH FROM image_url)) > 0)),
    CONSTRAINT deals_localized_content_check CHECK (((jsonb_typeof(restrictions) = 'object'::text) AND (jsonb_typeof(inclusions) = 'object'::text) AND (jsonb_typeof(terms) = 'object'::text) AND (jsonb_typeof(how_to) = 'object'::text) AND (jsonb_typeof(area) = 'object'::text) AND ((base_title IS NULL) OR (jsonb_typeof(base_title) = 'object'::text)) AND ((service_area IS NULL) OR (jsonb_typeof(service_area) = 'object'::text)))),
    CONSTRAINT deals_reference_price_check CHECK (((reference_price_cents IS NULL) OR (reference_price_cents >= 0))),
    CONSTRAINT deals_review_note_check CHECK (((review_note IS NULL) OR (length(review_note) <= 1000))),
    CONSTRAINT deals_slug_check CHECK ((slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'::text)),
    CONSTRAINT deals_status_check CHECK ((status = ANY (ARRAY['draft'::text, 'pending'::text, 'live'::text, 'rejected'::text]))),
    CONSTRAINT deals_title_check CHECK (((jsonb_typeof(title) = 'object'::text) AND COALESCE(((jsonb_typeof((title -> 'fi'::text)) = 'string'::text) AND (length(TRIM(BOTH FROM (title ->> 'fi'::text))) > 0)), false))),
    CONSTRAINT deals_vat_check CHECK (((vat_bps >= 0) AND (vat_bps <= 10000))),
    CONSTRAINT deals_zip_check CHECK (((zip IS NULL) OR (zip ~ '^[0-9]{5}$'::text)))
);


--
-- Name: COLUMN deals.review_note; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.deals.review_note IS 'Reason given by an admin when a deal is rejected or taken off sale; shown to the business.';


--
-- Name: COLUMN deals.submitted_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.deals.submitted_at IS 'When the business last sent the deal for review (create or edit).';


--
-- Name: merchant_account_provisioning; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.merchant_account_provisioning (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    business_id text NOT NULL,
    merchant_id uuid NOT NULL,
    auth_user_id uuid NOT NULL,
    login_email text NOT NULL,
    details_hash text NOT NULL,
    created_by uuid,
    state text DEFAULT 'pending'::text NOT NULL,
    last_error text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT merchant_account_provisioning_details_hash_check CHECK ((details_hash ~ '^[a-f0-9]{64}$'::text)),
    CONSTRAINT merchant_account_provisioning_state_check CHECK ((state = ANY (ARRAY['pending'::text, 'complete'::text])))
);


--
-- Name: TABLE merchant_account_provisioning; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.merchant_account_provisioning IS 'Private recovery journal for creating merchant/Auth/profile/membership records. UUIDs are reserved before creation; pending rows intentionally have no FK to not-yet-created users/merchants. Never store passwords or password hashes here.';


--
-- Name: merchant_members; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.merchant_members (
    user_id uuid NOT NULL,
    merchant_id uuid NOT NULL,
    member_role text DEFAULT 'owner'::text NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT merchant_members_member_role_check CHECK ((member_role = ANY (ARRAY['owner'::text, 'manager'::text, 'staff'::text])))
);


--
-- Name: TABLE merchant_members; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.merchant_members IS 'Trusted link from a profile to its business. Current portal supports one business per user; multiple staff may share a business. Profile must separately have merchant role.';


--
-- Name: merchants; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.merchants (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    country_code text DEFAULT 'FI'::text NOT NULL,
    business_id text NOT NULL,
    company_name text NOT NULL,
    display_name text NOT NULL,
    public_phone text,
    public_email text,
    website text,
    status text DEFAULT 'pending'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    contact_name text,
    city_id text,
    category_id text,
    CONSTRAINT merchants_business_id_check CHECK ((business_id ~ '^[0-9]{7}-[0-9]$'::text)),
    CONSTRAINT merchants_company_name_check CHECK ((length(TRIM(BOTH FROM company_name)) > 0)),
    CONSTRAINT merchants_contact_name_check CHECK (((contact_name IS NULL) OR ((length(TRIM(BOTH FROM contact_name)) >= 1) AND (length(TRIM(BOTH FROM contact_name)) <= 120)))),
    CONSTRAINT merchants_country_check CHECK ((country_code = 'FI'::text)),
    CONSTRAINT merchants_display_name_check CHECK ((length(TRIM(BOTH FROM display_name)) > 0)),
    CONSTRAINT merchants_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'active'::text, 'suspended'::text])))
);


--
-- Name: COLUMN merchants.contact_name; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.merchants.contact_name IS 'Business contact person; not an Auth account or sign-in name.';


--
-- Name: COLUMN merchants.city_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.merchants.city_id IS 'Primary business city; deal coverage remains in deal_cities.';


--
-- Name: COLUMN merchants.category_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.merchants.category_id IS 'Primary business category; individual deals retain their own category.';


--
-- Name: order_items; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.order_items (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    order_id uuid NOT NULL,
    line_no smallint NOT NULL,
    deal_id uuid NOT NULL,
    option_id uuid NOT NULL,
    qty integer NOT NULL,
    unit_price_cents integer NOT NULL,
    total_cents integer NOT NULL,
    vat_bps integer NOT NULL,
    title jsonb NOT NULL,
    option_label jsonb,
    merchant_name text NOT NULL,
    CONSTRAINT order_items_line_no_check CHECK ((line_no >= 1)),
    CONSTRAINT order_items_qty_check CHECK (((qty >= 1) AND (qty <= 10))),
    CONSTRAINT order_items_total_cents_check CHECK ((total_cents >= 0)),
    CONSTRAINT order_items_unit_price_cents_check CHECK ((unit_price_cents >= 0)),
    CONSTRAINT order_items_vat_bps_check CHECK (((vat_bps >= 0) AND (vat_bps <= 10000)))
);


--
-- Name: orders; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.orders (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    number text NOT NULL,
    status text NOT NULL,
    is_test boolean DEFAULT false NOT NULL,
    locale text NOT NULL,
    email text NOT NULL,
    first_name text NOT NULL,
    last_name text NOT NULL,
    phone text,
    gift_recipient_name text,
    gift_message text,
    newsletter boolean DEFAULT false NOT NULL,
    payment_method text NOT NULL,
    total_cents integer NOT NULL,
    vat_by_rate jsonb DEFAULT '{}'::jsonb NOT NULL,
    currency_code text DEFAULT 'EUR'::text NOT NULL,
    access_token_hash text NOT NULL,
    email_status text DEFAULT 'pending'::text NOT NULL,
    email_sent_at timestamp with time zone,
    email_error text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    paid_at timestamp with time zone,
    CONSTRAINT orders_check CHECK ((is_test = (status = 'test_unpaid'::text))),
    CONSTRAINT orders_currency_code_check CHECK ((currency_code = 'EUR'::text)),
    CONSTRAINT orders_email_check CHECK ((length(TRIM(BOTH FROM email)) > 0)),
    CONSTRAINT orders_email_status_check CHECK ((email_status = ANY (ARRAY['pending'::text, 'sent'::text, 'failed'::text]))),
    CONSTRAINT orders_locale_check CHECK ((locale = ANY (ARRAY['fi'::text, 'sv'::text, 'en'::text]))),
    CONSTRAINT orders_number_check CHECK ((number ~ '^VD-[A-Z2-9]{6}$'::text)),
    CONSTRAINT orders_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'paid'::text, 'failed'::text, 'test_unpaid'::text]))),
    CONSTRAINT orders_total_cents_check CHECK ((total_cents >= 0))
);


--
-- Name: profiles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.profiles (
    user_id uuid NOT NULL,
    display_name text NOT NULL,
    role text DEFAULT 'customer'::text NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT profiles_display_name_check CHECK (((length(TRIM(BOTH FROM display_name)) >= 1) AND (length(TRIM(BOTH FROM display_name)) <= 120))),
    CONSTRAINT profiles_role_check CHECK ((role = ANY (ARRAY['customer'::text, 'merchant'::text, 'admin'::text])))
);


--
-- Name: TABLE profiles; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.profiles IS 'Shared application accounts linked to Supabase Auth. Server must verify identity, active status and role on protected requests.';


--
-- Name: COLUMN profiles.user_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.profiles.user_id IS 'Existing auth.users.id. Create credentials through Supabase Auth, never through this table.';


--
-- Name: COLUMN profiles.role; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.profiles.role IS 'customer = ordinary user; merchant = business user; admin = platform staff. Only trusted server/database administration may assign roles.';


--
-- Name: COLUMN profiles.is_active; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.profiles.is_active IS 'Server-enforced application access flag; does not disable Supabase Auth itself.';


--
-- Name: vouchers; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.vouchers (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    code text NOT NULL,
    qr_payload text NOT NULL,
    order_id uuid NOT NULL,
    order_item_id uuid NOT NULL,
    deal_id uuid NOT NULL,
    option_id uuid NOT NULL,
    merchant_id uuid NOT NULL,
    status text DEFAULT 'active'::text NOT NULL,
    is_test boolean DEFAULT false NOT NULL,
    price_cents integer NOT NULL,
    recipient_name text,
    issued_at timestamp with time zone DEFAULT now() NOT NULL,
    expires_at timestamp with time zone NOT NULL,
    cancellable_until timestamp with time zone,
    redeemed_at timestamp with time zone,
    refunded_at timestamp with time zone,
    CONSTRAINT vouchers_check CHECK ((expires_at > issued_at)),
    CONSTRAINT vouchers_code_check CHECK ((code ~ '^VND-[A-Z2-9]{4}-[A-Z2-9]{4}$'::text)),
    CONSTRAINT vouchers_price_cents_check CHECK ((price_cents >= 0)),
    CONSTRAINT vouchers_status_check CHECK ((status = ANY (ARRAY['active'::text, 'redeemed'::text, 'refunded'::text, 'expired'::text])))
);


--
-- Name: auth_sessions auth_sessions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.auth_sessions
    ADD CONSTRAINT auth_sessions_pkey PRIMARY KEY (token_hash);


--
-- Name: categories categories_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.categories
    ADD CONSTRAINT categories_pkey PRIMARY KEY (id);


--
-- Name: cities cities_abbr_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cities
    ADD CONSTRAINT cities_abbr_key UNIQUE (abbr);


--
-- Name: cities cities_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cities
    ADD CONSTRAINT cities_pkey PRIMARY KEY (id);


--
-- Name: deal_cities deal_cities_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.deal_cities
    ADD CONSTRAINT deal_cities_pkey PRIMARY KEY (deal_id, city_id);


--
-- Name: deal_option_price_history deal_option_price_history_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.deal_option_price_history
    ADD CONSTRAINT deal_option_price_history_pkey PRIMARY KEY (id);


--
-- Name: deal_options deal_options_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.deal_options
    ADD CONSTRAINT deal_options_pkey PRIMARY KEY (id);


--
-- Name: deals deals_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.deals
    ADD CONSTRAINT deals_pkey PRIMARY KEY (id);


--
-- Name: deals deals_slug_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.deals
    ADD CONSTRAINT deals_slug_key UNIQUE (slug);


--
-- Name: merchant_account_provisioning merchant_account_provisioning_auth_user_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.merchant_account_provisioning
    ADD CONSTRAINT merchant_account_provisioning_auth_user_id_key UNIQUE (auth_user_id);


--
-- Name: merchant_account_provisioning merchant_account_provisioning_business_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.merchant_account_provisioning
    ADD CONSTRAINT merchant_account_provisioning_business_id_key UNIQUE (business_id);


--
-- Name: merchant_account_provisioning merchant_account_provisioning_merchant_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.merchant_account_provisioning
    ADD CONSTRAINT merchant_account_provisioning_merchant_id_key UNIQUE (merchant_id);


--
-- Name: merchant_account_provisioning merchant_account_provisioning_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.merchant_account_provisioning
    ADD CONSTRAINT merchant_account_provisioning_pkey PRIMARY KEY (id);


--
-- Name: merchant_members merchant_members_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.merchant_members
    ADD CONSTRAINT merchant_members_pkey PRIMARY KEY (user_id);


--
-- Name: merchants merchants_business_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.merchants
    ADD CONSTRAINT merchants_business_unique UNIQUE (country_code, business_id);


--
-- Name: merchants merchants_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.merchants
    ADD CONSTRAINT merchants_pkey PRIMARY KEY (id);


--
-- Name: order_items order_items_order_id_line_no_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.order_items
    ADD CONSTRAINT order_items_order_id_line_no_key UNIQUE (order_id, line_no);


--
-- Name: order_items order_items_order_id_option_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.order_items
    ADD CONSTRAINT order_items_order_id_option_id_key UNIQUE (order_id, option_id);


--
-- Name: order_items order_items_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.order_items
    ADD CONSTRAINT order_items_pkey PRIMARY KEY (id);


--
-- Name: orders orders_number_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.orders
    ADD CONSTRAINT orders_number_key UNIQUE (number);


--
-- Name: orders orders_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.orders
    ADD CONSTRAINT orders_pkey PRIMARY KEY (id);


--
-- Name: profiles profiles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_pkey PRIMARY KEY (user_id);


--
-- Name: vouchers vouchers_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vouchers
    ADD CONSTRAINT vouchers_code_key UNIQUE (code);


--
-- Name: vouchers vouchers_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vouchers
    ADD CONSTRAINT vouchers_pkey PRIMARY KEY (id);


--
-- Name: auth_sessions_expires_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX auth_sessions_expires_at_idx ON public.auth_sessions USING btree (expires_at);


--
-- Name: auth_sessions_user_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX auth_sessions_user_id_idx ON public.auth_sessions USING btree (user_id);


--
-- Name: deal_cities_city_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX deal_cities_city_idx ON public.deal_cities USING btree (city_id, deal_id);


--
-- Name: deal_options_deal_order_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX deal_options_deal_order_idx ON public.deal_options USING btree (deal_id, sort_order);


--
-- Name: deals_category_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX deals_category_idx ON public.deals USING btree (category_id);


--
-- Name: deals_city_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX deals_city_idx ON public.deals USING btree (city_id);


--
-- Name: deals_live_catalogue_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX deals_live_catalogue_idx ON public.deals USING btree (featured DESC, created_at DESC) WHERE (status = 'live'::text);


--
-- Name: deals_merchant_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX deals_merchant_idx ON public.deals USING btree (merchant_id);


--
-- Name: deals_status_submitted_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX deals_status_submitted_idx ON public.deals USING btree (status, submitted_at);


--
-- Name: merchant_members_merchant_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX merchant_members_merchant_id_idx ON public.merchant_members USING btree (merchant_id);


--
-- Name: order_items_order_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX order_items_order_id_idx ON public.order_items USING btree (order_id);


--
-- Name: price_history_option_source_time_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX price_history_option_source_time_idx ON public.deal_option_price_history USING btree (option_id, source, effective_at DESC);


--
-- Name: vouchers_order_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX vouchers_order_id_idx ON public.vouchers USING btree (order_id);


--
-- Name: deal_options deal_options_set_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER deal_options_set_updated_at BEFORE UPDATE ON public.deal_options FOR EACH ROW EXECUTE FUNCTION public.vendelia_set_updated_at();


--
-- Name: deals deals_set_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER deals_set_updated_at BEFORE UPDATE ON public.deals FOR EACH ROW EXECUTE FUNCTION public.vendelia_set_updated_at();


--
-- Name: merchants merchants_set_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER merchants_set_updated_at BEFORE UPDATE ON public.merchants FOR EACH ROW EXECUTE FUNCTION public.vendelia_set_updated_at();


--
-- Name: auth_sessions auth_sessions_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.auth_sessions
    ADD CONSTRAINT auth_sessions_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(user_id) ON DELETE CASCADE;


--
-- Name: deal_cities deal_cities_city_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.deal_cities
    ADD CONSTRAINT deal_cities_city_id_fkey FOREIGN KEY (city_id) REFERENCES public.cities(id) ON DELETE RESTRICT;


--
-- Name: deal_cities deal_cities_deal_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.deal_cities
    ADD CONSTRAINT deal_cities_deal_id_fkey FOREIGN KEY (deal_id) REFERENCES public.deals(id) ON DELETE CASCADE;


--
-- Name: deal_option_price_history deal_option_price_history_option_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.deal_option_price_history
    ADD CONSTRAINT deal_option_price_history_option_id_fkey FOREIGN KEY (option_id) REFERENCES public.deal_options(id) ON DELETE RESTRICT;


--
-- Name: deal_options deal_options_deal_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.deal_options
    ADD CONSTRAINT deal_options_deal_id_fkey FOREIGN KEY (deal_id) REFERENCES public.deals(id) ON DELETE RESTRICT;


--
-- Name: deals deals_category_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.deals
    ADD CONSTRAINT deals_category_id_fkey FOREIGN KEY (category_id) REFERENCES public.categories(id) ON DELETE RESTRICT;


--
-- Name: deals deals_city_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.deals
    ADD CONSTRAINT deals_city_id_fkey FOREIGN KEY (city_id) REFERENCES public.cities(id) ON DELETE RESTRICT;


--
-- Name: deals deals_merchant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.deals
    ADD CONSTRAINT deals_merchant_id_fkey FOREIGN KEY (merchant_id) REFERENCES public.merchants(id) ON DELETE RESTRICT;


--
-- Name: deals deals_reviewed_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.deals
    ADD CONSTRAINT deals_reviewed_by_fkey FOREIGN KEY (reviewed_by) REFERENCES public.profiles(user_id) ON DELETE SET NULL;


--
-- Name: merchant_account_provisioning merchant_account_provisioning_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.merchant_account_provisioning
    ADD CONSTRAINT merchant_account_provisioning_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.profiles(user_id) ON DELETE SET NULL;


--
-- Name: merchant_members merchant_members_merchant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.merchant_members
    ADD CONSTRAINT merchant_members_merchant_id_fkey FOREIGN KEY (merchant_id) REFERENCES public.merchants(id) ON DELETE RESTRICT;


--
-- Name: merchant_members merchant_members_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.merchant_members
    ADD CONSTRAINT merchant_members_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(user_id) ON DELETE CASCADE;


--
-- Name: merchants merchants_category_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.merchants
    ADD CONSTRAINT merchants_category_id_fkey FOREIGN KEY (category_id) REFERENCES public.categories(id) ON DELETE RESTRICT;


--
-- Name: merchants merchants_city_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.merchants
    ADD CONSTRAINT merchants_city_id_fkey FOREIGN KEY (city_id) REFERENCES public.cities(id) ON DELETE RESTRICT;


--
-- Name: order_items order_items_deal_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.order_items
    ADD CONSTRAINT order_items_deal_id_fkey FOREIGN KEY (deal_id) REFERENCES public.deals(id) ON DELETE RESTRICT;


--
-- Name: order_items order_items_option_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.order_items
    ADD CONSTRAINT order_items_option_id_fkey FOREIGN KEY (option_id) REFERENCES public.deal_options(id) ON DELETE RESTRICT;


--
-- Name: order_items order_items_order_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.order_items
    ADD CONSTRAINT order_items_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.orders(id) ON DELETE CASCADE;


--
-- Name: profiles profiles_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: vouchers vouchers_deal_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vouchers
    ADD CONSTRAINT vouchers_deal_id_fkey FOREIGN KEY (deal_id) REFERENCES public.deals(id) ON DELETE RESTRICT;


--
-- Name: vouchers vouchers_merchant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vouchers
    ADD CONSTRAINT vouchers_merchant_id_fkey FOREIGN KEY (merchant_id) REFERENCES public.merchants(id) ON DELETE RESTRICT;


--
-- Name: vouchers vouchers_option_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vouchers
    ADD CONSTRAINT vouchers_option_id_fkey FOREIGN KEY (option_id) REFERENCES public.deal_options(id) ON DELETE RESTRICT;


--
-- Name: vouchers vouchers_order_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vouchers
    ADD CONSTRAINT vouchers_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.orders(id) ON DELETE CASCADE;


--
-- Name: vouchers vouchers_order_item_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vouchers
    ADD CONSTRAINT vouchers_order_item_id_fkey FOREIGN KEY (order_item_id) REFERENCES public.order_items(id) ON DELETE CASCADE;


--
-- Name: auth_sessions; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.auth_sessions ENABLE ROW LEVEL SECURITY;

--
-- Name: categories; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;

--
-- Name: cities; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.cities ENABLE ROW LEVEL SECURITY;

--
-- Name: deal_cities; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.deal_cities ENABLE ROW LEVEL SECURITY;

--
-- Name: deal_option_price_history; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.deal_option_price_history ENABLE ROW LEVEL SECURITY;

--
-- Name: deal_options; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.deal_options ENABLE ROW LEVEL SECURITY;

--
-- Name: deals; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.deals ENABLE ROW LEVEL SECURITY;

--
-- Name: merchant_account_provisioning; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.merchant_account_provisioning ENABLE ROW LEVEL SECURITY;

--
-- Name: merchant_members; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.merchant_members ENABLE ROW LEVEL SECURITY;

--
-- Name: merchants; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.merchants ENABLE ROW LEVEL SECURITY;

--
-- Name: order_items; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;

--
-- Name: orders; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

--
-- Name: profiles; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

--
-- Name: vouchers; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.vouchers ENABLE ROW LEVEL SECURITY;

--
-- PostgreSQL database dump complete
--

\unrestrict raymZdbdn6LVnfPpCksVGFICzDLIxEk60gj3nI83MOWLO2TsJyV9f4IEq1rxAod


-- 011_refund_requests: customers request refunds, admins approve.
CREATE TABLE IF NOT EXISTS public.refund_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  voucher_id uuid NOT NULL REFERENCES public.vouchers(id) ON DELETE CASCADE,
  requested_by uuid REFERENCES public.profiles(user_id) ON DELETE SET NULL,
  reason text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved')),
  created_at timestamptz NOT NULL DEFAULT now(),
  resolved_at timestamptz
);
CREATE UNIQUE INDEX IF NOT EXISTS refund_requests_one_pending_idx
  ON public.refund_requests(voucher_id) WHERE status = 'pending';
