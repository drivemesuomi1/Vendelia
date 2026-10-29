"use client";

import { usePathname, useRouter } from "next/navigation";
import { LOCALE_COOKIE, LOCALE_LABELS, LOCALES, type Locale } from "@/i18n/config";
import { useI18n } from "@/i18n/I18nProvider";

/** Switches the /fi|/sv|/en prefix of the current URL and remembers the choice. */
export function LangSwitch() {
  const { t, locale } = useI18n();
  const router = useRouter();
  const pathname = usePathname();
  function change(next: Locale) {
    document.cookie = `${LOCALE_COOKIE}=${next}; path=/; max-age=31536000; samesite=lax`;
    const rest = pathname.replace(/^\/(fi|sv|en)(?=\/|$)/, "");
    router.push(`/${next}${rest}${window.location.search}`);
  }
  return (
    <select className="lang" aria-label={t("nav.language")} value={locale} onChange={(e) => change(e.target.value as Locale)}>
      {LOCALES.map((l) => (
        <option key={l} value={l} lang={l} title={LOCALE_LABELS[l].name}>{LOCALE_LABELS[l].short}</option>
      ))}
    </select>
  );
}
