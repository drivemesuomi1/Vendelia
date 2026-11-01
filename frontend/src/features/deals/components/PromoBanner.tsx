import Link from "next/link";
import type { MetaDTO } from "@vendelia/shared";
import { Icon, type IconName } from "@/components/ui/Icon";
import { LogoSymbol } from "@/components/ui/Logo";
import { getT } from "@/i18n/server";
import { LOCALE_LABELS, type Locale } from "@/i18n/config";
import { loc } from "@/lib/format";

/** Labels over the three photos in the banner image, left to right; `left` is where each photo starts at the bottom edge. */
const PANELS = [
  { category: "cleaning", left: "6%" },
  { category: "beauty", left: "39%" },
  { category: "chauffeur", left: "69%" },
];

/**
 * Full-width home hero: the copy lines up with the header's content edge and the services photo runs to the
 * right edge of the screen. The photo cell keeps the image's proportions, so the category labels stay on their photos.
 */
export function PromoBanner({ locale, meta }: { locale: Locale; meta: MetaDTO }) {
  const t = getT(locale);
  // Break the headline after its comma ("More to enjoy, / less to pay") and colour the second half.
  const [head, ...rest] = t("home.bannerTitle").split(", ");
  const trust: [IconName, string][] = [
    ["checkc", t("home.trustVat")],
    ["refund", t("home.trustRefund", { days: meta.refundWindowDays })],
    ["lock", t("home.trustSecure")],
    ["store", t("home.trustLocal")],
  ];
  const cities = new Intl.ListFormat(LOCALE_LABELS[locale].intl, { type: "conjunction" }).format(meta.cities.map((c) => loc(c.name, locale)));

  return (
    <section className="promo" aria-labelledby="promo-h">
      <span className="promo-mark" aria-hidden="true"><LogoSymbol height={520} /></span>
      <div className="promo-copy">
        {cities && <p className="promo-eyebrow"><Icon name="pin" />{cities}</p>}
        <h2 id="promo-h">
          {rest.length ? <>{head},<br /><span className="promo-accent">{rest.join(", ")}</span></> : head}
        </h2>
        <p className="promo-lead">{t("home.bannerLead")}</p>
        <div className="promo-actions">
          <Link className="btn btn-primary promo-cta" href={`/${locale}/deals`}>
            {t("home.bannerCta")} <Icon name="right" />
          </Link>
          <Link className="btn promo-cta-2" href={`/${locale}#how`}>{t("home.howTitle")}</Link>
        </div>
        <ul className="promo-trust">
          {trust.map(([icon, label]) => <li key={icon}><Icon name={icon} />{label}</li>)}
        </ul>
      </div>
      <div className="promo-art">
        <div className="promo-frame">
          <img src="/banner/home-services.webp" alt="" width={1434} height={724} fetchPriority="high" />
          {PANELS.map((p) => {
            const c = meta.categories.find((x) => x.id === p.category);
            return c ? (
              <Link key={p.category} className="promo-tag" style={{ left: p.left }} href={`/${locale}/deals?category=${p.category}`}>
                {loc(c.name, locale)}
              </Link>
            ) : null;
          })}
        </div>
      </div>
    </section>
  );
}
