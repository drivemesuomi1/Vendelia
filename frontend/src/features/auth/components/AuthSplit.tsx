"use client";

import Link from "next/link";
import { useEffect, useState, type ReactNode } from "react";
import { LangSwitch } from "@/components/layout/LangSwitch";
import { Icon, type IconName } from "@/components/ui/Icon";
import { LogoSymbol } from "@/components/ui/Logo";
import { useI18n } from "@/i18n/I18nProvider";
import { useAppData } from "@/lib/meta-context";

const PERKS: [IconName, string][] = [["ticket", "auth.perkVouchers"], ["refund", "auth.perkRefund"], ["gift", "auth.perkGift"]];
/** Photos behind the brand panel, shown in turn with a slow zoom. */
const SLIDES = [
  { src: "/deals/cleava/kotisiivous.webp", position: "50% 40%" },
  { src: "/banner/home-services.webp", position: "52% 50%" },
  { src: "/deals/cleava/tiimi.webp", position: "50% 30%" },
  { src: "/deals/cleava/pinnat.webp", position: "50% 55%" },
];
const SLIDE_MS = 6000;

/**
 * Full-screen split used by customer sign-in and registration: a brand panel with photos and what an account gives
 * (hidden on phones), and the form beside it. Motion stops for people who prefer reduced motion.
 */
export function AuthSplit({ children }: { children: ReactNode }) {
  const { t, locale } = useI18n();
  const { meta } = useAppData();
  const [slide, setSlide] = useState(0);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const timer = setInterval(() => setSlide((s) => (s + 1) % SLIDES.length), SLIDE_MS);
    return () => clearInterval(timer);
  }, []);

  return (
    <main className="signin">
      <aside className="signin-brand" aria-hidden="true">
        <div className="signin-slides">
          {SLIDES.map((s, i) => (
            <img key={s.src} src={s.src} alt="" className={i === slide ? "is-on" : undefined} style={{ objectPosition: s.position }} />
          ))}
        </div>
        <div className="signin-shade" />

        <Link href={`/${locale}`} className="signin-mark" tabIndex={-1}><LogoSymbol height={30} tight /></Link>

        <div className="signin-copy">
          <p className="signin-eyebrow">Vendelia</p>
          <p className="signin-claim">{t("auth.loginClaim")}</p>
          <ul className="signin-perks">
            {PERKS.map(([icon, key], i) => (
              <li key={key} style={{ animationDelay: `${240 + i * 110}ms` }}>
                <span><Icon name={icon} /></span>{t(key, { days: meta.refundWindowDays })}
              </li>
            ))}
          </ul>
          <div className="signin-dots">
            {SLIDES.map((s, i) => <span key={s.src} className={i === slide ? "is-on" : undefined} />)}
          </div>
        </div>
      </aside>

      <section className="signin-main">
        <div className="signin-top">
          <Link className="signin-back" href={`/${locale}`}><Icon name="left" />{t("business.backToSite")}</Link>
          <LangSwitch />
        </div>
        {children}
      </section>
    </main>
  );
}

/** Shown above the form when the visitor was sent here by "Add to cart". */
export function CartReason() {
  const { t } = useI18n();
  return <p className="signin-reason" role="status"><Icon name="cart" />{t("auth.cartReason")}</p>;
}
