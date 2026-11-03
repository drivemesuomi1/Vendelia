"use client";

import Link from 'next/link';
import type { DealRecordDTO, MerchantDealCardDTO, SessionUserDTO } from '@vendelia/shared';
import { useI18n } from '@/i18n/I18nProvider';
import { formatDate, formatMoney, loc } from '@/lib/format';
import { useAppData } from '@/lib/meta-context';
import { Breadcrumbs } from '@/components/ui/Breadcrumbs';
import { Icon } from '@/components/ui/Icon';
import { splitPrice } from '@/features/portal-demo/money';
import { DealForm } from './DealForm';

type Merchant = NonNullable<SessionUserDTO['merchant']>;
type Status = MerchantDealCardDTO['status'];

/** Status chip in the business's own words ("In review" rather than the admin's "Waiting for review"). */
function StatusChip({ status }: { status: Status }) {
  const { t } = useI18n();
  if (status === 'live') return <span className="chip teal"><Icon name="checkc" />{t('admin.dr.live')}</span>;
  if (status === 'pending') return <span className="chip warn"><Icon name="clock" />{t('business.inReview')}</span>;
  if (status === 'draft') return <span className="chip"><Icon name="doc" />{t('business.draft')}</span>;
  return <span className="chip danger"><Icon name="xc" />{t('admin.dr.rejected')}</span>;
}

/** Business home: one card per deal with its review state, the admin's feedback, and edit. */
export function MerchantDashboard({ merchant, deals }: { merchant: Merchant; deals: MerchantDealCardDTO[] }) {
  const { t, locale } = useI18n();
  const { meta } = useAppData();
  const base = `/${locale}/business`;
  const count = (s: Status) => deals.filter(d => d.status === s).length;

  return (
    <div className="adm">
      <header className="adm-head">
        <div><h1>{t('business.hello', { name: merchant.name })}</h1><p className="muted small">{t('business.myDealsSub')}</p></div>
        <Link className="btn btn-primary btn-sm" href={`${base}/deals/new`}><Icon name="plus" />{t('business.createDeal')}</Link>
      </header>

      <section className="adm-kpis">
        {([['business.statAll', deals.length], ['business.inReview', count('pending')], ['admin.dr.live', count('live')], ['admin.dr.rejected', count('rejected')]] as const).map(([label, value]) => (
          <div className="kpi-tile" key={label}><p className="kt-label">{t(label)}</p><p className="kt-value">{value}</p></div>
        ))}
      </section>

      {!deals.length ? (
        <section className="panel empty-state" style={{ marginTop: 20 }}>
          <span className="attn-ic indigo"><Icon name="plus" /></span>
          <h3>{t('business.emptyTitle')}</h3>
          <p className="muted small">{t('business.emptyText')}</p>
          <Link className="btn btn-primary btn-sm" href={`${base}/deals/new`}><Icon name="plus" />{t('business.createDeal')}</Link>
        </section>
      ) : (
        <ul className="deal-cards">
          {deals.map(deal => {
            const payout = deal.fromPriceCents !== null
              ? splitPrice(deal.fromPriceCents, deal.vatBps, meta.commissionBps, meta.commissionVatBps).payoutCents : null;
            const live = deal.status === 'live' && merchant.status === 'active';
            return (
              <li key={deal.id} className={`deal-card is-${deal.status}`}>
                <div className="dc-media">
                  {deal.imageUrl ? <img src={deal.imageUrl} alt="" loading="lazy" /> : <span className="dc-noimg"><Icon name="doc" /></span>}
                  <span className="dc-status"><StatusChip status={deal.status} /></span>
                </div>
                <div className="dc-body">
                  <h3 className="dc-title">{loc(deal.title, locale)}</h3>
                  {deal.fromPriceCents !== null && (
                    <p className="dc-price">
                      <span>{t('business.fromPrice', { price: formatMoney(deal.fromPriceCents, locale) })}</span>
                      {payout !== null && <span className="muted">{t('business.youGet', { amount: formatMoney(payout, locale) })}</span>}
                    </p>
                  )}
                  <p className="dc-meta muted">
                    {deal.optionCount > 1 && <>{t('business.optionCount', { n: deal.optionCount })} · </>}
                    {deal.status === 'live' && deal.reviewedAt
                      ? t('business.liveSince', { date: formatDate(deal.reviewedAt, locale) })
                      : t('business.submittedOn', { date: formatDate(deal.submittedAt ?? deal.createdAt, locale) })}
                  </p>
                  {deal.reviewNote && (
                    <p className={`review-note${deal.status === 'rejected' ? '' : ' ok'}`}><span><b>{t('business.rejectedReason')}:</b> {deal.reviewNote}</span></p>
                  )}
                </div>
                <div className="dc-actions">
                  <Link className={`btn btn-sm ${deal.status === 'rejected' ? 'btn-primary' : 'btn-secondary'}`} href={`${base}/deals/${deal.id}/edit`}>
                    {t(deal.status === 'rejected' ? 'business.fixResubmit' : 'business.edit')}
                  </Link>
                  {live && <Link className="btn btn-ghost btn-sm" href={`/${locale}/deals/${deal.slug}`}>{t('business.viewLive')}<Icon name="right" /></Link>}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

/** Create page (no `record`) or edit page for one of the business's own deals. */
export function MerchantDealEditor({ record }: { record?: DealRecordDTO }) {
  const { t, locale } = useI18n();
  return (
    <div className="adm">
      <Breadcrumbs items={[
        { label: t('business.myDeals'), href: `/${locale}/business` },
        ...(record ? [{ label: loc(record.input.title, locale) }, { label: t('business.editDeal') }] : [{ label: t('business.createDeal') }]),
      ]} />
      <header className="adm-head">
        <div>
          <h1>{t(record ? 'business.editDeal' : 'business.createDeal')}</h1>
          <p className="muted small">{t(record?.status === 'live' ? 'business.editLiveNote' : record ? 'business.editNote' : 'business.reviewNote')}</p>
        </div>
      </header>
      {record?.reviewNote && (
        <p className={`review-note${record.status === 'rejected' ? '' : ' ok'}`}><span><b>{t('business.rejectedReason')}:</b> {record.reviewNote}</span></p>
      )}
      <DealForm key={record?.id ?? 'new'} dealId={record?.id} initial={record?.input} />
    </div>
  );
}
