"use client";

import Link from "next/link";
import type { DealDetailDTO } from "@vendelia/shared";
import { Icon } from "@/components/ui/Icon";
import { Notice } from "@/components/ui/Notice";
import { useI18n } from "@/i18n/I18nProvider";
import { useState } from "react";
import { useAppData } from "@/lib/meta-context";
import { formatDate, loc, locList, expiryFromToday } from "@/lib/format";
import { BuyBox } from "./BuyBox";


/** Full deal page: what's included, terms, how to use, location, refunds and the seller. */
export function DealDetail({ deal }: { deal: DealDetailDTO }) {
  const { t, locale } = useI18n();
  const { meta } = useAppData();
  const city = meta.cities.find((c) => c.id === deal.cityId);
  const category = meta.categories.find((c) => c.id === deal.categoryId);
  const expiry = formatDate(expiryFromToday(meta.voucherValidityMonths), locale);
  const address = deal.serviceArea
    ? loc(deal.serviceArea, locale)
    : `${deal.meetingPoint ? t("deal.meetingPoint") + " " : ""}${deal.street}, ${deal.zip} ${loc(city?.name, locale)}`;
  const jump = (id: string) => (e: React.MouseEvent) => {
    e.preventDefault();
    const smooth = !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    document.getElementById(id)?.scrollIntoView({ behavior: smooth ? "smooth" : "auto", block: "start" });
  };

  return (
    <div className="has-mobile-buy">
      <main className="wrap">
        <div className="crumbs">
          <Link href={`/${locale}`}>{t("nav.home")}</Link><span aria-hidden="true">›</span>
          <Link href={`/${locale}/deals?category=${deal.categoryId}`}>{loc(category?.name, locale)}</Link><span aria-hidden="true">›</span>
          <span>{loc(city?.name, locale)}</span>
        </div>
        <div className="detail">
          <div className="stack detail-main">
            <Gallery images={[deal.imageUrl, ...(deal.gallery ?? [])]} alt={loc(deal.title, locale)} />
            <div>
              <div className="meta">
                {deal.merchantName} · <Icon name="pin" />{" "}
                {deal.serviceArea ? `${loc(city?.name, locale)}, ${loc(deal.area, locale)}` : `${loc(deal.area, locale)}, ${loc(city?.name, locale)}`}
              </div>
              <h1 style={{ fontSize: "clamp(26px,4vw,36px)", marginTop: 8 }}>{loc(deal.title, locale)}</h1>
              {loc(deal.description, locale).split("\n\n").map((para, k) => (
                <p key={k} className="muted" style={{ marginTop: 12, fontSize: 16, lineHeight: 1.65 }}>{para}</p>
              ))}
            </div>
            <nav className="tabs" aria-label={t("deal.sections")}>
              <a href="#s-sis" onClick={jump("s-sis")}>{t("deal.tabDescription")}</a>
              <a href="#s-ehdot" onClick={jump("s-ehdot")}>{t("deal.terms")}</a>
              <a href="#s-nain" onClick={jump("s-nain")}>{t("deal.tabHowTo")}</a>
              <a href="#s-sijainti" onClick={jump("s-sijainti")}>{t(deal.serviceArea ? "deal.serviceAreaTitle" : "deal.location")}</a>
              <a href="#s-myyja" onClick={jump("s-myyja")}>{t("deal.soldBy")}</a>
            </nav>

            <section className="card pad stack" id="s-sis">
              <h2 style={{ fontSize: 20 }}>{t("deal.included")}</h2>
              <ul className="ticks">{locList(deal.inclusions, locale).map((x) => <li key={x}><Icon name="check" /><span>{x}</span></li>)}</ul>
            </section>

            <section className="card pad stack" id="s-ehdot">
              <h2 style={{ fontSize: 20 }}>{t("deal.terms")}</h2>
              <ul className="dots">
                <li>{t("deal.validityTerm", { months: meta.voucherValidityMonths })}</li>
                {locList(deal.terms, locale).map((x) => <li key={x}>{x}</li>)}
              </ul>
            </section>

            <section className="card pad stack" id="s-nain">
              <h2 style={{ fontSize: 20 }}>{t("deal.howTo")}</h2>
              <ol className="nums">{locList(deal.howTo, locale).map((x) => <li key={x}>{x}</li>)}</ol>
              <Notice tone="indigo" icon="cal"><p>{t("deal.buyTodayValid", { date: expiry })}</p></Notice>
            </section>

            {deal.serviceArea ? (
              <section className="card pad stack" id="s-sijainti">
                <h2 style={{ fontSize: 20 }}>{t("deal.serviceAreaTitle")}</h2>
                <div className="service-area">
                  <Icon name="home" />
                  <div>
                    <p style={{ fontWeight: 600 }}>{t("deal.atYourPlace")}</p>
                    <p className="muted" style={{ marginTop: 4 }}>{address}</p>
                  </div>
                </div>
              </section>
            ) : (
              <section className="card pad stack" id="s-sijainti">
                <h2 style={{ fontSize: 20 }}>{t("deal.location")}</h2>
                <div className="map" role="img" aria-label={t("deal.mapOf", { address })}><Icon name="pin" /></div>
                <p>{address}</p>
              </section>
            )}


            <section className="card pad stack">
              <h2 style={{ fontSize: 20 }}>{t("deal.refundTitle")}</h2>
              <p>{t("deal.refundBody", { days: meta.refundWindowDays })}</p>
            </section>

            <section className="card pad" id="s-myyja">
              <h2 style={{ fontSize: 20, marginBottom: "var(--s2)" }}>{t("deal.soldBy")}</h2>
              <div className="merchant">
                <div className="avatar">{deal.merchant.name.split(" ").map((w) => w[0]).join("").slice(0, 2)}</div>
                <div>
                  <p style={{ fontWeight: 600 }}>{deal.merchant.name}</p>
                  <p className="muted small">{deal.merchant.companyName} · {t("common.businessId")} {deal.merchant.businessId}</p>
                  <p className="muted small">
                    {deal.serviceArea ? "" : `${address} · `}{t("deal.phone")} <a href={`tel:${deal.merchant.phone.replace(/\s/g, "")}`}>{deal.merchant.phone}</a>
                    {deal.merchant.email && <> · <a href={`mailto:${deal.merchant.email}`}>{deal.merchant.email}</a></>}
                  </p>
                  {deal.merchant.website && (
                    <a className="merchant-site" href={deal.merchant.website} target="_blank" rel="noopener noreferrer">
                      <Icon name="globe" />{t("deal.website")}
                    </a>
                  )}
                </div>
              </div>
              <p className="hint" style={{ marginTop: 12 }}>{t("deal.onBehalf")}</p>
            </section>
          </div>
          <BuyBox deal={deal} expiry={expiry} />
        </div>
      </main>
    </div>
  );
}

/** Main photo with thumbnails when the deal has more than one. */
function Gallery({ images, alt }: { images: string[]; alt: string }) {
  const { t } = useI18n();
  const [i, setI] = useState(0);
  return (
    <div className="stack" style={{ gap: 0 }}>
      <div className="gallery"><img src={images[i]} alt={alt} /></div>
      {images.length > 1 && (
        <div className="thumbs">
          {images.map((src, k) => (
            <button key={src} type="button" onClick={() => setI(k)} aria-current={k === i} aria-label={t("deal.photo", { n: k + 1, m: images.length })}>
              <img src={src} alt="" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
