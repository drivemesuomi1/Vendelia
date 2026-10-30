import type { MetaDTO } from "@vendelia/shared";

/**
 * Used when the API cannot be reached (for example while the backend is still being built):
 * the site still renders with the launch cities and categories and an empty catalogue.
 */
export const FALLBACK_META: MetaDTO = {
  cities: [
    { id: "helsinki", abbr: "HKI", name: { fi: "Helsinki", sv: "Helsingfors", en: "Helsinki" } },
    { id: "espoo", abbr: "ESP", name: { fi: "Espoo", sv: "Esbo", en: "Espoo" } },
    { id: "vantaa", abbr: "VAN", name: { fi: "Vantaa", sv: "Vanda", en: "Vantaa" } },
    { id: "kauniainen", abbr: "KAU", name: { fi: "Kauniainen", sv: "Grankulla", en: "Kauniainen" } },
  ],
  categories: [
    { id: "food", icon: "food", dealCount: 0, name: { fi: "Ravintolat", sv: "Restauranger", en: "Restaurants" } },
    { id: "beauty", icon: "sparkle", dealCount: 0, name: { fi: "Kauneus", sv: "Skönhet", en: "Beauty" } },
    { id: "wellness", icon: "spa", dealCount: 0, name: { fi: "Hyvinvointi", sv: "Välmående", en: "Wellbeing" } },
    { id: "cleaning", icon: "home", dealCount: 0, name: { fi: "Siivous", sv: "Städning", en: "Cleaning" } },
    { id: "chauffeur", icon: "car", dealCount: 0, name: { fi: "Kuljettajapalvelut", sv: "Chaufförstjänster", en: "Chauffeur services" } },
  ],
  commissionBps: 1500,
  commissionVatBps: 2550,
  voucherValidityMonths: 3,
  refundWindowDays: 14,
};
