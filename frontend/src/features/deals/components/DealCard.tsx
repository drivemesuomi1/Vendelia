"use client";

import Link from "next/link";
import type { DealSummaryDTO } from "@vendelia/shared";
import { Icon, type IconName } from "@/components/ui/Icon";
import { useI18n } from "@/i18n/I18nProvider";
import { useAppData } from "@/lib/meta-context";
import { discountPct, formatMoney, loc } from "@/lib/format";
import { useCart } from "@/features/cart/store";

export function DealCard({ deal }: { deal: DealSummaryDTO }) {
  const { t, locale } = useI18n();
  const { meta } = useAppData();
  const cart = useCart();
  const category = meta.categories.find((c) => c.id === deal.categoryId);
  const city = meta.cities.find((c) => c.id === deal.cityId);
  const href = `/${locale}/deals/${deal.slug}`;
  const multi = deal.optionCount > 1;
  const off = discountPct(deal.fromPriceCents, deal.referencePriceCents);

  return (
    <article className="card deal">
      <Link className="media" href={href} tabIndex={-1} aria-hidden="true">
        <img src={deal.imageUrl} alt="" loading="lazy" />
        {category && (
          <span className="chip">
            <Icon name={category.icon as IconName} />
            {loc(category.name, locale)}
          </span>
        )}
      </Link>
      <div className="body">
        <div className="meta"><span>{deal.merchantName}</span></div>
        <div className="meta" style={{ marginTop: -4 }}>
          <Icon name="pin" />
          <span>{loc(city?.name, locale)}{loc(deal.area, locale) ? `, ${loc(deal.area, locale)}` : ""}</span>
        </div>
        <h3><Link href={href}>{loc(deal.title, locale)}</Link></h3>
        <p className="restrict">{loc(deal.restrictions, locale)}</p>
        <div className="price-row">
          {multi && <span className="from">{t("deal.from")}</span>}
          <span className="price">{formatMoney(deal.fromPriceCents, locale)}</span>
          {off !== null && (
            <>
              <span className="ref"><span className="sr-only">{t("deal.referencePrice")} </span>{formatMoney(deal.referencePriceCents!, locale)}</span>
              <span className="chip teal">−{off} %</span>
            </>
          )}
        </div>
        <p className="hint">{t("deal.cardHint")}</p>
        {multi ? (
          <Link className="btn btn-secondary btn-sm" href={href} style={{ marginTop: 8 }}>{t("deal.chooseOption")}</Link>
        ) : (
          <button
            className="btn btn-secondary btn-sm"
            style={{ marginTop: 8 }}
            disabled={!deal.defaultOptionId}
            onClick={() => deal.defaultOptionId && cart.add({ dealId: deal.id, optionId: deal.defaultOptionId, qty: 1 })}
          >
            <Icon name="cart" />
            {t("deal.addToCart")}
          </button>
        )}
      </div>
    </article>
  );
}

export function DealGrid({ deals }: { deals: DealSummaryDTO[] }) {
  return (
    <div className="grid deals">
      {deals.map((d) => <DealCard key={d.id} deal={d} />)}
    </div>
  );
}
