import type { Locale } from "@vendelia/shared";

export interface MerchantWelcomeInput {
  locale: Locale;
  businessName: string;
  email: string;
  password: string;
  loginUrl: string;
  supportEmail: string;
}

const TEXT = {
  fi: {
    subject: "Vendelia-yritystilisi on valmis",
    hello: "Hei,",
    intro: (name: string) => `yrityksellesi ${name} on luotu tili Vendelian yritysportaaliin.`,
    email: "Kirjautumissähköposti",
    password: "Salasana",
    login: "Kirjaudu sisään",
    keep: "Säilytä salasana turvallisesti äläkä jaa sitä.",
    questions: "Kysyttävää? Vastaa tähän viestiin tai kirjoita",
    regards: "Ystävällisin terveisin,\nVendelia",
  },
  sv: {
    subject: "Ditt företagskonto hos Vendelia är klart",
    hello: "Hej,",
    intro: (name: string) => `ett konto i Vendelias företagsportal har skapats för ${name}.`,
    email: "Inloggningsadress",
    password: "Lösenord",
    login: "Logga in",
    keep: "Förvara lösenordet säkert och dela det inte.",
    questions: "Frågor? Svara på detta meddelande eller skriv till",
    regards: "Vänliga hälsningar,\nVendelia",
  },
  en: {
    subject: "Your Vendelia business account is ready",
    hello: "Hi,",
    intro: (name: string) => `an account for ${name} has been created in the Vendelia business portal.`,
    email: "Sign-in email",
    password: "Password",
    login: "Sign in",
    keep: "Keep the password safe and don't share it.",
    questions: "Questions? Reply to this email or write to",
    regards: "Kind regards,\nVendelia",
  },
} satisfies Record<Locale, unknown>;

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

/** Sign-in details for a newly created business login. Short and plain, like the voucher email. */
export function buildMerchantWelcomeEmail(input: MerchantWelcomeInput) {
  const t = TEXT[input.locale];
  const text = [
    t.hello, t.intro(input.businessName), "",
    `${t.email}: ${input.email}`,
    `${t.password}: ${input.password}`,
    `${t.login}: ${input.loginUrl}`, "",
    t.keep,
    `${t.questions} ${input.supportEmail}.`, "", t.regards,
  ].join("\n");

  const html = `<!doctype html>
<html lang="${input.locale}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(t.subject)}</title></head>
<body style="margin:0;padding:20px 16px;font-family:Segoe UI,Helvetica,Arial,sans-serif;font-size:15px;line-height:1.5;color:#17223B">
<div style="max-width:520px">
<p style="margin:0 0 12px">${esc(t.hello)}<br>${esc(t.intro(input.businessName))}</p>
<p style="margin:0 0 16px;padding:12px 16px;background:#F1EFFE;border-radius:8px">
${esc(t.email)}: <b>${esc(input.email)}</b><br>
${esc(t.password)}: <b style="font-family:Courier New,monospace;font-size:16px">${esc(input.password)}</b>
</p>
<p style="margin:0 0 16px"><a href="${esc(input.loginUrl)}" style="display:inline-block;padding:10px 18px;background:#3B32B3;color:#FFFFFF;border-radius:8px;text-decoration:none;font-weight:600">${esc(t.login)}</a></p>
<p style="margin:0 0 12px;font-size:13px;color:#4A5468">${esc(t.keep)}<br>
${esc(t.questions)} <a href="mailto:${esc(input.supportEmail)}" style="color:#3B32B3">${esc(input.supportEmail)}</a>.</p>
<p style="margin:0;white-space:pre-line">${esc(t.regards)}</p>
</div>
</body></html>`;

  return { subject: t.subject, text, html };
}
