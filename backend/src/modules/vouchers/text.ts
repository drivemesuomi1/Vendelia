import type { Locale, LocalizedText } from "@vendelia/shared";

/** Texts for the voucher PDF and email. Kept here because the backend has no message files. */
const TEXT = {
  fi: {
    voucher: "LAHJAKORTTI",
    code: "Lahjakortin koodi",
    forMerchant: "Palveluntarjoajalle",
    scan: "Skannaa QR-koodi tai syötä koodi Vendelian lunastussivulla.",
    howTo: "Lunastusohjeet",
    validFor: (months: number) => `Lahjakortti on voimassa ${months} kuukautta ostohetkestä`,
    show: "Näytä lahjakortin mobiili- tai paperiversio palveluntarjoajalle",
    redeemBy: "Lunastettava viimeistään",
    merchant: "Palveluntarjoaja",
    businessId: "Y-tunnus",
    place: "Lunastuspaikka",
    serviceArea: "Palvelualue",
    order: "Tilauksen tiedot",
    orderNumber: "Tilausnumero",
    purchased: "Ostettu",
    price: "Hinta",
    vatIncl: (rate: string) => `sis. ALV ${rate} %`,
    buyer: "Ostaja",
    giftFor: "Lahja henkilölle",
    terms: "Ehdot",
    allTerms: "Kaikki ehdot:",
    support: "Vendelia asiakaspalvelu",
    cancelTitle: "PERUUTUSOIKEUS",
    cancel: (days: number) =>
      `Lahjakortti on lunastettava palveluntarjoajalla voimassaoloaikana. Lunastamaton lahjakortti umpeutuu `
      + `voimassaolon päättyessä. Sinulla on oikeus peruuttaa osto ${days} päivän kuluessa ostovahvistuksen `
      + `saamisesta. Jos lunastat lahjakortin tänä aikana, peruutusoikeus raukeaa.`,
    testBanner: "TESTITILAUS – EI MAKSETTU. Tämä lahjakortti ei kelpaa maksuvälineeksi.",
    watermark: "TESTI",
    page: (n: number, m: number) => `Lahjakortti ${n}/${m}`,
    subject: (title: string) => `Vendelia-lahjakorttisi: ${title}`,
    subjectMany: (n: number) => `Vendelia-lahjakorttisi (${n} kpl)`,
    testSubject: "[TESTI] ",
    hello: (name: string) => `Hei ${name},`,
    thanks: "kiitos tilauksestasi! Lahjakorttisi on liitteenä PDF-tiedostona.",
    showIt: "Näytä lahjakortti palveluntarjoajalle puhelimesta tai tulosteena.",
    testNote: "Tämä on testitilaus: maksua ei veloitettu, eikä lahjakortti kelpaa käytettäväksi.",
    validUntil: "Voimassa",
    questions: "Kysyttävää? Vastaa tähän viestiin tai kirjoita osoitteeseen",
    regards: "Ystävällisin terveisin,\nVendelia",
    fileName: "Vendelia-lahjakortti",
  },
  sv: {
    voucher: "PRESENTKORT",
    code: "Presentkortets kod",
    forMerchant: "För tjänsteleverantören",
    scan: "Skanna QR-koden eller ange koden på Vendelias inlösensida.",
    howTo: "Så löser du in",
    validFor: (months: number) => `Presentkortet gäller i ${months} månader från köpet`,
    show: "Visa presentkortet i mobilen eller på papper för tjänsteleverantören",
    redeemBy: "Ska lösas in senast",
    merchant: "Tjänsteleverantör",
    businessId: "FO-nummer",
    place: "Inlösningsplats",
    serviceArea: "Serviceområde",
    order: "Beställning",
    orderNumber: "Ordernummer",
    purchased: "Köpt",
    price: "Pris",
    vatIncl: (rate: string) => `inkl. moms ${rate} %`,
    buyer: "Köpare",
    giftFor: "Present till",
    terms: "Villkor",
    allTerms: "Alla villkor:",
    support: "Vendelias kundtjänst",
    cancelTitle: "ÅNGERRÄTT",
    cancel: (days: number) =>
      `Presentkortet ska lösas in hos tjänsteleverantören under giltighetstiden. Ett presentkort som inte löses in `
      + `upphör att gälla när giltighetstiden går ut. Du har rätt att ångra köpet inom ${days} dagar efter `
      + `orderbekräftelsen. Om du löser in presentkortet under denna tid upphör ångerrätten.`,
    testBanner: "TESTBESTÄLLNING – EJ BETALD. Presentkortet gäller inte som betalningsmedel.",
    watermark: "TEST",
    page: (n: number, m: number) => `Presentkort ${n}/${m}`,
    subject: (title: string) => `Ditt presentkort från Vendelia: ${title}`,
    subjectMany: (n: number) => `Dina presentkort från Vendelia (${n} st.)`,
    testSubject: "[TEST] ",
    hello: (name: string) => `Hej ${name},`,
    thanks: "tack för din beställning! Ditt presentkort finns bifogat som PDF.",
    showIt: "Visa presentkortet för tjänsteleverantören i mobilen eller på papper.",
    testNote: "Detta är en testbeställning: ingen betalning har debiterats och presentkortet kan inte användas.",
    validUntil: "Gäller till",
    questions: "Frågor? Svara på detta meddelande eller skriv till",
    regards: "Vänliga hälsningar,\nVendelia",
    fileName: "Vendelia-presentkort",
  },
  en: {
    voucher: "GIFT VOUCHER",
    code: "Voucher code",
    forMerchant: "For the service provider",
    scan: "Scan the QR code or enter the code on Vendelia's redemption page.",
    howTo: "How to redeem",
    validFor: (months: number) => `The voucher is valid for ${months} months from purchase`,
    show: "Show the voucher on your phone or on paper to the service provider",
    redeemBy: "Redeem by",
    merchant: "Service provider",
    businessId: "Business ID",
    place: "Redemption location",
    serviceArea: "Service area",
    order: "Order details",
    orderNumber: "Order number",
    purchased: "Purchased",
    price: "Price",
    vatIncl: (rate: string) => `incl. VAT ${rate}%`,
    buyer: "Buyer",
    giftFor: "Gift for",
    terms: "Terms",
    allTerms: "All terms:",
    support: "Vendelia customer service",
    cancelTitle: "RIGHT OF WITHDRAWAL",
    cancel: (days: number) =>
      `The voucher must be redeemed with the service provider during its validity period. An unredeemed voucher `
      + `expires when its validity ends. You may cancel the purchase within ${days} days of receiving the order `
      + `confirmation. If you redeem the voucher during that time, the right to cancel ends.`,
    testBanner: "TEST ORDER – NOT PAID. This voucher is not valid for redemption.",
    watermark: "TEST",
    page: (n: number, m: number) => `Voucher ${n}/${m}`,
    subject: (title: string) => `Your Vendelia voucher: ${title}`,
    subjectMany: (n: number) => `Your Vendelia vouchers (${n})`,
    testSubject: "[TEST] ",
    hello: (name: string) => `Hi ${name},`,
    thanks: "thank you for your order! Your voucher is attached as a PDF.",
    showIt: "Show the voucher to the service provider on your phone or on paper.",
    testNote: "This is a test order: no payment was taken and the voucher cannot be used.",
    validUntil: "Valid until",
    questions: "Questions? Reply to this email or write to",
    regards: "Kind regards,\nVendelia",
    fileName: "Vendelia-voucher",
  },
} satisfies Record<Locale, unknown>;

export type VoucherText = (typeof TEXT)["fi"];
export const voucherText = (locale: Locale): VoucherText => TEXT[locale];

/** Localized value with the same Finnish fallback as the site (empty sv/en fall back to fi). */
export const pick = (text: LocalizedText | null | undefined, locale: Locale) =>
  (text?.[locale]?.trim() || text?.fi || "");

export function pickList(list: { fi: string[]; sv: string[]; en: string[] } | null | undefined, locale: Locale) {
  return list?.[locale]?.length ? list[locale] : (list?.fi ?? []);
}

/** D.M.YYYY for fi/sv, "28 January 2027" for en, in Finnish time (matches the site). */
export function formatDate(iso: string | Date, locale: Locale) {
  const date = typeof iso === "string" ? new Date(iso) : iso;
  if (locale === "en") {
    return new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "Europe/Helsinki" }).format(date);
  }
  const parts = Object.fromEntries(new Intl.DateTimeFormat("en-GB", {
    day: "numeric", month: "numeric", year: "numeric", timeZone: "Europe/Helsinki",
  }).formatToParts(date).map((part) => [part.type, part.value]));
  return `${Number(parts.day)}.${Number(parts.month)}.${parts.year}`;
}

export function formatMoney(cents: number, locale: Locale) {
  const tag = locale === "fi" ? "fi-FI" : locale === "sv" ? "sv-FI" : "en-IE";
  // Intl uses narrow no-break spaces that standard PDF fonts cannot draw; plain spaces read the same.
  return new Intl.NumberFormat(tag, { style: "currency", currency: "EUR" }).format(cents / 100).replace(/[  ]/g, " ");
}

export const formatRate = (bps: number, locale: Locale) =>
  (bps / 100).toLocaleString(locale === "en" ? "en-GB" : "fi-FI", { maximumFractionDigits: 2 });
