import type { Metadata } from "next";
import Link from "next/link";
import { getT, resolveLocale } from "@/i18n/server";
import { listDeals } from "@/features/deals/api";
import { DealGrid } from "@/features/deals/components/DealCard";
import { DealFilters } from "@/features/deals/components/DealFilters";

type Props = { params: Promise<{ locale: string }>; searchParams: Promise<{ city?: string; category?: string; q?: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  return { title: getT(await resolveLocale(params))("browse.title") };
}

/** Browse: filtered by city/category/search from the URL, rendered on the server. */
export default async function DealsPage({ params, searchParams }: Props) {
  const locale = await resolveLocale(params);
  const t = getT(locale);
  const { city, category, q } = await searchParams;
  const deals = await listDeals({ city, category, q });

  return (
    <main className="wrap">
      <div className="crumbs"><Link href={`/${locale}`}>{t("nav.home")}</Link><span aria-hidden="true">›</span><span>{t("browse.title")}</span></div>
      <div className="sec-head">
        <div>
          <h1 style={{ fontSize: "clamp(26px,4vw,34px)" }}>{t("browse.title")}</h1>
          <p className="muted" style={{ marginTop: 6 }}>
            {t(deals.length === 1 ? "browse.countOne" : "browse.countMany", { n: deals.length })}
            {q ? ` · ”${q}”` : ""}
          </p>
        </div>
      </div>
      <DealFilters city={city} category={category} q={q} />
      {deals.length ? (
        <DealGrid deals={deals} />
      ) : (
        <div className="card empty">
          <p style={{ fontWeight: 600 }}>{t("browse.none")}</p>
          <p className="muted" style={{ marginTop: 6 }}>{t("browse.noneHint")}</p>
          <Link className="btn btn-secondary" style={{ marginTop: "var(--s2)" }} href={`/${locale}/deals`}>{t("browse.clear")}</Link>
        </div>
      )}
    </main>
  );
}
