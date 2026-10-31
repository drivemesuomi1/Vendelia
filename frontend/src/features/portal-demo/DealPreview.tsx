"use client";

import type { DealInput } from "@vendelia/shared";
import { useI18n } from "@/i18n/I18nProvider";
import { formatMoney, formatPct, loc } from "@/lib/format";
import { useAppData } from "@/lib/meta-context";
import { splitPrice } from "./money";

/** Read-only view of a submitted deal: what the customer will see plus the per-voucher split. */
export function DealPreview({ input, businessName }: { input: DealInput; businessName?: string }) {
  const { t, locale } = useI18n();
  const { meta } = useAppData();
  const category = loc(meta.categories.find((c) => c.id === input.categoryId)?.name, locale);
  const city = loc(meta.cities.find((c) => c.id === input.cityId)?.name, locale);
  const list = (items: string[]) => (items.length ? <ul className="dp-list">{items.map((i, k) => <li key={k}>{i}</li>)}</ul> : <p className="muted small">–</p>);

  return (
    <div className="dp">
      {input.imageUrl && <img className="dp-img" src={input.imageUrl} alt="" />}
      <div>
        <p className="muted small">{[businessName, category, city].filter(Boolean).join(" · ")}</p>
        <h3 className="dp-title">{input.title.fi}</h3>
        {(input.title.sv || input.title.en) && <p className="muted small">{[input.title.sv, input.title.en].filter(Boolean).join(" / ")}</p>}
      </div>
      <p className="dp-desc">{input.description.fi}</p>

      <div>
        <h4>{t("business.options")}</h4>
        <table className="dp-opts">
          <thead>
            <tr><th>{t("business.optionLabel")}</th><th className="num">{t("business.customerPays")}</th><th className="num">{t("business.yourPayout")}</th></tr>
          </thead>
          <tbody>
            {input.options.map((o, i) => (
              <tr key={i}>
                <td>{o.label?.fi || input.title.fi}</td>
                <td className="num">{formatMoney(o.priceCents, locale)}</td>
                <td className="num">{formatMoney(splitPrice(o.priceCents, input.vatBps, meta.commissionBps, meta.commissionVatBps).payoutCents, locale)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="hint" style={{ marginTop: 6 }}>
          {t("business.vatRate")}: {formatPct(input.vatBps, locale)}
          {input.referencePriceCents ? ` · ${t("business.referencePrice")}: ${formatMoney(input.referencePriceCents, locale)}` : ""}
        </p>
      </div>

      <dl className="dp-facts">
        <div><dt>{t("business.street")}</dt><dd>{[input.street, input.zip, input.area].filter(Boolean).join(", ")}</dd></div>
        <div><dt>{t("business.restrictionsShort")}</dt><dd>{input.restrictions.fi || "–"}</dd></div>
      </dl>
      <div className="dp-cols">
        <div><h4>{t("business.inclusions")}</h4>{list(input.inclusions.fi)}</div>
        <div><h4>{t("business.terms")}</h4>{list(input.terms.fi)}</div>
        <div><h4>{t("business.howTo")}</h4>{list(input.howTo.fi)}</div>
      </div>
    </div>
  );
}
