"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type KeyboardEvent, type PointerEvent, type ReactNode } from "react";
import type { DealSummaryDTO } from "@vendelia/shared";
import { Icon, type IconName } from "@/components/ui/Icon";
import { LogoSymbol } from "@/components/ui/Logo";
import type { Locale } from "@/i18n/config";
import { useI18n } from "@/i18n/I18nProvider";
import { formatMoney, formatPct, loc } from "@/lib/format";
import { useAppData } from "@/lib/meta-context";

/** Labels over the three photos in the services image, left to right; `left` is where each photo starts at the bottom edge. */
const PANELS = [
  { category: "cleaning", left: "6%" },
  { category: "beauty", left: "39%" },
  { category: "chauffeur", left: "69%" },
];
const AND: Record<Locale, string> = { fi: "ja", sv: "och", en: "and" };

type Slide = { kind: "services" } | { kind: "deal"; deal: DealSummaryDTO } | { kind: "business" };

/**
 * Full-width home hero as a carousel: the services slide, one slide per featured deal and a slide for businesses.
 * The copy lines up with the header's content edge and the picture runs to the right edge of the screen.
 * Changes slide every 7 s (the progress bar's CSS animation drives it, so hover/focus/pause stop it for free);
 * arrows, the slide bars, Left/Right keys and swiping move between slides.
 */
export function PromoBanner({ deals }: { deals: DealSummaryDTO[] }) {
  const { t, locale } = useI18n();
  const { meta } = useAppData();
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const swipeStart = useRef<number | null>(null);

  const slides: Slide[] = [{ kind: "services" }, ...deals.slice(0, 4).map((deal) => ({ kind: "deal" as const, deal })), { kind: "business" }];
  const count = slides.length;
  const go = (n: number) => setIndex((n + count) % count);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) setPaused(true);
  }, []);

  function onKey(e: KeyboardEvent) {
    const tag = (e.target as HTMLElement).tagName;
    if (tag === "INPUT" || tag === "TEXTAREA") return;
    if (e.key === "ArrowRight") (e.preventDefault(), go(index + 1));
    else if (e.key === "ArrowLeft") (e.preventDefault(), go(index - 1));
  }
  function onPointerDown(e: PointerEvent) {
    swipeStart.current = e.pointerType === "mouse" ? null : e.clientX;
  }
  function onPointerUp(e: PointerEvent) {
    if (swipeStart.current === null) return;
    const dx = e.clientX - swipeStart.current;
    swipeStart.current = null;
    if (Math.abs(dx) > 50) go(index + (dx < 0 ? 1 : -1));
  }

  const names = meta.cities.map((c) => loc(c.name, locale));
  const cities = names.length > 1 ? `${names.slice(0, -1).join(", ")} ${AND[locale]} ${names.at(-1)}` : names[0] ?? "";
  const slideLabel = (k: number) => t("home.slide", { n: k + 1, m: count });

  return (
    <section
      className={`promo ${paused ? "paused" : ""}`}
      aria-roledescription="carousel"
      aria-label={t("home.featured")}
      onKeyDown={onKey}
      onPointerDown={onPointerDown}
      onPointerUp={onPointerUp}
    >
      <span className="promo-mark" aria-hidden="true"><LogoSymbol height={520} /></span>
      <div className="promo-track">
        {slides.map((s, k) => (
          <div
            key={s.kind === "deal" ? s.deal.id : s.kind}
            className={`promo-slide promo-slide--${s.kind} ${k === index ? "on" : ""}`}
            role="group"
            aria-roledescription="slide"
            aria-label={slideLabel(k)}
            aria-hidden={k !== index}
            inert={k !== index || undefined}
          >
            {s.kind === "services" && <ServicesSlide cities={cities} first={k === 0} />}
            {s.kind === "deal" && <DealSlide deal={s.deal} />}
            {s.kind === "business" && <BusinessSlide />}
          </div>
        ))}
      </div>

      {count > 1 && (
        <div className="promo-ctrls">
          <button type="button" className="promo-arrow" onClick={() => go(index - 1)} aria-label={t("home.prev")}><Icon name="left" /></button>
          <div className="promo-bars">
            {slides.map((s, k) => (
              <button key={k} type="button" className="promo-bar" onClick={() => go(k)} aria-label={slideLabel(k)} aria-current={k === index}>
                {/* The key restarts the fill animation whenever this bar becomes active. */}
                <i key={k === index ? `on-${index}` : "off"} onAnimationEnd={(e) => e.animationName === "promo-fill" && go(index + 1)} />
              </button>
            ))}
          </div>
          <button type="button" className="promo-arrow" onClick={() => go(index + 1)} aria-label={t("home.next")}><Icon name="right" /></button>
          <button type="button" className="promo-arrow promo-pause" onClick={() => setPaused((p) => !p)} aria-label={t(paused ? "home.play" : "home.pause")} aria-pressed={paused}>
            <Icon name={paused ? "play" : "pause"} />
          </button>
        </div>
      )}
    </section>
  );
}

function SlideLayout({ copy, art }: { copy: ReactNode; art: ReactNode }) {
  return (
    <>
      <div className="promo-copy">{copy}</div>
      <div className="promo-art">{art}</div>
    </>
  );
}

function ServicesSlide({ cities, first }: { cities: string; first: boolean }) {
  const { t, locale } = useI18n();
  const { meta } = useAppData();
  // Break the headline after its comma ("More to enjoy, / less to pay") and colour the second half.
  const [head, ...rest] = t("home.bannerTitle").split(", ");
  const trust: [IconName, string][] = [
    ["checkc", t("home.trustVat")],
    ["refund", t("home.trustRefund", { days: meta.refundWindowDays })],
    ["lock", t("home.trustSecure")],
    ["store", t("home.trustLocal")],
  ];
  return (
    <SlideLayout
      copy={
        <>
          {cities && <p className="promo-eyebrow"><Icon name="pin" />{cities}</p>}
          <h2>{rest.length ? <>{head},<br /><span className="promo-accent">{rest.join(", ")}</span></> : head}</h2>
          <p className="promo-lead">{t("home.bannerLead")}</p>
          <div className="promo-actions">
            <Link className="btn btn-primary promo-cta" href={`/${locale}/deals`}>{t("home.bannerCta")} <Icon name="right" /></Link>
            <Link className="btn promo-cta-2" href={`/${locale}#how`}>{t("home.howTitle")}</Link>
          </div>
          <ul className="promo-trust">
            {trust.map(([icon, label]) => <li key={icon}><Icon name={icon} />{label}</li>)}
          </ul>
        </>
      }
      art={
        <div className="promo-frame">
          <img src="/banner/home-services.webp" alt="" width={1434} height={724} fetchPriority={first ? "high" : undefined} />
          {PANELS.map((p) => {
            const c = meta.categories.find((x) => x.id === p.category);
            return c ? (
              <Link key={p.category} className="promo-tag" style={{ left: p.left }} href={`/${locale}/deals?category=${p.category}`}>
                {loc(c.name, locale)}
              </Link>
            ) : null;
          })}
        </div>
      }
    />
  );
}

function DealSlide({ deal }: { deal: DealSummaryDTO }) {
  const { t, locale } = useI18n();
  const { meta } = useAppData();
  const category = meta.categories.find((c) => c.id === deal.categoryId);
  const city = meta.cities.find((c) => c.id === deal.cityId);
  const href = `/${locale}/deals/${deal.slug}`;
  return (
    <SlideLayout
      copy={
        <>
          {category && <p className="promo-eyebrow"><Icon name={category.icon as IconName} />{loc(category.name, locale)} · {t("home.featured")}</p>}
          <h2 className="promo-h-deal">{loc(deal.title, locale)}</h2>
          <p className="promo-lead"><Icon name="pin" className="promo-inline-ic" />{deal.merchantName} · {[loc(city?.name, locale), loc(deal.area, locale)].filter(Boolean).join(", ")}</p>
          <p className="promo-price">
            {deal.optionCount > 1 && <small>{t("deal.from")}</small>}
            <b>{formatMoney(deal.fromPriceCents, locale)}</b>
            {deal.referencePriceCents && <s>{formatMoney(deal.referencePriceCents, locale)}</s>}
          </p>
          <div className="promo-actions">
            <Link className="btn btn-primary promo-cta" href={href}>{t("home.seeDeal")} <Icon name="right" /></Link>
            <Link className="btn promo-cta-2" href={`/${locale}/deals`}>{t("home.bannerCta")}</Link>
          </div>
        </>
      }
      art={
        <Link className="promo-frame promo-photo" href={href} tabIndex={-1} aria-hidden="true">
          <img src={deal.imageUrl} alt="" loading="lazy" />
        </Link>
      }
    />
  );
}

function BusinessSlide() {
  const { t, locale } = useI18n();
  const { meta } = useAppData();
  const points = [t("home.bizPoint1", { rate: formatPct(meta.commissionBps, locale) }), t("home.bizPoint2"), t("home.bizPoint3")];
  return (
    <SlideLayout
      copy={
        <>
          <p className="promo-eyebrow"><Icon name="store" />{t("nav.forBusinesses")}</p>
          <h2>{t("home.bizTitle")}</h2>
          <p className="promo-lead">{t("home.bizText")}</p>
          <div className="promo-actions">
            <Link className="btn btn-primary promo-cta" href={`/${locale}/register/business`}>{t("home.bizJoin")} <Icon name="right" /></Link>
          </div>
        </>
      }
      art={
        <div className="promo-frame promo-biz-art">
          <div className="promo-biz-card">
            <span className="promo-biz-mark"><LogoSymbol height={36} tight /></span>
            <ul>
              {points.map((p) => <li key={p}><Icon name="checkc" />{p}</li>)}
            </ul>
          </div>
        </div>
      }
    />
  );
}
