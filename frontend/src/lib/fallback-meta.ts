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
    { id: "wellness", icon: "spa", dealCount: 0, name: { fi: "Hyvinvointi ja kauneus", sv: "Välmående och skönhet", en: "Wellness & beauty" } },
    { id: "food", icon: "food", dealCount: 0, name: { fi: "Ruoka ja juoma", sv: "Mat och dryck", en: "Food & drink" } },
    { id: "activities", icon: "compass", dealCount: 0, name: { fi: "Tekeminen", sv: "Aktiviteter", en: "Activities" } },
  ],
  commissionBps: 1500,
  commissionVatBps: 2550,
  voucherValidityMonths: 3,
  refundWindowDays: 14,
};
