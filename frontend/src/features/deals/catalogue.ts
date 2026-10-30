import type { CartItemInput, CartLineDTO, CartQuoteDTO, DealDetailDTO, DealQuery, DealSummaryDTO, LocalizedText } from "@vendelia/shared";

/**
 * Partner deals that ship with the frontend, so the catalogue is not empty while the backend is
 * still being built. They are merged with whatever the API returns (API wins on a slug clash).
 * Cart pricing for them is computed here; checkout still needs the API.
 */
interface PartnerDeal extends DealDetailDTO {
  featured: boolean;
  /** Every city the service covers, for the city filter (cityId is the one shown on cards). */
  cityIds: string[];
}

const all = (fi: string, sv: string, en: string): LocalizedText => ({ fi, sv, en });

const CLEAVA_HOME = all("Kotisiivous", "Hemstädning", "Home cleaning");
const CLEAVA_MOVE = all("Muuttosiivous", "Flyttstädning", "Move-out cleaning");

const cleavaHours = (n: number, price: number, ref: number, id: string) => ({
  id,
  label: all(`${n} h kotisiivous`, `${n} h hemstädning`, `${n} h home cleaning`),
  shortLabel: all(`${n} h`, `${n} h`, `${n} h`),
  priceCents: price,
  referencePriceCents: ref,
  group: CLEAVA_HOME,
});

const cleavaMove = (size: string, price: number, id: string) => ({
  id,
  label: all(`Muuttosiivous ${size} m²`, `Flyttstädning ${size} m²`, `Move-out cleaning ${size} m²`),
  shortLabel: all(`${size} m²`, `${size} m²`, `${size} m²`),
  priceCents: price,
  referencePriceCents: null,
  group: CLEAVA_MOVE,
});

export const PARTNER_DEALS: PartnerDeal[] = [
  {
    id: "c1ea7a00-0000-4000-8000-000000000001",
    slug: "cleava-kotisiivous-ja-muuttosiivous",
    featured: true,
    status: "live",
    categoryId: "cleaning",
    cityId: "helsinki",
    cityIds: ["helsinki", "espoo", "vantaa", "kauniainen"],
    area: all("Espoo, Vantaa ja Kauniainen", "Esbo, Vanda och Grankulla", "Espoo, Vantaa & Kauniainen"),
    serviceArea: all(
      "Helsinki, Espoo, Vantaa ja Kauniainen. Siivous tehdään sinun kotonasi tai toimistollasi.",
      "Helsingfors, Esbo, Vanda och Grankulla. Städningen görs hemma hos dig eller på ditt kontor.",
      "Helsinki, Espoo, Vantaa and Kauniainen. The cleaning is done at your home or office.",
    ),
    merchantName: "Cleava Siivouspalvelut",
    title: all(
      "Kotisiivous ja ikkunanpesu 3–8 h – myös muuttosiivous",
      "Hemstädning och fönstertvätt 3–8 h – även flyttstädning",
      "Home cleaning & window washing 3–8 h – move-out cleaning too",
    ),
    baseTitle: null,
    restrictions: all(
      "Koko pääkaupunkiseutu · välineet ja aineet mukana",
      "Hela huvudstadsregionen · redskap och medel ingår",
      "Whole capital region · equipment & supplies included",
    ),
    description: all(
      "Luotettava kotisiivous pääkaupunkiseudulla ilman stressiä. Cleavan ammattisiivoojat tulevat kotiisi Helsingissä, Espoossa, Vantaalla tai Kauniaisissa valitsemaksesi ajaksi ja siivoavat juuri ne paikat, jotka sinulle ovat tärkeimmät – viikkosiivouksesta perusteelliseen kotisiivoukseen. Ikkunanpesu sisältyy kotisiivouspaketteihin.\n\nMuutto edessä? Valitse muuttosiivous asunnon koon mukaan, niin asunto luovutetaan siistinä. Siivoojat tuovat kaikki välineet ja aineet mukanaan, joten sinun ei tarvitse valmistella mitään.",
      "Pålitlig hemstädning i huvudstadsregionen utan stress. Cleavas professionella städare kommer hem till dig i Helsingfors, Esbo, Vanda eller Grankulla för den tid du väljer och städar just det som är viktigast för dig – från veckostädning till grundlig storstädning. Fönstertvätt ingår i hemstädningspaketen.\n\nSka du flytta? Välj flyttstädning efter bostadens storlek så lämnas bostaden i skick. Städarna tar med alla redskap och medel, så du behöver inte förbereda något.",
      "Reliable, stress-free home cleaning in the capital region. Cleava's professional cleaners come to your home in Helsinki, Espoo, Vantaa or Kauniainen for the time you choose and clean exactly what matters most to you – from a weekly tidy-up to a thorough deep clean. Window washing is included in the home cleaning packages.\n\nMoving out? Choose move-out cleaning by apartment size and hand the place over spotless. The cleaners bring all equipment and supplies, so there is nothing for you to prepare.",
    ),
    inclusions: {
      fi: [
        "Ammattisiivooja kotiisi 3, 4, 5, 6 tai 8 tunniksi",
        "Ikkunanpesu sisältyy kotisiivouspaketteihin",
        "Muuttosiivous asunnon koon mukaan, enintään 100 m²",
        "Siivousvälineet ja ympäristöystävälliset aineet mukana",
        "Sinä päätät, mitä valitun ajan puitteissa siivotaan",
      ],
      sv: [
        "Professionell städare hem till dig i 3, 4, 5, 6 eller 8 timmar",
        "Fönstertvätt ingår i hemstädningspaketen",
        "Flyttstädning efter bostadens storlek, högst 100 m²",
        "Städredskap och miljövänliga medel ingår",
        "Du bestämmer vad som städas inom den valda tiden",
      ],
      en: [
        "A professional cleaner at your home for 3, 4, 5, 6 or 8 hours",
        "Window washing included in the home cleaning packages",
        "Move-out cleaning by apartment size, up to 100 m²",
        "Cleaning equipment and eco-friendly supplies included",
        "You decide what gets cleaned within the chosen time",
      ],
    },
    terms: {
      fi: [
        "Käytettävissä Helsingissä, Espoossa, Vantaalla ja Kauniaisissa",
        "Ostetun ajan ylittävästä osuudesta lisähinta 25 €/h, joka maksetaan suoraan palveluntarjoajalle",
        "Pitkä siivous voidaan toteuttaa kahdella siivoojalla (esim. 8 h = 2 siivoojaa × 4 h)",
        "Ikkunat pestään molemmin puolin, jos ne ovat helposti saavutettavissa",
        "Varaa aika viimeistään 2 viikkoa ennen lahjakortin voimassaolon päättymistä",
        "Peruutukset viimeistään 24 h ennen varattua aikaa",
        "1 lahjakortti / kotitalous tai toimisto",
      ],
      sv: [
        "Gäller i Helsingfors, Esbo, Vanda och Grankulla",
        "Tid utöver den köpta debiteras 25 €/h och betalas direkt till tjänsteleverantören",
        "En lång städning kan utföras av två städare (t.ex. 8 h = 2 städare × 4 h)",
        "Fönstren tvättas på båda sidor om de är lätt åtkomliga",
        "Boka senast 2 veckor innan presentkortet går ut",
        "Avbokning senast 24 h före bokad tid",
        "1 presentkort / hushåll eller kontor",
      ],
      en: [
        "Valid in Helsinki, Espoo, Vantaa and Kauniainen",
        "Time beyond what you bought costs €25/h, paid directly to the service provider",
        "Longer cleanings can be done by two cleaners (e.g. 8 h = 2 cleaners × 4 h)",
        "Windows are washed on both sides if they are easy to reach",
        "Book no later than 2 weeks before the voucher expires",
        "Cancel no later than 24 h before your booked time",
        "1 voucher per household or office",
      ],
    },
    howTo: {
      fi: [
        "Valitse sopiva vaihtoehto ja osta lahjakortti",
        "Saat lahjakortin sähköpostiisi heti maksun jälkeen – koodi näkyy lahjakortissa",
        "Varaa aika soittamalla 045 187 8083 ja kerro, että sinulla on Vendelia-lahjakortti",
        "Näytä lahjakortti siivoojalle puhelimesta tai tulosteena",
      ],
      sv: [
        "Välj ett passande alternativ och köp presentkortet",
        "Du får presentkortet till din e-post direkt efter betalningen – koden står på presentkortet",
        "Boka tid på 045 187 8083 och nämn att du har ett Vendelia-presentkort",
        "Visa presentkortet för städaren i telefonen eller utskrivet",
      ],
      en: [
        "Choose an option and buy the voucher",
        "You get the voucher by email right after payment – the code is printed on it",
        "Book a time by calling 045 187 8083 and mention your Vendelia voucher",
        "Show the voucher to the cleaner on your phone or on paper",
      ],
    },
    imageUrl: "/deals/cleava/kotisiivous.webp",
    gallery: ["/deals/cleava/tiimi.webp", "/deals/cleava/pinnat.webp"],
    vatBps: 2550,
    fromPriceCents: 8900,
    referencePriceCents: 14700,
    optionCount: 10,
    defaultOptionId: null,
    street: "",
    zip: "",
    meetingPoint: false,
    options: [
      cleavaHours(3, 8900, 14700, "c1ea7a00-0000-4000-8000-000000000101"),
      cleavaHours(4, 11900, 19600, "c1ea7a00-0000-4000-8000-000000000102"),
      cleavaHours(5, 14900, 24500, "c1ea7a00-0000-4000-8000-000000000103"),
      cleavaHours(6, 18900, 29400, "c1ea7a00-0000-4000-8000-000000000104"),
      cleavaHours(8, 23900, 39200, "c1ea7a00-0000-4000-8000-000000000105"),
      cleavaMove("max. 30", 14900, "c1ea7a00-0000-4000-8000-000000000201"),
      cleavaMove("31–40", 17900, "c1ea7a00-0000-4000-8000-000000000202"),
      cleavaMove("41–60", 23900, "c1ea7a00-0000-4000-8000-000000000203"),
      cleavaMove("61–80", 29900, "c1ea7a00-0000-4000-8000-000000000204"),
      cleavaMove("81–100", 36900, "c1ea7a00-0000-4000-8000-000000000205"),
    ],
    merchant: {
      name: "Cleava Siivouspalvelut",
      companyName: "Cleava Siivouspalvelut",
      businessId: "3631044-9",
      phone: "045 187 8083",
      email: "info@cleava.fi",
      website: "https://cleava.fi",
    },
  },
];

export function toSummary(d: PartnerDeal): DealSummaryDTO {
  return {
    id: d.id,
    slug: d.slug,
    title: d.title,
    restrictions: d.restrictions,
    categoryId: d.categoryId,
    cityId: d.cityId,
    area: d.area,
    imageUrl: d.imageUrl,
    vatBps: d.vatBps,
    fromPriceCents: d.fromPriceCents,
    referencePriceCents: d.referencePriceCents,
    optionCount: d.optionCount,
    defaultOptionId: d.defaultOptionId,
    merchantName: d.merchantName,
  };
}

const texts = (d: PartnerDeal) => [d.title, d.description, d.restrictions].flatMap((t) => [t.fi, t.sv, t.en]).concat(d.merchantName);

export function partnerDeals(q: DealQuery = {}): DealSummaryDTO[] {
  const needle = q.q?.toLowerCase();
  return PARTNER_DEALS.filter(
    (d) =>
      (!q.featured || d.featured) &&
      (!q.city || d.cityIds.includes(q.city)) &&
      (!q.category || d.categoryId === q.category) &&
      (!needle || texts(d).some((s) => s.toLowerCase().includes(needle))),
  ).map(toSummary);
}

export function partnerDeal(slug: string): DealDetailDTO | null {
  const d = PARTNER_DEALS.find((x) => x.slug === slug);
  if (!d) return null;
  const { featured: _f, cityIds: _c, ...detail } = d;
  return detail;
}

export const isPartnerItem = (item: CartItemInput) => PARTNER_DEALS.some((d) => d.id === item.dealId);

/** Same shape as the API's /api/cart/quote, for partner deals only. VAT is included in the price. */
export function partnerQuote(items: CartItemInput[]): CartQuoteDTO {
  const lines: CartLineDTO[] = [];
  const unavailable: CartQuoteDTO["unavailable"] = [];
  for (const item of items) {
    const deal = PARTNER_DEALS.find((d) => d.id === item.dealId);
    const option = deal?.options.find((o) => o.id === item.optionId);
    if (!deal || !option) {
      unavailable.push(item);
      continue;
    }
    lines.push({
      dealId: deal.id,
      optionId: option.id,
      qty: item.qty,
      unitPriceCents: option.priceCents,
      totalCents: option.priceCents * item.qty,
      vatBps: deal.vatBps,
      title: deal.title,
      baseTitle: deal.baseTitle,
      optionLabel: option.label,
      merchantName: deal.merchantName,
      slug: deal.slug,
      imageUrl: deal.imageUrl,
    });
  }
  const vatByRate: Record<string, number> = {};
  for (const l of lines) {
    vatByRate[l.vatBps] = (vatByRate[l.vatBps] ?? 0) + Math.round((l.totalCents * l.vatBps) / (10000 + l.vatBps));
  }
  return { lines, totalCents: lines.reduce((a, l) => a + l.totalCents, 0), vatByRate, unavailable };
}
