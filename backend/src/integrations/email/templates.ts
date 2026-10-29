import type { Locale } from "@vendelia/shared";

/** Plain-text transactional emails in fi / sv / en. */

const eur = (cents: number, locale: Locale) =>
  new Intl.NumberFormat(locale === "en" ? "en-IE" : `${locale}-FI`, { style: "currency", currency: "EUR" }).format(cents / 100);
const date = (d: Date, locale: Locale) =>
  locale === "en" ? d.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" }) : d.toLocaleDateString(`${locale}-FI`);

export interface VoucherLine {
  code: string;
  title: string;
  merchant: string;
  expiresAt: Date;
}

type Rendered = { subject: string; body: string };

export const templates = {
  orderConfirmation(p: { locale: Locale; orderNumber: string; totalCents: number; vouchers: VoucherLine[]; cancelUntil: Date; link: string }): Rendered {
    const lines = p.vouchers
      .map((v) => `• ${v.title} (${v.merchant})\n  ${v.code} · ${({ fi: "voimassa", sv: "giltigt till", en: "valid until" })[p.locale]} ${date(v.expiresAt, p.locale)}`)
      .join("\n");
    const t = {
      fi: { s: `Lahjakorttisi – tilaus ${p.orderNumber}`, h: "Kiitos ostoksestasi!", c: `Voit perua käyttämättömät lahjakortit ${date(p.cancelUntil, p.locale)} asti.`, total: "Yhteensä" },
      sv: { s: `Dina presentkort – beställning ${p.orderNumber}`, h: "Tack för ditt köp!", c: `Du kan avbeställa oanvända presentkort till och med ${date(p.cancelUntil, p.locale)}.`, total: "Totalt" },
      en: { s: `Your vouchers – order ${p.orderNumber}`, h: "Thank you for your purchase!", c: `You can cancel unused vouchers until ${date(p.cancelUntil, p.locale)}.`, total: "Total" },
    }[p.locale];
    return { subject: t.s, body: `${t.h}\n\n${lines}\n\n${t.total}: ${eur(p.totalCents, p.locale)}\n${t.c}\n\n${p.link}` };
  },

  refundAcknowledgement(p: { locale: Locale; code: string; title: string; amountCents: number }): Rendered {
    const t = {
      fi: { s: `Peruutus vahvistettu – ${p.code}`, b: `Lahjakortti ${p.code} (${p.title}) on peruttu. ${eur(p.amountCents, p.locale)} palautetaan alkuperäiselle maksutavalle, yleensä 5 arkipäivän kuluessa.` },
      sv: { s: `Avbeställning bekräftad – ${p.code}`, b: `Presentkortet ${p.code} (${p.title}) har avbeställts. ${eur(p.amountCents, p.locale)} återbetalas till ditt ursprungliga betalningssätt, vanligtvis inom 5 vardagar.` },
      en: { s: `Cancellation confirmed – ${p.code}`, b: `Voucher ${p.code} (${p.title}) has been cancelled. ${eur(p.amountCents, p.locale)} will be refunded to your original payment method, usually within 5 working days.` },
    }[p.locale];
    return { subject: t.s, body: t.b };
  },

  expiryReminder(p: { locale: Locale; code: string; title: string; expiresAt: Date }): Rendered {
    const t = {
      fi: { s: `Lahjakorttisi vanhenee pian – ${p.title}`, b: `Lahjakortti ${p.code} on voimassa ${date(p.expiresAt, p.locale)} asti. Muista varata aika!` },
      sv: { s: `Ditt presentkort går snart ut – ${p.title}`, b: `Presentkortet ${p.code} gäller till och med ${date(p.expiresAt, p.locale)}. Kom ihåg att boka tid!` },
      en: { s: `Your voucher expires soon – ${p.title}`, b: `Voucher ${p.code} is valid until ${date(p.expiresAt, p.locale)}. Remember to book!` },
    }[p.locale];
    return { subject: t.s, body: t.b };
  },

  merchantNewSale(p: { title: string; code: string; payoutCents: number }): Rendered {
    return {
      subject: `Uusi myynti: ${p.title}`,
      body: `Lahjakortti ${p.code} myyty. Tilitettävä lunastuksen jälkeen: ${eur(p.payoutCents, "fi")}.`,
    };
  },

  dealReviewed(p: { title: string; approved: boolean; note?: string }): Rendered {
    return {
      subject: p.approved ? `Diili hyväksytty: ${p.title}` : `Diili palautettiin: ${p.title}`,
      body: p.approved ? "Diilisi on nyt myynnissä Vendeliassa." : `Diiliä ei hyväksytty. ${p.note ?? ""}`.trim(),
    };
  },
};

export type TemplateName = keyof typeof templates;
