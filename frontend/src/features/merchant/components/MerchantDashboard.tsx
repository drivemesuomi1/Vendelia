"use client";

import Link from 'next/link';
import type { MerchantDealDTO, SessionUserDTO } from '@vendelia/shared';
import { useI18n } from '@/i18n/I18nProvider';
import { formatDate, formatMoney, loc } from '@/lib/format';
import { Icon } from '@/components/ui/Icon';

export function MerchantDashboard({ merchant, deals }: { merchant: NonNullable<SessionUserDTO['merchant']>; deals: MerchantDealDTO[] }) {
  const { t, locale } = useI18n();
  const labels = { draft: 'business.draft', pending: 'business.inReview', live: 'admin.dr.live', rejected: 'admin.dr.rejected' };
  return (
    <div className="adm">
      <header className="adm-head"><div><h1>{t('business.hello', { name: merchant.name })}</h1><p className="muted small">{t('business.myDeals')}</p></div></header>
      <section className="adm-kpis">
        {[['business.statAll', deals.length], ['business.inReview', deals.filter(d => d.status === 'pending').length], ['admin.dr.live', deals.filter(d => d.status === 'live').length], ['admin.dr.rejected', deals.filter(d => d.status === 'rejected').length]].map(([label, count]) => (
          <div className="kpi-tile" key={label}><p className="kt-label">{t(String(label))}</p><p className="kt-value">{count}</p></div>
        ))}
      </section>
      <p className="review-note" style={{ marginTop: 20 }}>{t('business.accountPreview')}</p>
      <section className="panel" style={{ marginTop: 20 }}>
        {!deals.length ? <div className="empty-state"><span className="attn-ic indigo"><Icon name="doc" /></span><h3>{t('business.emptyTitle')}</h3><p className="muted small">{t('business.savedDealsHint')}</p></div> : (
          <ul className="deal-rows">{deals.map(deal => (
            <li key={deal.id}><div className="deal-row">
              {deal.imageUrl && <img className="thumb-md" src={deal.imageUrl} alt="" />}
              <div className="deal-row-main"><div className="row wrap-row"><b>{loc(deal.title, locale)}</b><span className="chip">{t(labels[deal.status])}</span></div>
                <small className="muted">{deal.fromPriceCents !== null ? formatMoney(deal.fromPriceCents, locale) : '–'} · {formatDate(deal.createdAt, locale)}</small>
              </div>
              {merchant.status === 'active' && deal.status === 'live' && <Link className="btn btn-secondary btn-sm" href={`/${locale}/deals/${deal.slug}`}>{t('home.seeDeal')}</Link>}
            </div></li>
          ))}</ul>
        )}
      </section>
    </div>
  );
}

export function MerchantFeaturePending() {
  const { t, locale } = useI18n();
  return <section className="panel empty-state"><h1>{t('business.featurePending')}</h1><p className="muted small">{t('business.accountPreview')}</p><Link className="btn btn-secondary" href={`/${locale}/business`}>{t('business.myDeals')}</Link></section>;
}
