import Link from "next/link";
import { Icon } from "@/components/ui/Icon";
import { Notice } from "@/components/ui/Notice";
import { getT, resolveLocale } from "@/i18n/server";
import { getMeta, listDeals } from "@/features/deals/api";
import { CategoryBar } from "@/features/deals/components/CategoryBar";
import { DealGrid } from "@/features/deals/components/DealCard";
import { PromoBanner } from "@/features/deals/components/PromoBanner";
import { formatPct } from "@/lib/format";

/** Home: promo banner, categories, current deals, how it works, merchant sign-up. */
export default async function HomePage({ params }: { params: Promise<{ locale: string }> }) {
  const locale = await resolveLocale(params);
  const t = getT(locale);
  const [meta, deals] = await Promise.all([getMeta(), listDeals()]);

  return (
    <main className="home">
      <div className="wrap">
        <h1 className="sr-only">{t("home.title")}</h1>
        <PromoBanner locale={locale} meta={meta} />
        <CategoryBar />

        <section aria-labelledby="live">
          <div className="sec-head">
            <h2 id="live">{t("home.current")}</h2>
            <Link className="btn btn-ghost" href={`/${locale}/deals`}>{t("home.seeAll")} <Icon name="right" /></Link>
          </div>
          {deals.length ? (
            <DealGrid deals={deals.slice(0, 8)} />
          ) : (
            <div className="card empty">
              <p style={{ fontWeight: 600 }}>{t("home.emptyTitle")}</p>
              <p className="muted" style={{ marginTop: 6, maxWidth: 520, marginInline: "auto" }}>{t("home.emptyText")}</p>
              <Link className="btn btn-primary" style={{ marginTop: "var(--s2)" }} href={`/${locale}/register/business`}>{t("home.bizJoin")}</Link>
            </div>
          )}
        </section>

        <div className="trustbar">
          <div><Icon name="checkc" />{t("home.trustVat")}</div>
          <div><Icon name="refund" />{t("home.trustRefund", { days: meta.refundWindowDays })}</div>
          <div><Icon name="lock" />{t("home.trustSecure")}</div>
          <div><Icon name="store" />{t("home.trustLocal")}</div>
        </div>

        <section aria-labelledby="how-h" id="how">
          <div className="sec-head"><h2 id="how-h">{t("home.howTitle")}</h2></div>
          <div className="grid steps">
            {[1, 2, 3, 4].map((n) => (
              <div className="card pad step" key={n}>
                <div className="n">{n}</div>
                <h3>{t(`home.step${n}Title`)}</h3>
                <p className="muted" style={{ marginTop: 6 }}>{t(`home.step${n}Text`)}</p>
              </div>
            ))}
          </div>
          <Notice className="mt" icon="refund"><p><b>{t("home.refundTitle", { days: meta.refundWindowDays })}</b> {t("home.refundText", { days: meta.refundWindowDays, months: meta.voucherValidityMonths })}</p></Notice>
        </section>

        <section aria-labelledby="biz">
          <div className="merchant-cta">
            <div>
              <h2 id="biz">{t("home.bizTitle")}</h2>
              <p style={{ opacity: 0.85, marginTop: 12, maxWidth: 520 }}>{t("home.bizText")}</p>
              <div className="row wrap-row" style={{ marginTop: "var(--s3)" }}>
                <Link className="btn btn-primary" href={`/${locale}/register/business`}>{t("home.bizJoin")}</Link>
              </div>
            </div>
            <ul>
              <li><Icon name="check" /><span>{t("home.bizPoint1", { rate: formatPct(meta.commissionBps, locale) })}</span></li>
              <li><Icon name="check" /><span>{t("home.bizPoint2")}</span></li>
              <li><Icon name="check" /><span>{t("home.bizPoint3")}</span></li>
            </ul>
          </div>
        </section>
      </div>
    </main>
  );
}
