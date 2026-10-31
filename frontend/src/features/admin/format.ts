import type { Locale } from "@/i18n/config";

/**
 * Display helpers for admin charts and tables. Client components are rendered on the server too, and Node's
 * ICU data can format compact numbers and relative times differently from the browser, so those two are built
 * by hand here to keep server and client output identical.
 */

const tag = (locale: Locale) => `${locale}-FI`;

function fixed(n: number, digits: number, locale: Locale) {
  const s = (Math.round(n * 10 ** digits) / 10 ** digits).toFixed(digits).replace(/\.0+$/, "");
  return locale === "en" ? s : s.replace(".", ",");
}

/** Compact euros for chart axes, e.g. "1,2 t. €" / "€1.2K". */
export function moneyCompact(cents: number, locale: Locale) {
  const e = cents / 100;
  const [v, suffix] = e >= 1e6 ? [e / 1e6, locale === "en" ? "M" : " milj."] : e >= 1000 ? [e / 1000, locale === "en" ? "K" : locale === "sv" ? " tn" : " t."] : [e, ""];
  const num = fixed(v, e >= 1000 ? 1 : 0, locale);
  return locale === "en" ? `€${num}${suffix}` : `${num}${suffix} €`;
}

export function int(n: number, locale: Locale) {
  return new Intl.NumberFormat(tag(locale)).format(n);
}

/** Percentage from a 0–1 ratio. */
export function ratio(r: number, locale: Locale, digits = 1) {
  return `${fixed(r * 100, digits, locale)}${locale === "en" ? "%" : " %"}`;
}

/** Short day label for chart axes: "28.10." in Finnish/Swedish, "28 Oct" in English. */
export function dayLabel(iso: string, locale: Locale) {
  const [, m, d] = iso.split("-").map(Number) as [number, number, number];
  if (locale !== "en") return `${d}.${m}.`;
  return `${d} ${["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"][m - 1]}`;
}

const AGO: Record<Locale, [string, string, string]> = {
  fi: ["{n} min sitten", "{n} t sitten", "{n} pv sitten"],
  sv: ["för {n} min sedan", "för {n} h sedan", "för {n} d sedan"],
  en: ["{n} min ago", "{n} h ago", "{n} d ago"],
};

/** "5 min ago" / "5 min sitten". */
export function ago(minutes: number, locale: Locale) {
  const [m, h, d] = AGO[locale];
  if (minutes < 60) return m.replace("{n}", String(Math.max(1, Math.round(minutes))));
  if (minutes < 1440) return h.replace("{n}", String(Math.round(minutes / 60)));
  return d.replace("{n}", String(Math.round(minutes / 1440)));
}
