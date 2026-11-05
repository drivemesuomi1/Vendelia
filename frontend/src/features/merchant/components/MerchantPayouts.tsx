'use client';

import { Fragment, useEffect, useState } from 'react';
import Link from 'next/link';
import type { MerchantPayoutPreviewDTO } from '@vendelia/shared';
import { useI18n } from '@/i18n/I18nProvider';
import { api, ApiError } from '@/lib/api-client';
import { formatMoney, formatPct, itemTitle } from '@/lib/format';
import { dateTime } from '@/features/admin/format';
import { Icon } from '@/components/ui/Icon';
import { Notice } from '@/components/ui/Notice';
import { examplePayoutPreview, payoutPreviewTotals } from '../payout-preview';

export function MerchantPayouts() {
  const { t, locale } = useI18n();
  const tr = (key: string) => t(`business.payoutPreview.${key}`);
  const [data, setData] = useState<MerchantPayoutPreviewDTO | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [example, setExample] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [version, setVersion] = useState(0);
  useEffect(() => {
    let active = true;
    setLoading(true); setError(null);
    api<MerchantPayoutPreviewDTO>('/api/merchant/payouts')
      .then(value => { if (active) setData(value); })
      .catch(e => { if (active) setError(e instanceof ApiError ? e.code : 'network'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [version]);
  const current = example ? examplePayoutPreview(data?.commissionBps, data?.commissionVatBps) : data;
  const rows = current?.rows ?? [];
  const totals = payoutPreviewTotals(rows);
  const query = search.trim().toLocaleLowerCase(locale);
  const visible = rows.filter(row => `${row.code} ${row.orderNumber} ${itemTitle(row.title, null, row.optionLabel, locale)}`.toLocaleLowerCase(locale).includes(query));
  const money = (cents: number) => formatMoney(cents, locale);
  const ready = example || (!loading && !!data && !error);
  const metrics: [string, string, string][] = [
    ['gross', money(totals.grossCents), 'grossHint'],
    ['fees', money(totals.feeCents), 'feesHint'],
    ['redeemed', String(totals.count), 'redeemedHint'],
  ];
  return (
    <div className="adm payout-page">
      <header className="adm-head">
        <div><p className="payout-eyebrow">{tr('eyebrow')}</p><h1>{tr('title')}</h1><p className="muted small">{tr('subtitle')}</p></div>
        <div className="row wrap-row" style={{ gap: 8 }}>
          <button className="btn btn-ghost btn-sm" onClick={() => { setExample(!example); setExpanded(null); setSearch(''); }}>{tr(example ? 'showOwn' : 'showExample')}</button>
          <button className="btn btn-secondary btn-sm" disabled={loading || example} onClick={() => setVersion(v => v + 1)}><Icon name="clock" />{tr('refresh')}</button>
        </div>
      </header>
      <Notice tone={example ? 'warn' : 'indigo'} icon="info">{tr(example ? 'exampleNotice' : 'previewNotice')}</Notice>
      {error && !example && <Notice tone="danger" icon="xc">{t(`errors.${error}`)} <button className="btn btn-ghost btn-sm" onClick={() => setVersion(v => v + 1)}>{tr('retry')}</button></Notice>}
      {loading && !example ? <div className="panel payout-loading" role="status">{tr('loading')}</div> : ready && <>
        <section className="payout-overview" aria-label={tr('summary')}>
          <div className="payout-projection">
            <div className="row between"><span className="payout-symbol"><Icon name="bank" /></span><span className="chip">{tr('preview')}</span></div>
            <p>{tr('projected')}</p><strong className="payout-amount">{money(totals.payoutCents)}</strong>
            <p className="payout-projection-note">{tr('projectionNote')}</p>
            <div className="payout-schedule"><Icon name="clock" /><span>{tr('schedule')}</span></div>
          </div>
          <div className="payout-metrics">
            {metrics.map(([label, value, hint]) => <div className="panel payout-metric" key={label}><span className="muted small">{tr(label)}</span><strong>{value}</strong><span className="muted small">{tr(hint)}</span></div>)}
          </div>
        </section>
        {rows.some(r => r.test) && <p className="payout-test-note"><Icon name="info" />{t('business.payoutPreview.testIncluded', { amount: money(totals.testPayoutCents) })}</p>}
        {current?.hasMore && <Notice tone="warn">{tr('limited')}</Notice>}
        <section className="panel">
          <div className="panel-h payout-table-header"><div><h2>{tr('activity')}</h2><p className="muted small">{tr('activityHint')}</p></div><label className="payout-search"><Icon name="search" /><input aria-label={tr('search')} placeholder={tr('search')} value={search} onChange={e => setSearch(e.target.value)} /></label></div>
          {!rows.length ? <div className="empty-state"><span className="attn-ic indigo"><Icon name="ticket" /></span><h3>{tr('emptyTitle')}</h3><p className="muted">{tr('emptyText')}</p><Link className="btn btn-primary" href={`/${locale}/business/redeem`}><Icon name="scan" />{t('business.redeem')}</Link></div>
          : !visible.length ? <p className="payout-loading">{tr('noResults')}</p> : <div className="table-wrap"><table className="payout-table"><thead><tr><th>{tr('voucher')}</th><th>{tr('redeemedAt')}</th><th className="num">{tr('gross')}</th><th className="num">{tr('fees')}</th><th className="num">{tr('earnings')}</th><th><span className="sr-only">{tr('details')}</span></th></tr></thead><tbody>{visible.map(row => {
            const open = expanded === row.code;
            const facts: [string, string][] = [[tr('order'), row.orderNumber], [tr('issuedAt'), dateTime(row.issuedAt, locale)], [tr('saleVat'), `${money(row.saleVatCents)} (${formatPct(row.vatBps, locale)})`], [tr('netSale'), money(row.netCents)], [tr('commission'), `${money(row.commissionCents)} (${formatPct(current!.commissionBps, locale)})`], [tr('commissionVat'), `${money(row.commissionVatCents)} (${formatPct(current!.commissionVatBps, locale)})`]];
            return <Fragment key={row.code}><tr><td><button className="payout-code" aria-expanded={open} aria-controls={`detail-${row.code}`} onClick={() => setExpanded(open ? null : row.code)}>{row.code}</button><span className="payout-deal">{itemTitle(row.title, null, row.optionLabel, locale)}</span>{row.test && <span className="chip warn">{tr('test')}</span>}</td><td className="small">{dateTime(row.redeemedAt, locale)}</td><td className="num">{money(row.grossCents)}</td><td className="num muted">−{money(row.feeCents)}</td><td className="num"><strong>{money(row.payoutCents)}</strong><span className="payout-estimate">{tr('estimate')}</span></td><td><button className="btn btn-ghost btn-sm" aria-expanded={open} aria-controls={`detail-${row.code}`} onClick={() => setExpanded(open ? null : row.code)}>{tr(open ? 'close' : 'details')}</button></td></tr>{open && <tr id={`detail-${row.code}`} className="payout-expanded"><td colSpan={6}><div className="payout-breakdown"><div><h3>{tr('breakdown')}</h3><p className="muted small">{tr('calculation')}</p>{row.dealSlug && <Link className="row-link" href={`/${locale}/deals/${row.dealSlug}`}>{tr('viewDeal')} →</Link>}</div><dl className="facts">{facts.map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}<div className="payout-detail-total"><dt>{tr('earnings')}</dt><dd>{money(row.payoutCents)}</dd></div></dl></div></td></tr>}</Fragment>;
          })}</tbody></table></div>}
        </section>
        <footer className="payout-footer"><Icon name="help" /><p>{tr('footer')}</p></footer>
      </>}
    </div>
  );
}
