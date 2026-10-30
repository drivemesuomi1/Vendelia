import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import { Providers } from "@/components/layout/Providers";
import { isLocale, LOCALES } from "@/i18n/config";
import { getMessages, getT } from "@/i18n/server";
import { getSession } from "@/lib/session";
import { getMeta } from "@/features/deals/api";
import "@/styles/globals.css";

const inter = Inter({ subsets: ["latin", "latin-ext"], weight: ["400", "500", "600", "700", "800"], display: "swap" });

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const t = getT(isLocale(locale) ? locale : "fi");
  const meta = await getMeta();
  return {
    title: { default: `Vendelia – ${t("home.title")}`, template: "%s · Vendelia" },
    description: t("home.lead", { days: meta.refundWindowDays }),
    icons: { icon: "/favicon.svg" },
    alternates: { languages: Object.fromEntries(LOCALES.map((l) => [l, `/${l}`])) },
  };
}

export const viewport: Viewport = { themeColor: "#3B32B3", width: "device-width", initialScale: 1 };

/** Root layout: <html lang>, fonts, global styles and client providers with shared data. */
export default async function LocaleLayout({ children, params }: { children: ReactNode; params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const [meta, user] = await Promise.all([getMeta(), getSession()]);
  return (
    <html lang={locale} className={inter.className}>
      <body>
        <Providers locale={locale} messages={getMessages(locale)} fallback={getMessages("fi")} meta={meta} user={user}>
          {children}
        </Providers>
      </body>
    </html>
  );
}
