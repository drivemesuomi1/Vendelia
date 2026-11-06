'use client';

import { Fragment, useEffect, useState, type FormEvent } from 'react';
import Link from 'next/link';
import type { AdminRefundListDTO, AdminVoucherDTO } from '@vendelia/shared';
import { VOUCHER_CODE_RE } from '@vendelia/shared';
import { Field, TextInput } from '@/components/ui/Field';
import { Icon } from '@/components/ui/Icon';
import { Notice } from '@/components/ui/Notice';
import { useI18n } from '@/i18n/I18nProvider';
import { api, ApiError } from '@/lib/api-client';
import { formatMoney, itemTitle } from '@/lib/format';
import { dateTime } from '../format';
import { supportRefund } from '../api';

/** Real database refunds only. Review the purchase before the atomic state change. */
export function RefundsPanel() {
  const { t, locale } = useI18n();
  const tr = (key: string) => t(`admin.refundScreen.${key}`);
  const [code, setCode] = useState('');
  const [voucher, setVoucher] = useState<AdminVoucherDTO | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [data, setData] = useState<AdminRefundListDTO | null>(null);
  const [listError, setListError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [version, setVersion] = useState(0);
  const [search, setSearch] = useState('');
  const [expanded, setExpanded] = useState<string | null>(null);
  useEffect(() => {
    let active = true;
    setLoading(true); setListError(null);
    api<AdminRefundListDTO>('/api/admin/refunds')
      .then(value => { if (active) setData(value); })
      .catch(e => { if (active) setListError(e instanceof ApiError ? e.code : 'network'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [version]);
  async function lookup(e: FormEvent) {
    e.preventDefault(); setError(null); setVoucher(null); setDone(false);
    const normalized = code.trim().toUpperCase();
    if (!VOUCHER_CODE_RE.test(normalized)) { setError('invalidVoucherCode'); return; }
    setBusy(true);
    try { setVoucher((await api<{ voucher: AdminVoucherDTO }>(`/api/admin/vouchers/${encodeURIComponent(normalized)}`)).voucher); }
    catch (e) { setError(e instanceof ApiError ? e.code : 'network'); }
    finally { setBusy(false); }
  }
  async function refund() {
    if (!voucher || busy) return;
    setBusy(true); setError(null);
    try {
      const result = await supportRefund(voucher.code);
      setVoucher(result.voucher); setDone(true); setVersion(v => v + 1);
    } catch (e) {
      setError(e instanceof ApiError ? e.code : 'network');
      // Another admin or business may have changed it after lookup. Require another lookup.
      setVoucher(null); setVersion(v => v + 1);
    } finally { setBusy(false); }
  }
  const rows = data?.refunds ?? [];
  const query = search.trim().toLocaleLowerCase(locale);
  const filtered = rows.filter(v => `${v.code} ${v.order.number} ${v.order.email} ${v.merchant.name} ${itemTitle(v.title, null, v.optionLabel, locale)}`.toLocaleLowerCase(locale).includes(query));
  const total = rows.reduce((sum, v) => sum + v.priceCents, 0);
  const unused = voucher && ['active', 'expired'].includes(voucher.status) && !voucher.redeemedAt && !voucher.refundedAt;
  return (
    <div className="refund-page">
      <Notice tone="indigo">{tr('notice')}</Notice>
      <section className="refund-workspace">
        <div className="panel refund-entry">
          <span className="attn-ic indigo"><Icon name="refund" /></span>
          <h2>{tr('new')}</h2><p className="muted small">{tr('intro')}</p>
          <form className="stack" onSubmit={lookup}>
            <Field id="refund-code" label={t('admin.voucherCode')} error={error ? t(`errors.${error}`) : undefined}>
              <TextInput id="refund-code" className="input mono" value={code} disabled={busy} autoComplete="off" autoCapitalize="characters" spellCheck={false} placeholder="VND-XXXX-XXXX" onChange={e => { setCode(e.target.value); setVoucher(null); setDone(false); setError(null); }} />
            </Field>
            <button className="btn btn-secondary" disabled={busy || !code.trim()} type="submit"><Icon name="search" />{tr(busy ? 'working' : 'lookup')}</button>
          </form>
          <p className="muted small">{tr('eligibility')}</p>
        </div>
        <div className="panel refund-review" aria-live="polite">
          {!voucher ? <div className="refund-review-empty"><Icon name="ticket" /><h3>{tr('reviewTitle')}</h3><p className="muted small">{tr('reviewHint')}</p></div>
          : <><div className="row between"><h2>{tr('reviewTitle')}</h2><span className={`chip ${voucher.status === 'refunded' ? 'indigo' : unused ? 'teal' : 'warn'}`}>{t(`admin.vo.status.${voucher.status}`)}</span></div>
            <p className="mono">{voucher.code}</p><p><strong>{itemTitle(voucher.title, null, voucher.optionLabel, locale)}</strong></p>
            <RefundFacts voucher={voucher} />
            {voucher.test && <p className="chip warn">{t('business.testVoucher')}</p>}
            {done ? <Notice icon="checkc">{tr('success')}</Notice>
              : unused ? <div className="refund-confirm"><p className="small">{t('admin.refundScreen.confirm', { amount: formatMoney(voucher.priceCents, locale) })}</p><button className="btn btn-danger" disabled={busy} type="button" onClick={refund}><Icon name="refund" />{tr(busy ? 'working' : 'confirmButton')}</button></div>
              : <Notice tone="warn">{tr(voucher.status === 'refunded' ? 'alreadyRefunded' : 'notUnused')}</Notice>}
          </>}
        </div>
      </section>
      <section className="refund-summary" aria-label={tr('summary')}>
        <div className="panel"><span className="muted small">{tr('recorded')}</span><strong>{data && !listError ? rows.length : '—'}</strong></div>
        <div className="panel"><span className="muted small">{tr('value')}</span><strong>{data && !listError ? formatMoney(total, locale) : '—'}</strong></div>
        <div className="panel"><span className="muted small">{tr('latest')}</span><strong className="small">{rows[0]?.refundedAt && !listError ? dateTime(rows[0].refundedAt, locale) : '—'}</strong></div>
      </section>
      <section className="panel">
        <div className="panel-h refund-history-head"><div><h2>{tr('history')}</h2><p className="muted small">{tr('historyHint')}</p></div><div className="row wrap-row" style={{ gap: 10 }}><label className="payout-search"><Icon name="search" /><input aria-label={tr('search')} placeholder={tr('search')} value={search} onChange={e => setSearch(e.target.value)} /></label><button className="btn btn-secondary btn-sm" disabled={loading} onClick={() => setVersion(v => v + 1)}>{tr('refresh')}</button></div></div>
        {data?.hasMore && <p className="muted small refund-limit">{tr('limited')}</p>}
        {listError ? <Notice tone="danger">{t(`errors.${listError}`)}</Notice> : loading ? <p className="payout-loading" role="status">{tr('loading')}</p>
          : !rows.length ? <div className="empty-state"><span className="attn-ic indigo"><Icon name="refund" /></span><h3>{tr('empty')}</h3><p className="muted">{tr('emptyHint')}</p></div>
          : !filtered.length ? <p className="payout-loading">{tr('noResults')}</p> : <div className="table-wrap"><table className="refund-table"><thead><tr><th>{t('vouchers.code')}</th><th>{t('business.colDeal')}</th><th>{t('admin.merchant')}</th><th>{tr('customer')}</th><th className="num">{t('business.colPrice')}</th><th>{t('admin.refundedAt')}</th><th><span className="sr-only">{tr('details')}</span></th></tr></thead><tbody>{filtered.map(v => <Fragment key={v.code}><tr><td><button className="payout-code" aria-expanded={expanded === v.code} aria-controls={`refund-${v.code}`} onClick={() => setExpanded(expanded === v.code ? null : v.code)}>{v.code}</button><span className="payout-deal">{v.order.number}</span>{v.test && <span className="chip warn">{tr('test')}</span>}</td><td>{itemTitle(v.title, null, v.optionLabel, locale)}</td><td>{v.merchant.name}</td><td><span>{v.order.name}</span><span className="payout-deal">{v.order.email}</span></td><td className="num">{formatMoney(v.priceCents, locale)}</td><td className="small">{v.refundedAt ? dateTime(v.refundedAt, locale) : '—'}</td><td><button className="btn btn-ghost btn-sm" aria-expanded={expanded === v.code} aria-controls={`refund-${v.code}`} onClick={() => setExpanded(expanded === v.code ? null : v.code)}>{tr(expanded === v.code ? 'close' : 'details')}</button></td></tr>{expanded === v.code && <tr className="payout-expanded" id={`refund-${v.code}`}><td colSpan={7}><RefundFacts voucher={v} /></td></tr>}</Fragment>)}</tbody></table></div>}
      </section>
    </div>
  );
}

function RefundFacts({ voucher: v }: { voucher: AdminVoucherDTO }) {
  const { t, locale } = useI18n();
  const tr = (key: string) => t(`admin.refundScreen.${key}`);
  const facts: [string, string][] = [[t('admin.merchant'), v.merchant.name], [tr('customer'), v.order.name], [t('admin.email'), v.order.email], [tr('order'), v.order.number], [tr('issued'), dateTime(v.issuedAt, locale)], [tr('expires'), dateTime(v.expiresAt, locale)], [tr('voucherValue'), formatMoney(v.priceCents, locale)]];
  return <div className="refund-facts"><dl className="facts">{facts.map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value || '—'}</dd></div>)}</dl><Link className="row-link small" href={`/${locale}/admin/vouchers?code=${encodeURIComponent(v.code)}`}>{tr('fullDetails')} →</Link></div>;
}
