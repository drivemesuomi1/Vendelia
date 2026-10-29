import { DEFAULT_LOCALE, LOCALES, type Locale } from "@vendelia/shared";

export { DEFAULT_LOCALE, LOCALES, type Locale };

export const LOCALE_COOKIE = "vd_locale";

export const LOCALE_LABELS: Record<Locale, { short: string; name: string; intl: string }> = {
  fi: { short: "FI", name: "Suomi", intl: "fi-FI" },
  sv: { short: "SV", name: "Svenska", intl: "sv-FI" },
  en: { short: "EN", name: "English", intl: "en-IE" },
};

export function isLocale(value: string | undefined | null): value is Locale {
  return !!value && (LOCALES as readonly string[]).includes(value);
}
