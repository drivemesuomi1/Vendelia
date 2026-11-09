import type { LocalizedList, LocalizedText } from "../schemas/common";
import { voucherQrPayload } from "../schemas/voucher";
import type { VoucherDTO } from "../types/api";

/**
 * Sample customer account for showing the account pages without a real sign-in or real orders.
 * Clearly fake (example.com, test vouchers); dates are relative to now so every status shows up.
 * Used by the demo account page and by the demo voucher PDF endpoint, so both show the same data.
 */
export interface DemoVoucher extends VoucherDTO {
  vatBps: number;
  terms: LocalizedList;
  howToSteps: LocalizedList;
  merchant: { name: string; companyName: string; businessId: string; phone: string; email?: string; website?: string };
  cityName: LocalizedText;
}

export interface DemoAccount {
  user: { name: string; email: string };
  vouchers: DemoVoucher[];
}

/** On by default outside production; production shows it only with VENDELIA_DEMO_ACCOUNT=true. */
export function demoAccountEnabled(env: Record<string, string | undefined>): boolean {
  const flag = env.VENDELIA_DEMO_ACCOUNT?.trim().toLowerCase();
  return flag ? flag === "true" : env.NODE_ENV !== "production";
}

const t = (fi: string, sv: string, en: string): LocalizedText => ({ fi, sv, en });
const list = (fi: string[], sv: string[], en: string[]): LocalizedList => ({ fi, sv, en });
const DAY = 86_400_000;

const CLEAVA = { name: "Cleava Siivouspalvelut", companyName: "Cleava Oy", businessId: "3291847-6", phone: "+358 40 718 2290", email: "asiakaspalvelu@cleava.example", website: "https://cleava.example" };
const STUDIO = { name: "Studio Lumo", companyName: "Lumo Kauneus Oy", businessId: "3104582-9", phone: "+358 50 336 4815", email: "ajanvaraus@lumo.example" };
const KYYTI = { name: "Kyyti Premium", companyName: "Kyyti Premium Oy", businessId: "2987431-2", phone: "+358 44 902 1176" };

const HELSINKI = t("Helsinki", "Helsingfors", "Helsinki");
const ESPOO = t("Espoo", "Esbo", "Espoo");
const CLEAN_TERMS = list(
  ["Varaa aika vähintään 48 tuntia etukäteen.", "Peruutus viimeistään 24 tuntia ennen käyntiä."],
  ["Boka minst 48 timmar i förväg.", "Avboka senast 24 timmar före besöket."],
  ["Book at least 48 hours in advance.", "Cancel at least 24 hours before the visit."],
);
const CLEAN_HOWTO = list(
  ["Pidä seteli tallessa.", "Varaa aika numerosta +358 40 718 2290 ja kerro setelin koodi."],
  ["Spara värdebeviset.", "Boka tid på +358 40 718 2290 och uppge koden."],
  ["Keep this voucher.", "Book a time on +358 40 718 2290 and give the voucher code."],
);

export function demoAccount(siteUrl = "https://vendelia.fi", now = new Date()): DemoAccount {
  const at = (days: number) => new Date(now.getTime() + days * DAY).toISOString();
  const voucher = (v: Omit<DemoVoucher, "qrPayload" | "test" | "dealSlug" | "howTo"> & { dealSlug?: string }): DemoVoucher => ({
    dealSlug: "cleava-kotisiivous-ja-muuttosiivous",
    ...v,
    qrPayload: voucherQrPayload(siteUrl, v.code),
    howTo: { fi: v.howToSteps.fi.join(" "), sv: v.howToSteps.sv.join(" "), en: v.howToSteps.en.join(" ") },
    test: true,
  });

  return {
    user: { name: "Aino Virtanen", email: "aino.virtanen@example.com" },
    vouchers: [
      voucher({
        code: "VND-K7M3-QX2T", status: "active", orderNumber: "VD-K7M3QX",
        title: t("Kotisiivous ja ikkunanpesu", "Hemstädning och fönstertvätt", "Home cleaning and window washing"),
        optionLabel: t("Kotisiivous: 4 h", "Hemstädning: 4 h", "Home cleaning: 4 h"),
        merchantName: CLEAVA.name, merchant: CLEAVA, imageUrl: "/deals/cleava/kotisiivous.webp",
        street: "Mannerheimintie 14", zip: "00100", cityId: "helsinki", cityName: HELSINKI, meetingPoint: false,
        priceCents: 11900, vatBps: 2550, issuedAt: at(-3), expiresAt: at(89), cancellableUntil: at(11),
        redeemedAt: null, refundedAt: null, recipientName: null, terms: CLEAN_TERMS, howToSteps: CLEAN_HOWTO,
      }),
      voucher({
        code: "VND-K7M3-RW8N", status: "active", orderNumber: "VD-K7M3QX",
        title: t("Ikkunanpesu ja pintojen kiillotus", "Fönstertvätt och ytpolering", "Window washing and surface polish"),
        optionLabel: t("Kerrostalokaksio", "Tvåa i flervåningshus", "Two-room flat"),
        merchantName: CLEAVA.name, merchant: CLEAVA, imageUrl: "/deals/cleava/pinnat.webp",
        street: "Mannerheimintie 14", zip: "00100", cityId: "helsinki", cityName: HELSINKI, meetingPoint: false,
        priceCents: 6900, vatBps: 2550, issuedAt: at(-3), expiresAt: at(89), cancellableUntil: at(11),
        redeemedAt: null, refundedAt: null, recipientName: "Eero", terms: CLEAN_TERMS, howToSteps: CLEAN_HOWTO,
      }),
      voucher({
        code: "VND-P4N8-TW6B", status: "active", orderNumber: "VD-P4N8TW", dealSlug: "studio-lumo",
        title: t("Kasvohoito ja hieronta", "Ansiktsbehandling och massage", "Facial and massage"),
        optionLabel: t("75 min", "75 min", "75 min"),
        merchantName: STUDIO.name, merchant: STUDIO, imageUrl: "/banner/home-services.webp",
        street: "Tapionraitti 5", zip: "02100", cityId: "espoo", cityName: ESPOO, meetingPoint: false,
        priceCents: 7450, vatBps: 2550, issuedAt: at(-80), expiresAt: at(9), cancellableUntil: null,
        redeemedAt: null, refundedAt: null, recipientName: null,
        terms: list(["Varaa aika verkossa tai puhelimitse."], ["Boka tid på nätet eller per telefon."], ["Book online or by phone."]),
        howToSteps: list(["Varaa aika ja näytä seteli käynnillä."], ["Boka tid och visa värdebeviset vid besöket."], ["Book a time and show the voucher at your visit."]),
      }),
      voucher({
        code: "VND-H2R9-LB5C", status: "redeemed", orderNumber: "VD-H2R9LB",
        title: t("Muuttosiivous", "Flyttstädning", "Move-out cleaning"),
        optionLabel: t("Muuttosiivous: 50 m²", "Flyttstädning: 50 m²", "Move-out cleaning: 50 m²"),
        merchantName: CLEAVA.name, merchant: CLEAVA, imageUrl: "/deals/cleava/tiimi.webp",
        street: "Mannerheimintie 14", zip: "00100", cityId: "helsinki", cityName: HELSINKI, meetingPoint: false,
        priceCents: 19900, vatBps: 2550, issuedAt: at(-41), expiresAt: at(51), cancellableUntil: null,
        redeemedAt: at(-12), refundedAt: null, recipientName: null, terms: CLEAN_TERMS, howToSteps: CLEAN_HOWTO,
      }),
      voucher({
        code: "VND-C6W2-ZE4M", status: "refunded", orderNumber: "VD-C6W2ZE", dealSlug: "kyyti-premium",
        title: t("Kuljetus lentokentälle", "Transport till flygplatsen", "Airport transfer"),
        optionLabel: t("Helsinki-Vantaa, 1-3 henkeä", "Helsingfors-Vanda, 1-3 personer", "Helsinki Airport, 1-3 people"),
        merchantName: KYYTI.name, merchant: KYYTI, imageUrl: "/banner/home-services.webp",
        street: "Rautatientori 1", zip: "00100", cityId: "helsinki", cityName: HELSINKI, meetingPoint: true,
        priceCents: 5900, vatBps: 1350, issuedAt: at(-24), expiresAt: at(68), cancellableUntil: null,
        redeemedAt: null, refundedAt: at(-20), recipientName: null,
        terms: list(["Tilaa kyyti vähintään 24 tuntia etukäteen."], ["Beställ minst 24 timmar i förväg."], ["Order the ride at least 24 hours ahead."]),
        howToSteps: list(["Soita ja kerro setelin koodi."], ["Ring och uppge koden."], ["Call and give the voucher code."]),
      }),
      voucher({
        code: "VND-F3T7-NA9D", status: "expired", orderNumber: "VD-F3T7NA",
        title: t("Kotisiivous ja ikkunanpesu", "Hemstädning och fönstertvätt", "Home cleaning and window washing"),
        optionLabel: t("Kotisiivous: 3 h", "Hemstädning: 3 h", "Home cleaning: 3 h"),
        merchantName: CLEAVA.name, merchant: CLEAVA, imageUrl: "/deals/cleava/kotisiivous.webp",
        street: "Mannerheimintie 14", zip: "00100", cityId: "helsinki", cityName: HELSINKI, meetingPoint: false,
        priceCents: 8900, vatBps: 2550, issuedAt: at(-130), expiresAt: at(-38), cancellableUntil: null,
        redeemedAt: null, refundedAt: null, recipientName: null, terms: CLEAN_TERMS, howToSteps: CLEAN_HOWTO,
      }),
    ],
  };
}
