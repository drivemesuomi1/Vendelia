"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { DealSummaryDTO } from "@vendelia/shared";
import { Icon, type IconName } from "@/components/ui/Icon";
import { useI18n } from "@/i18n/I18nProvider";
import { useAppData } from "@/lib/meta-context";
import { formatMoney, loc } from "@/lib/format";

/**
 * Featured deals carousel. The progress bar's CSS animation drives slide changes
 * (animationend → next), so hover, focus and the pause button stop it for free.
 */
export function HeroCarousel({ slides }: { slides: DealSummaryDTO[] }) {
  const { t, locale } = useI18n();
  const { meta } = useAppData();
  const [i, setI] = useState(0);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) setPaused(true);
  }, []);

  if (!slides.length) return null;
  const go = (n: number) => setI((n + slides.length) % slides.length);
  const label = (k: number, d: DealSummaryDTO) => `${t("home.slide", { n: k + 1, m: slides.length })}: ${loc(d.title, locale)}`;

  return (
    <div className={`hero-c ${paused ? "paused" : ""}`} role="region" aria-roledescription="carousel" aria-label={t("home.featured")}>
      {slides.map((d, k) => {
        const category = meta.categories.find((c) => c.id === d.categoryId);
        const city = meta.cities.find((c) => c.id === d.cityId);
        const on = k === i;
        return (
          <Link
            key={d.id}
            className={`hs ${on ? "on" : ""}`}
            href={`/${locale}/deals/${d.slug}`}
            aria-roledescription="slide"
            aria-label={label(k, d)}
            aria-hidden={!on}
            tabIndex={on ? undefined : -1}
          >
            <img src={d.imageUrl} alt="" />
            <div className="hs-txt">
              {category && <span className="chip"><Icon name={category.icon as IconName} />{loc(category.name, locale)}</span>}
              <h2>{loc(d.title, locale)}</h2>
              <p><Icon name="pin" />{d.merchantName} · {loc(city?.name, locale)}, {loc(d.area, locale)}</p>
              <div className="hs-row">
                <span className="hs-price">
                  {d.optionCount > 1 && <small>{t("deal.from")}</small>}
                  {formatMoney(d.fromPriceCents, locale)}
                  {d.referencePriceCents && <s>{formatMoney(d.referencePriceCents, locale)}</s>}
                </span>
                <span className="btn">{t("home.seeDeal")} <Icon name="right" /></span>
              </div>
            </div>
          </Link>
        );
      })}
      <button className="hc-arrow prev" onClick={() => go(i - 1)} aria-label={t("home.prev")}><Icon name="left" /></button>
      <button className="hc-arrow next" onClick={() => go(i + 1)} aria-label={t("home.next")}><Icon name="right" /></button>
      <button className="hc-pause" onClick={() => setPaused((p) => !p)} aria-label={t(paused ? "home.play" : "home.pause")}>
        <Icon name={paused ? "play" : "pause"} />
      </button>
      <div className="hc-tabs">
        {slides.map((d, k) => {
          const category = meta.categories.find((c) => c.id === d.categoryId);
          return (
            <button key={d.id} className="hc-tab" onClick={() => go(k)} aria-label={label(k, d)} aria-current={k === i}>
              <span className="bar">
                {/* key forces the animation to restart for the active tab */}
                <i key={k === i ? `on-${i}` : "off"} onAnimationEnd={(e) => e.animationName === "fill" && go(i + 1)} />
              </span>
              <span className="tl"><small>{loc(category?.name, locale)}</small>{loc(d.title, locale)}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
