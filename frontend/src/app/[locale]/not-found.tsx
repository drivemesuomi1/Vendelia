"use client";

import Link from "next/link";
import { useI18n } from "@/i18n/I18nProvider";

export default function NotFound() {
  const { t, locale } = useI18n();
  return (
    <main className="wrap empty">
      <h1>{t("errors.pageNotFound")}</h1>
      <Link className="btn btn-primary" style={{ marginTop: 16 }} href={`/${locale}`}>{t("nav.home")}</Link>
    </main>
  );
}
