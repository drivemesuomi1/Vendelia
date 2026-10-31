-- Vendelia initial catalogue seed.
-- Run in Supabase SQL Editor after the seven tables have been created.
-- Snapshot migrated from former frontend/src/features/deals/catalogue.ts and lib/fallback-meta.ts.
-- Checked against https://www.vendelia.fi/en and its Cleava deal page.
-- Preserves existing records rather than overwriting subsequent edits.
-- Company identity is copied from the current catalogue, not independently verified.
-- Image paths refer to files already served by the Next.js frontend.

BEGIN;

DO $seed$
DECLARE
  payload jsonb := $catalogue$
{
  "cities": [
    {
      "id": "helsinki",
      "abbr": "HKI",
      "name": {
        "fi": "Helsinki",
        "sv": "Helsingfors",
        "en": "Helsinki"
      }
    },
    {
      "id": "espoo",
      "abbr": "ESP",
      "name": {
        "fi": "Espoo",
        "sv": "Esbo",
        "en": "Espoo"
      }
    },
    {
      "id": "vantaa",
      "abbr": "VAN",
      "name": {
        "fi": "Vantaa",
        "sv": "Vanda",
        "en": "Vantaa"
      }
    },
    {
      "id": "kauniainen",
      "abbr": "KAU",
      "name": {
        "fi": "Kauniainen",
        "sv": "Grankulla",
        "en": "Kauniainen"
      }
    }
  ],
  "categories": [
    {
      "id": "food",
      "icon": "food",
      "name": {
        "fi": "Ravintolat",
        "sv": "Restauranger",
        "en": "Restaurants"
      }
    },
    {
      "id": "beauty",
      "icon": "sparkle",
      "name": {
        "fi": "Kauneus",
        "sv": "Skönhet",
        "en": "Beauty"
      }
    },
    {
      "id": "wellness",
      "icon": "spa",
      "name": {
        "fi": "Hyvinvointi",
        "sv": "Välmående",
        "en": "Wellbeing"
      }
    },
    {
      "id": "cleaning",
      "icon": "home",
      "name": {
        "fi": "Siivous",
        "sv": "Städning",
        "en": "Cleaning"
      }
    },
    {
      "id": "chauffeur",
      "icon": "car",
      "name": {
        "fi": "Kuljettajapalvelut",
        "sv": "Chaufförstjänster",
        "en": "Chauffeur services"
      }
    }
  ],
  "merchant": {
    "name": "Cleava Siivouspalvelut",
    "companyName": "Cleava Siivouspalvelut",
    "businessId": "3631044-9",
    "phone": "045 187 8083",
    "email": "info@cleava.fi",
    "website": "https://cleava.fi"
  },
  "deal": {
    "id": "c1ea7a00-0000-4000-8000-000000000001",
    "slug": "cleava-kotisiivous-ja-muuttosiivous",
    "featured": true,
    "status": "live",
    "categoryId": "cleaning",
    "cityId": "helsinki",
    "cityIds": [
      "helsinki",
      "espoo",
      "vantaa",
      "kauniainen"
    ],
    "area": {
      "fi": "Espoo, Vantaa ja Kauniainen",
      "sv": "Esbo, Vanda och Grankulla",
      "en": "Espoo, Vantaa & Kauniainen"
    },
    "serviceArea": {
      "fi": "Helsinki, Espoo, Vantaa ja Kauniainen. Siivous tehdään sinun kotonasi tai toimistollasi.",
      "sv": "Helsingfors, Esbo, Vanda och Grankulla. Städningen görs hemma hos dig eller på ditt kontor.",
      "en": "Helsinki, Espoo, Vantaa and Kauniainen. The cleaning is done at your home or office."
    },
    "title": {
      "fi": "Kotisiivous ja ikkunanpesu 3–8 h – myös muuttosiivous",
      "sv": "Hemstädning och fönstertvätt 3–8 h – även flyttstädning",
      "en": "Home cleaning & window washing 3–8 h – move-out cleaning too"
    },
    "baseTitle": null,
    "restrictions": {
      "fi": "Koko pääkaupunkiseutu · välineet ja aineet mukana",
      "sv": "Hela huvudstadsregionen · redskap och medel ingår",
      "en": "Whole capital region · equipment & supplies included"
    },
    "description": {
      "fi": "Luotettava kotisiivous pääkaupunkiseudulla ilman stressiä. Cleavan ammattisiivoojat tulevat kotiisi Helsingissä, Espoossa, Vantaalla tai Kauniaisissa valitsemaksesi ajaksi ja siivoavat juuri ne paikat, jotka sinulle ovat tärkeimmät – viikkosiivouksesta perusteelliseen kotisiivoukseen. Ikkunanpesu sisältyy kotisiivouspaketteihin.\n\nMuutto edessä? Valitse muuttosiivous asunnon koon mukaan, niin asunto luovutetaan siistinä. Siivoojat tuovat kaikki välineet ja aineet mukanaan, joten sinun ei tarvitse valmistella mitään.",
      "sv": "Pålitlig hemstädning i huvudstadsregionen utan stress. Cleavas professionella städare kommer hem till dig i Helsingfors, Esbo, Vanda eller Grankulla för den tid du väljer och städar just det som är viktigast för dig – från veckostädning till grundlig storstädning. Fönstertvätt ingår i hemstädningspaketen.\n\nSka du flytta? Välj flyttstädning efter bostadens storlek så lämnas bostaden i skick. Städarna tar med alla redskap och medel, så du behöver inte förbereda något.",
      "en": "Reliable, stress-free home cleaning in the capital region. Cleava's professional cleaners come to your home in Helsinki, Espoo, Vantaa or Kauniainen for the time you choose and clean exactly what matters most to you – from a weekly tidy-up to a thorough deep clean. Window washing is included in the home cleaning packages.\n\nMoving out? Choose move-out cleaning by apartment size and hand the place over spotless. The cleaners bring all equipment and supplies, so there is nothing for you to prepare."
    },
    "inclusions": {
      "fi": [
        "Ammattisiivooja kotiisi 3, 4, 5, 6 tai 8 tunniksi",
        "Ikkunanpesu sisältyy kotisiivouspaketteihin",
        "Muuttosiivous asunnon koon mukaan, enintään 100 m²",
        "Siivousvälineet ja ympäristöystävälliset aineet mukana",
        "Sinä päätät, mitä valitun ajan puitteissa siivotaan"
      ],
      "sv": [
        "Professionell städare hem till dig i 3, 4, 5, 6 eller 8 timmar",
        "Fönstertvätt ingår i hemstädningspaketen",
        "Flyttstädning efter bostadens storlek, högst 100 m²",
        "Städredskap och miljövänliga medel ingår",
        "Du bestämmer vad som städas inom den valda tiden"
      ],
      "en": [
        "A professional cleaner at your home for 3, 4, 5, 6 or 8 hours",
        "Window washing included in the home cleaning packages",
        "Move-out cleaning by apartment size, up to 100 m²",
        "Cleaning equipment and eco-friendly supplies included",
        "You decide what gets cleaned within the chosen time"
      ]
    },
    "terms": {
      "fi": [
        "Käytettävissä Helsingissä, Espoossa, Vantaalla ja Kauniaisissa",
        "Ostetun ajan ylittävästä osuudesta lisähinta 25 €/h, joka maksetaan suoraan palveluntarjoajalle",
        "Pitkä siivous voidaan toteuttaa kahdella siivoojalla (esim. 8 h = 2 siivoojaa × 4 h)",
        "Ikkunat pestään molemmin puolin, jos ne ovat helposti saavutettavissa",
        "Varaa aika viimeistään 2 viikkoa ennen lahjakortin voimassaolon päättymistä",
        "Peruutukset viimeistään 24 h ennen varattua aikaa",
        "1 lahjakortti / kotitalous tai toimisto"
      ],
      "sv": [
        "Gäller i Helsingfors, Esbo, Vanda och Grankulla",
        "Tid utöver den köpta debiteras 25 €/h och betalas direkt till tjänsteleverantören",
        "En lång städning kan utföras av två städare (t.ex. 8 h = 2 städare × 4 h)",
        "Fönstren tvättas på båda sidor om de är lätt åtkomliga",
        "Boka senast 2 veckor innan presentkortet går ut",
        "Avbokning senast 24 h före bokad tid",
        "1 presentkort / hushåll eller kontor"
      ],
      "en": [
        "Valid in Helsinki, Espoo, Vantaa and Kauniainen",
        "Time beyond what you bought costs €25/h, paid directly to the service provider",
        "Longer cleanings can be done by two cleaners (e.g. 8 h = 2 cleaners × 4 h)",
        "Windows are washed on both sides if they are easy to reach",
        "Book no later than 2 weeks before the voucher expires",
        "Cancel no later than 24 h before your booked time",
        "1 voucher per household or office"
      ]
    },
    "howTo": {
      "fi": [
        "Valitse sopiva vaihtoehto ja osta lahjakortti",
        "Saat lahjakortin sähköpostiisi heti maksun jälkeen – koodi näkyy lahjakortissa",
        "Varaa aika soittamalla 045 187 8083 ja kerro, että sinulla on Vendelia-lahjakortti",
        "Näytä lahjakortti siivoojalle puhelimesta tai tulosteena"
      ],
      "sv": [
        "Välj ett passande alternativ och köp presentkortet",
        "Du får presentkortet till din e-post direkt efter betalningen – koden står på presentkortet",
        "Boka tid på 045 187 8083 och nämn att du har ett Vendelia-presentkort",
        "Visa presentkortet för städaren i telefonen eller utskrivet"
      ],
      "en": [
        "Choose an option and buy the voucher",
        "You get the voucher by email right after payment – the code is printed on it",
        "Book a time by calling 045 187 8083 and mention your Vendelia voucher",
        "Show the voucher to the cleaner on your phone or on paper"
      ]
    },
    "imageUrl": "/deals/cleava/kotisiivous.webp",
    "gallery": [
      "/deals/cleava/tiimi.webp",
      "/deals/cleava/pinnat.webp"
    ],
    "vatBps": 2550,
    "referencePriceCents": 14700,
    "street": "",
    "zip": "",
    "meetingPoint": false,
    "options": [
      {
        "id": "c1ea7a00-0000-4000-8000-000000000101",
        "label": {
          "fi": "3 h kotisiivous",
          "sv": "3 h hemstädning",
          "en": "3 h home cleaning"
        },
        "shortLabel": {
          "fi": "3 h",
          "sv": "3 h",
          "en": "3 h"
        },
        "priceCents": 8900,
        "referencePriceCents": 14700,
        "group": {
          "fi": "Kotisiivous",
          "sv": "Hemstädning",
          "en": "Home cleaning"
        }
      },
      {
        "id": "c1ea7a00-0000-4000-8000-000000000102",
        "label": {
          "fi": "4 h kotisiivous",
          "sv": "4 h hemstädning",
          "en": "4 h home cleaning"
        },
        "shortLabel": {
          "fi": "4 h",
          "sv": "4 h",
          "en": "4 h"
        },
        "priceCents": 11900,
        "referencePriceCents": 19600,
        "group": {
          "fi": "Kotisiivous",
          "sv": "Hemstädning",
          "en": "Home cleaning"
        }
      },
      {
        "id": "c1ea7a00-0000-4000-8000-000000000103",
        "label": {
          "fi": "5 h kotisiivous",
          "sv": "5 h hemstädning",
          "en": "5 h home cleaning"
        },
        "shortLabel": {
          "fi": "5 h",
          "sv": "5 h",
          "en": "5 h"
        },
        "priceCents": 14900,
        "referencePriceCents": 24500,
        "group": {
          "fi": "Kotisiivous",
          "sv": "Hemstädning",
          "en": "Home cleaning"
        }
      },
      {
        "id": "c1ea7a00-0000-4000-8000-000000000104",
        "label": {
          "fi": "6 h kotisiivous",
          "sv": "6 h hemstädning",
          "en": "6 h home cleaning"
        },
        "shortLabel": {
          "fi": "6 h",
          "sv": "6 h",
          "en": "6 h"
        },
        "priceCents": 18900,
        "referencePriceCents": 29400,
        "group": {
          "fi": "Kotisiivous",
          "sv": "Hemstädning",
          "en": "Home cleaning"
        }
      },
      {
        "id": "c1ea7a00-0000-4000-8000-000000000105",
        "label": {
          "fi": "8 h kotisiivous",
          "sv": "8 h hemstädning",
          "en": "8 h home cleaning"
        },
        "shortLabel": {
          "fi": "8 h",
          "sv": "8 h",
          "en": "8 h"
        },
        "priceCents": 23900,
        "referencePriceCents": 39200,
        "group": {
          "fi": "Kotisiivous",
          "sv": "Hemstädning",
          "en": "Home cleaning"
        }
      },
      {
        "id": "c1ea7a00-0000-4000-8000-000000000201",
        "label": {
          "fi": "Muuttosiivous max. 30 m²",
          "sv": "Flyttstädning max. 30 m²",
          "en": "Move-out cleaning max. 30 m²"
        },
        "shortLabel": {
          "fi": "max. 30 m²",
          "sv": "max. 30 m²",
          "en": "max. 30 m²"
        },
        "priceCents": 14900,
        "referencePriceCents": null,
        "group": {
          "fi": "Muuttosiivous",
          "sv": "Flyttstädning",
          "en": "Move-out cleaning"
        }
      },
      {
        "id": "c1ea7a00-0000-4000-8000-000000000202",
        "label": {
          "fi": "Muuttosiivous 31–40 m²",
          "sv": "Flyttstädning 31–40 m²",
          "en": "Move-out cleaning 31–40 m²"
        },
        "shortLabel": {
          "fi": "31–40 m²",
          "sv": "31–40 m²",
          "en": "31–40 m²"
        },
        "priceCents": 17900,
        "referencePriceCents": null,
        "group": {
          "fi": "Muuttosiivous",
          "sv": "Flyttstädning",
          "en": "Move-out cleaning"
        }
      },
      {
        "id": "c1ea7a00-0000-4000-8000-000000000203",
        "label": {
          "fi": "Muuttosiivous 41–60 m²",
          "sv": "Flyttstädning 41–60 m²",
          "en": "Move-out cleaning 41–60 m²"
        },
        "shortLabel": {
          "fi": "41–60 m²",
          "sv": "41–60 m²",
          "en": "41–60 m²"
        },
        "priceCents": 23900,
        "referencePriceCents": null,
        "group": {
          "fi": "Muuttosiivous",
          "sv": "Flyttstädning",
          "en": "Move-out cleaning"
        }
      },
      {
        "id": "c1ea7a00-0000-4000-8000-000000000204",
        "label": {
          "fi": "Muuttosiivous 61–80 m²",
          "sv": "Flyttstädning 61–80 m²",
          "en": "Move-out cleaning 61–80 m²"
        },
        "shortLabel": {
          "fi": "61–80 m²",
          "sv": "61–80 m²",
          "en": "61–80 m²"
        },
        "priceCents": 29900,
        "referencePriceCents": null,
        "group": {
          "fi": "Muuttosiivous",
          "sv": "Flyttstädning",
          "en": "Move-out cleaning"
        }
      },
      {
        "id": "c1ea7a00-0000-4000-8000-000000000205",
        "label": {
          "fi": "Muuttosiivous 81–100 m²",
          "sv": "Flyttstädning 81–100 m²",
          "en": "Move-out cleaning 81–100 m²"
        },
        "shortLabel": {
          "fi": "81–100 m²",
          "sv": "81–100 m²",
          "en": "81–100 m²"
        },
        "priceCents": 36900,
        "referencePriceCents": null,
        "group": {
          "fi": "Muuttosiivous",
          "sv": "Flyttstädning",
          "en": "Move-out cleaning"
        }
      }
    ]
  }
}
$catalogue$::jsonb;
  deal_data jsonb;
  merchant_data jsonb;
  option_data jsonb;
  merchant_key uuid;
  deal_key uuid;
  existing_slug text;
  existing_parent uuid;
  option_position integer := 0;
BEGIN
  -- Serializes concurrent executions of this seed to avoid duplicate initial history.
  PERFORM pg_advisory_xact_lock(763204817);

  IF to_regclass('public.deal_option_price_history') IS NULL THEN
    RAISE EXCEPTION 'Create all seven catalogue tables before running this seed.';
  END IF;

  deal_data := payload -> 'deal';
  merchant_data := payload -> 'merchant';
  deal_key := (deal_data ->> 'id')::uuid;

  -- 1. Reference data. Existing names/statuses/order are preserved.
  INSERT INTO public.cities (id, name, abbr, sort_order)
  SELECT item ->> 'id', item -> 'name', item ->> 'abbr', position::integer
  FROM jsonb_array_elements(payload -> 'cities')
    WITH ORDINALITY AS entries(item, position)
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.categories (id, name, icon, sort_order)
  SELECT item ->> 'id', item -> 'name', item ->> 'icon', position::integer
  FROM jsonb_array_elements(payload -> 'categories')
    WITH ORDINALITY AS entries(item, position)
  ON CONFLICT (id) DO NOTHING;

  -- 2. Merchant. Reuse an existing row with the same Finnish business ID.
  -- The fixed UUID is only used when creating a new merchant.
  INSERT INTO public.merchants (
    id, country_code, business_id, company_name, display_name,
    public_phone, public_email, website, status
  ) VALUES (
    'c1ea7a00-0000-4000-8000-000000000010'::uuid,
    'FI', merchant_data ->> 'businessId',
    merchant_data ->> 'companyName', merchant_data ->> 'name',
    merchant_data ->> 'phone', merchant_data ->> 'email',
    merchant_data ->> 'website', 'active'
  )
  ON CONFLICT (country_code, business_id) DO NOTHING;

  SELECT id INTO STRICT merchant_key
  FROM public.merchants
  WHERE country_code = 'FI'
    AND business_id = merchant_data ->> 'businessId';

  -- Do not silently attach the source UUID to a different existing deal.
  SELECT slug, merchant_id INTO existing_slug, existing_parent
  FROM public.deals WHERE id = deal_key;

  IF FOUND AND (
    existing_slug IS DISTINCT FROM (deal_data ->> 'slug')
    OR existing_parent IS DISTINCT FROM merchant_key
  ) THEN
    RAISE EXCEPTION 'Existing Cleava deal UUID has a different slug or merchant. No seed changes were committed.';
  END IF;

  -- 3. Deal content. Null address is intentional: this service comes to the customer.
  INSERT INTO public.deals (
    id, merchant_id, category_id, city_id, slug, status, featured,
    title, base_title, description, restrictions, inclusions, terms, how_to,
    area, service_area, street, zip, meeting_point,
    image_url, gallery_urls, currency_code, vat_bps, reference_price_cents
  ) VALUES (
    deal_key, merchant_key,
    deal_data ->> 'categoryId', deal_data ->> 'cityId',
    deal_data ->> 'slug', deal_data ->> 'status',
    (deal_data ->> 'featured')::boolean,
    deal_data -> 'title', NULLIF(deal_data -> 'baseTitle', 'null'::jsonb),
    deal_data -> 'description', deal_data -> 'restrictions',
    deal_data -> 'inclusions', deal_data -> 'terms', deal_data -> 'howTo',
    deal_data -> 'area', deal_data -> 'serviceArea',
    NULLIF(deal_data ->> 'street', ''), NULLIF(deal_data ->> 'zip', ''),
    (deal_data ->> 'meetingPoint')::boolean,
    deal_data ->> 'imageUrl',
    ARRAY(SELECT jsonb_array_elements_text(deal_data -> 'gallery')),
    'EUR', (deal_data ->> 'vatBps')::integer,
    (deal_data ->> 'referencePriceCents')::integer
  )
  ON CONFLICT (id) DO NOTHING;

  -- 4. All ten options, retaining the UUIDs used by saved browser carts.
  FOR option_data IN
    SELECT value FROM jsonb_array_elements(deal_data -> 'options')
  LOOP
    option_position := option_position + 1;

    SELECT deal_id INTO existing_parent
    FROM public.deal_options
    WHERE id = (option_data ->> 'id')::uuid;

    IF FOUND AND existing_parent IS DISTINCT FROM deal_key THEN
      RAISE EXCEPTION 'Existing option UUID belongs to another deal. No seed changes were committed.';
    END IF;

    INSERT INTO public.deal_options (
      id, deal_id, label, short_label, group_label,
      price_cents, reference_price_cents, sort_order, active
    ) VALUES (
      (option_data ->> 'id')::uuid, deal_key,
      NULLIF(option_data -> 'label', 'null'::jsonb),
      NULLIF(option_data -> 'shortLabel', 'null'::jsonb),
      NULLIF(option_data -> 'group', 'null'::jsonb),
      (option_data ->> 'priceCents')::integer,
      (option_data ->> 'referencePriceCents')::integer,
      option_position, true
    )
    ON CONFLICT (id) DO NOTHING;
  END LOOP;

  -- 5. Coverage: Helsinki, Espoo, Vantaa and Kauniainen.
  INSERT INTO public.deal_cities (deal_id, city_id)
  SELECT deal_key, value
  FROM jsonb_array_elements_text(deal_data -> 'cityIds')
  ON CONFLICT (deal_id, city_id) DO NOTHING;

  -- 6. Initial actual platform prices, never fictitious past/reference prices.
  -- Use current DB prices if an option already existed and was edited.
  -- Repeat runs do not add duplicate initial history.
  INSERT INTO public.deal_option_price_history (
    option_id, price_cents, effective_at, recorded_at, source, evidence_ref
  )
  SELECT o.id, o.price_cents, now(), now(), 'platform', NULL
  FROM public.deal_options o
  WHERE o.deal_id = deal_key
    AND o.id IN (
      SELECT (value ->> 'id')::uuid
      FROM jsonb_array_elements(deal_data -> 'options')
    )
    AND NOT EXISTS (
      SELECT 1 FROM public.deal_option_price_history h
      WHERE h.option_id = o.id AND h.source = 'platform'
    );

  -- Sanity checks: abort the entire seed if expected relationships are incomplete.
  IF (
    SELECT count(*) FROM public.deal_options
    WHERE deal_id = deal_key AND id IN (
      SELECT (value ->> 'id')::uuid
      FROM jsonb_array_elements(deal_data -> 'options')
    )
  ) <> 10 THEN
    RAISE EXCEPTION 'Expected all ten Cleava options. No seed changes were committed.';
  END IF;

  IF (
    SELECT count(*) FROM public.deal_cities
    WHERE deal_id = deal_key AND city_id IN (
      SELECT jsonb_array_elements_text(deal_data -> 'cityIds')
    )
  ) <> 4 THEN
    RAISE EXCEPTION 'Expected all four Cleava service cities. No seed changes were committed.';
  END IF;
END;
$seed$;

COMMIT;

-- Verification 1: expect 10 options, 4 cities, 2 gallery images and EUR 89.00
-- as the minimum on a fresh import. Existing edits are deliberately preserved.
SELECT
  d.slug,
  d.status,
  m.display_name AS merchant,
  m.status AS merchant_status,
  d.title ->> 'en' AS english_title,
  d.currency_code,
  d.vat_bps,
  (SELECT count(*) FROM public.deal_options o WHERE o.deal_id = d.id) AS options,
  (SELECT count(*) FROM public.deal_cities dc WHERE dc.deal_id = d.id) AS service_cities,
  cardinality(d.gallery_urls) AS additional_images,
  (SELECT min(o.price_cents) FROM public.deal_options o
    WHERE o.deal_id = d.id AND o.active) AS from_price_cents
FROM public.deals d
JOIN public.merchants m ON m.id = d.merchant_id
WHERE d.id = 'c1ea7a00-0000-4000-8000-000000000001'::uuid;

-- Verification 2: inspect all ten options and their current prices/history.
SELECT
  o.id,
  o.group_label ->> 'en' AS option_group,
  o.label ->> 'en' AS option_name,
  o.price_cents,
  o.reference_price_cents,
  o.active,
  (SELECT count(*) FROM public.deal_option_price_history h
    WHERE h.option_id = o.id AND h.source = 'platform') AS platform_price_events
FROM public.deal_options o
WHERE o.deal_id = 'c1ea7a00-0000-4000-8000-000000000001'::uuid
ORDER BY o.sort_order;

-- Verification 3: inspect coverage without multiplying deal/option rows.
SELECT c.id, c.name ->> 'en' AS city
FROM public.deal_cities dc
JOIN public.cities c ON c.id = dc.city_id
WHERE dc.deal_id = 'c1ea7a00-0000-4000-8000-000000000001'::uuid
ORDER BY c.sort_order;
