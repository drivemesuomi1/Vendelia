import "server-only";
import en from "../../messages/en.json";
import fi from "../../messages/fi.json";
import sv from "../../messages/sv.json";
import { isLocale, type Locale } from "./config";
import { createTranslator, type Messages } from "./translate";

const DICTIONARIES: Record<Locale, Messages> = { fi, sv, en };

export function getMessages(locale: Locale): Messages {
  return DICTIONARIES[locale];
}

/** Translator for server components. */
export function getT(locale: Locale) {
  return createTranslator(DICTIONARIES[locale], DICTIONARIES.fi);
}

/** Resolves the [locale] route param, falling back to Finnish. */
export async function resolveLocale(params: Promise<{ locale: string }>): Promise<Locale> {
  const { locale } = await params;
  return isLocale(locale) ? locale : "fi";
}
