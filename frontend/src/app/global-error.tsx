"use client";

import { useEffect, useState } from "react";
import { isLocale, type Locale } from "@/i18n/config";
import { createTranslator } from "@/i18n/translate";
import fi from "../../messages/fi.json";
import sv from "../../messages/sv.json";
import en from "../../messages/en.json";

/** Also catches metadata/API failures in the root layout, outside Providers. */
export default function GlobalError({ retry }: { error: unknown; retry: () => void }) {
  const [locale, setLocale] = useState<Locale>("fi");
  useEffect(() => {
    const segment = window.location.pathname.split("/")[1] ?? "fi";
    if (isLocale(segment)) setLocale(segment);
  }, []);
  const t = createTranslator({ fi, sv, en }[locale], fi);
  return (
    <html lang={locale}>
      <body style={{ fontFamily: "system-ui, sans-serif", padding: "10vh 24px", textAlign: "center" }}>
        <h1>{t("errors.catalogueUnavailable")}</h1>
        <p>{t("errors.generic")}</p>
        <button type="button" onClick={retry}>{t("common.retry")}</button>
      </body>
    </html>
  );
}
