"use client";

import Link from "next/link";
import { useEffect, useRef, type ReactNode } from "react";
import { LangSwitch } from "@/components/layout/LangSwitch";
import { Icon, type IconName } from "@/components/ui/Icon";
import { LogoSymbol } from "@/components/ui/Logo";
import { useI18n } from "@/i18n/I18nProvider";
import { useAppData } from "@/lib/meta-context";

const PERKS: [IconName, string][] = [["ticket", "auth.perkVouchers"], ["refund", "auth.perkRefund"], ["gift", "auth.perkGift"]];
/** Small glass chips floating around the vouchers. */
const CHIPS: IconName[] = ["pin", "gift", "refund"];

/** One drawn voucher: logo and placeholder lines above the perforation, a barcode on the stub. No text, purely decorative. */
function Ticket({ front = false }: { front?: boolean }) {
  return (
    <div className={`tk${front ? " tk-front" : ""}`}>
      <div className="tk-body">
        <span className="tk-logo"><LogoSymbol height={18} tight /></span>
        <span className="tk-line" /><span className="tk-line short" />
      </div>
      <div className="tk-stub">
        <span className="tk-code" />
        {front && (
          <span className="tk-check">
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5" /></svg>
          </span>
        )}
      </div>
    </div>
  );
}

/**
 * Full-screen split used by customer sign-in, registration and the business application: a decorative brand panel
 * (drifting light and a fan of vouchers that tilts toward the pointer; hidden on phones) with the form beside it.
 * `panel={false}` drops the panel for a single centred column. Motion stops for people who prefer reduced motion.
 */
export function AuthSplit({ children, panel = true }: { children: ReactNode; panel?: boolean }) {
  const { t, locale } = useI18n();
  const { meta } = useAppData();
  const brand = useRef<HTMLElement>(null);

  useEffect(() => {
    const el = brand.current;
    if (!el || window.matchMedia("(prefers-reduced-motion: reduce)").matches || !window.matchMedia("(hover: hover)").matches) return;
    let frame = 0;
    const move = (e: PointerEvent) => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const r = el.getBoundingClientRect();
        el.style.setProperty("--px", ((e.clientX - r.left) / r.width - 0.5).toFixed(3));
        el.style.setProperty("--py", ((e.clientY - r.top) / r.height - 0.5).toFixed(3));
      });
    };
    const leave = () => { el.style.setProperty("--px", "0"); el.style.setProperty("--py", "0"); };
    el.addEventListener("pointermove", move);
    el.addEventListener("pointerleave", leave);
    return () => { cancelAnimationFrame(frame); el.removeEventListener("pointermove", move); el.removeEventListener("pointerleave", leave); };
  }, []);

  return (
    <main className={`signin${panel ? "" : " no-panel"}`}>
      {panel && <aside className="signin-brand" aria-hidden="true" ref={brand}>
        <span className="signin-glow a" /><span className="signin-glow b" />
        <span className="signin-grid" />
        <Link href={`/${locale}`} className="signin-mark" tabIndex={-1}><LogoSymbol height={30} tight /></Link>
        <div className="signin-stage">
          <div className="signin-fan">
            <Ticket /><Ticket /><Ticket front />
            {CHIPS.map((icon) => <span key={icon} className={`signin-chip c-${icon}`}><Icon name={icon} /></span>)}
          </div>
        </div>
        <ul className="signin-perks">
          {PERKS.map(([icon, key]) => (
            <li key={key}><Icon name={icon} />{t(key, { days: meta.refundWindowDays })}</li>
          ))}
        </ul>
      </aside>}

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
