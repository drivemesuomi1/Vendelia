import Link from "next/link";
import type { MetaDTO } from "@vendelia/shared";
import { Icon } from "@/components/ui/Icon";
import { LogoSymbol } from "@/components/ui/Logo";
import { getT } from "@/i18n/server";
import type { Locale } from "@/i18n/config";
import { loc } from "@/lib/format";

/** Labels over the three photos in the banner image, left to right; `left` is where each photo starts at the bottom edge. */
const PANELS = [
  { category: "cleaning", left: "6%" },
  { category: "beauty", left: "39%" },
  { category: "chauffeur", left: "69%" },
];

/** Home banner: brand, headline and call to action, with the services photo and its category links. */
export function PromoBanner({ locale, meta }: { locale: Locale; meta: MetaDTO }) {
  const t = getT(locale);
  // Break the headline after its comma, as in the banner design ("More to enjoy, / less to pay").
  const [head, ...rest] = t("home.bannerTitle").split(", ");

  return (
    <section className="promo" aria-labelledby="promo-h">
      <div className="promo-copy">
        <p className="promo-brand"><LogoSymbol height={32} /><span>Vendelia</span></p>
        <h2 id="promo-h">{rest.length ? <>{head},<br />{rest.join(", ")}</> : head}</h2>
        <p className="promo-lead">{t("home.bannerLead")}</p>
        <Link className="btn btn-primary promo-cta" href={`/${locale}/deals`}>
          {t("home.bannerCta")} <Icon name="right" />
        </Link>
      </div>
      <div className="promo-art">
        <div className="promo-frame">
          <img src="/banner/home-services.webp" alt="" width={1434} height={724} />
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
