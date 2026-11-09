"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import { LangSwitch } from "@/components/layout/LangSwitch";
import { Icon, type IconName } from "@/components/ui/Icon";
import { LogoSymbol } from "@/components/ui/Logo";
import { useI18n } from "@/i18n/I18nProvider";
import { useAppData } from "@/lib/meta-context";
import { ApiError } from "@/lib/api-client";
import { login } from "../api";

/** Only same-site relative paths are accepted as a post-login destination (no open redirects). */
export function safeNext(next: string | null | undefined, fallback: string) {
  return next && next.startsWith("/") && !next.startsWith("//") && !/[\\\x00-\x20]/.test(next) ? next : fallback;
}

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
 * Customer sign-in, full screen like the portal sign-ins: a brand panel with photos (hidden on phones), and the form. Motion stops for people who prefer reduced motion.
 */
export function LoginForm({ next, demo = false }: { next?: string; demo?: boolean }) {
  const { t, locale } = useI18n();
  const { meta } = useAppData();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [slide, setSlide] = useState(0);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const timer = setInterval(() => setSlide((s) => (s + 1) % SLIDES.length), SLIDE_MS);
    return () => clearInterval(timer);
  }, []);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await login({ email, password });
      router.push(safeNext(next, `/${locale}`));
      router.refresh();
    } catch (e2) {
      setError(t(`errors.${e2 instanceof ApiError ? e2.code : "network"}`));
      setBusy(false);
    }
  }

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

        <form className="signin-form" onSubmit={submit} noValidate>
          <div className="signin-mobile-mark"><LogoSymbol height={32} /></div>
          <div>
            <h1>{t("auth.loginTitle")}</h1>
            <p className="muted">{t("auth.loginSub")}</p>
          </div>

          {error && <p className="signin-err" role="alert"><Icon name="xc" />{error}</p>}

          <label className="signin-field">
            <span>{t("checkout.email")}</span>
            <span className="signin-box">
              <Icon name="mail" />
              <input type="email" autoComplete="email" inputMode="email" autoFocus value={email} onChange={(e) => setEmail(e.target.value)} required aria-invalid={error ? true : undefined} />
            </span>
          </label>
          <label className="signin-field">
            <span>{t("auth.password")}</span>
            <span className="signin-box">
              <Icon name="lock" />
              <input type={show ? "text" : "password"} autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} required aria-invalid={error ? true : undefined} />
              <button type="button" className="signin-eye" onClick={() => setShow((v) => !v)} aria-pressed={show}>{t(show ? "admin.login.hide" : "admin.login.show")}</button>
            </span>
          </label>

          <button className="btn btn-primary btn-block signin-submit" type="submit" disabled={busy || !email || !password}>
            {busy ? <><span className="signin-spin" aria-hidden="true" />{t("admin.login.signingIn")}</> : <>{t("auth.login")}<Icon name="right" /></>}
          </button>

          <div className="signin-alt">
            <p>{t("auth.noAccount")} <Link href={`/${locale}/register${next ? `?next=${encodeURIComponent(next)}` : ""}`}>{t("auth.createAccount")}</Link></p>
            <Link className="signin-biz" href={`/${locale}/register/business`}><Icon name="store" />{t("auth.forBusinesses")}<Icon name="right" /></Link>
          </div>
          {demo && (
            <Link className="signin-demo" href={`/${locale}/account/demo`}>
              <span><Icon name="eye" /></span>
              <span><b>{t("account.demoCta")}</b><small>{t("account.demoCtaHint")}</small></span>
              <Icon name="right" />
            </Link>
          )}
        </form>
      </section>
    </main>
  );
}
