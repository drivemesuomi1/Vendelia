import type { Locale, LocalizedText } from "@vendelia/shared";
import { LOCALE_LABELS } from "@/i18n/config";

/** Money arrives from the API as integer cents. */
export function formatMoney(cents: number, locale: Locale): string {
  return new Intl.NumberFormat(LOCALE_LABELS[locale].intl, { style: "currency", currency: "EUR" }).format(cents / 100);
}

export function formatDate(iso: string | Date, locale: Locale): string {
  const d = typeof iso === "string" ? new Date(iso) : iso;
  if (locale === "en") return d.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "Europe/Helsinki" });
  // fi and sv both use D.M.YYYY in Finland. Built from numeric parts because Node and browsers
  // disagree on the sv-FI pattern ("2027-01-28" vs "28.1.2027"), which breaks hydration.
  const parts = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "numeric", year: "numeric", timeZone: "Europe/Helsinki" }).formatToParts(d);
  const part = (type: Intl.DateTimeFormatPartTypes) => Number(parts.find((p) => p.type === type)!.value);
  return `${part("day")}.${part("month")}.${part("year")}`;
}

/** Basis points → "25,5 %" (fi/sv) or "25.5%" (en). */
export function formatPct(bps: number, locale: Locale): string {
  const v = (bps / 100).toString();
  return locale === "en" ? `${v}%` : `${v.replace(".", ",")} %`;
}

/** Picks the text for the locale; empty Swedish/English falls back to Finnish. */
export function loc(text: LocalizedText | null | undefined, locale: Locale): string {
  if (!text) return "";
  return text[locale] || text.fi;
}

export function locList(list: { fi: string[]; sv: string[]; en: string[] }, locale: Locale): string[] {
  return list[locale]?.length ? list[locale] : list.fi;
}

/** "Hot stone massage – 90 min" when the deal has several options. */
export function itemTitle(title: LocalizedText, baseTitle: LocalizedText | null, optionLabel: LocalizedText | null, locale: Locale): string {
  return optionLabel ? `${loc(baseTitle ?? title, locale)} – ${loc(optionLabel, locale)}` : loc(title, locale);
}

export function discountPct(priceCents: number, referenceCents: number | null): number | null {
  if (!referenceCents || referenceCents <= priceCents) return null;
  return Math.round((1 - priceCents / referenceCents) * 100);
}

/** Expiry date of a voucher bought today: N calendar months ahead, clamped to month end. */
export function expiryFromToday(months: number, today = new Date()): Date {
  const target = new Date(today.getFullYear(), today.getMonth() + months, 1);
  const last = new Date(target.getFullYear(), target.getMonth() + 1, 0).getDate();
  target.setDate(Math.min(today.getDate(), last));
  return target;
}
