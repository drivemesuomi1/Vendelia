"use client";

import { useI18n } from "@/i18n/I18nProvider";

export default function PageError({ retry }: { error: unknown; retry: () => void }) {
  const { t } = useI18n();
  return (
    <main className="wrap empty">
      <h1>{t("errors.catalogueUnavailable")}</h1>
      <p>{t("errors.generic")}</p>
      <button type="button" className="btn btn-primary" style={{ marginTop: 16 }} onClick={retry}>{t("common.retry")}</button>
    </main>
  );
}
