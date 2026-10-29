"use client";

import { createContext, useContext, useMemo, type ReactNode } from "react";
import type { Locale } from "./config";
import { createTranslator, type Messages, type Translator } from "./translate";

interface I18nValue {
  locale: Locale;
  t: Translator;
}

const I18nContext = createContext<I18nValue | null>(null);

export function I18nProvider({ locale, messages, fallback, children }: { locale: Locale; messages: Messages; fallback: Messages; children: ReactNode }) {
  const value = useMemo(() => ({ locale, t: createTranslator(messages, fallback) }), [locale, messages, fallback]);
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

/** Translator + current locale for client components. */
export function useI18n(): I18nValue {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useI18n must be used inside <I18nProvider>");
  return ctx;
}
