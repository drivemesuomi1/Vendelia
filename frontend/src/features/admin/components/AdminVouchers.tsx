"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from "react";
import type { AdminVoucherDTO } from "@vendelia/shared";
import { Icon, type IconName } from "@/components/ui/Icon";
import { Notice } from "@/components/ui/Notice";
import { useI18n } from "@/i18n/I18nProvider";
import { api, ApiError } from "@/lib/api-client";
import { formatMoney, formatPct, itemTitle } from "@/lib/format";
import { dateTime } from "../format";

const VIEWS = ["bought", "used", "refunded"] as const;
type View = (typeof VIEWS)[number];
/** Translation keys and the date shown for each list. */
const VIEW_TEXT: Record<View, { title: string; empty: string; dateCol: string; date: (v: AdminVoucherDTO) => string | null }> = {
  bought: { title: "admin.vo.recentBought", empty: "admin.vo.emptyBought", dateCol: "admin.vo.boughtAt", date: (v) => v.issuedAt },
  used: { title: "admin.vo.recentUsed", empty: "admin.vo.emptyUsed", dateCol: "admin.vo.usedAt", date: (v) => v.redeemedAt },
  refunded: { title: "admin.vo.recentRefunded", empty: "admin.vo.emptyRefunded", dateCol: "admin.vo.refundedAt", date: (v) => v.refundedAt },
};

/**
 * Admin voucher lookup: enter a code to see everything about it (what was bought, the business, the buyer and its
 * history), or browse the latest bought and the latest used vouchers. `?code=` in the address opens one directly.
 */
export function AdminVouchers() {
  const { t, locale } = useI18n();
  const [code, setCode] = useState("");
  const [voucher, setVoucher] = useState<AdminVoucherDTO | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [redeemed, setRedeemed] = useState(false);
  const [view, setView] = useState<View>("bought");
  const [lists, setLists] = useState<Partial<Record<View, AdminVoucherDTO[]>>>({});
  const [listError, setListError] = useState<string | null>(null);
  const [q, setQ] = useState("");

  async function open(raw: string) {
    if (busy) return;
    const value = raw.trim().toUpperCase();
    if (!value) return;
    setBusy(true);
    setError(null);
    setRedeemed(false);
    try {
      const r = await api<{ voucher: AdminVoucherDTO }>(`/api/admin/vouchers/${encodeURIComponent(value)}`);
      setVoucher(r.voucher);
      setCode(r.voucher.code);
      window.history.replaceState(null, "", `?code=${encodeURIComponent(r.voucher.code)}`);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (e) {
      setVoucher(null);
      setError(e instanceof ApiError ? (e.status === 404 ? "voucher_not_found" : e.code) : "network");
    } finally {
      setBusy(false);
    }
  }

  async function redeem() {
    if (!voucher || busy) return;
    setBusy(true); setError(null); setRedeemed(false);
    try {
      const result = await api<{ voucher: AdminVoucherDTO }>('/api/admin/vouchers/redeem', { body: { code: voucher.code } });
      setVoucher(result.voucher); setRedeemed(true); setLists({});
    } catch (e) {
      setError(e instanceof ApiError ? e.code : 'network');
      // Discard stale eligibility after a redemption/refund in another session.
      setVoucher(null); setLists({});
    } finally { setBusy(false); }
  }

  useEffect(() => {
    const fromLink = new URLSearchParams(window.location.search).get("code");
    if (fromLink) void open(fromLink);
    // Runs once, for a link that names a voucher.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (lists[view]) return;
    let active = true;
    setListError(null);
    api<{ vouchers: AdminVoucherDTO[] }>(`/api/admin/vouchers?view=${view}`)
      .then((r) => { if (active) setLists((p) => ({ ...p, [view]: r.vouchers })); })
      .catch((e) => { if (active) setListError(e instanceof ApiError ? e.code : "network"); });
    return () => { active = false; };
  }, [view, lists]);

  const submit = (e: FormEvent) => { e.preventDefault(); void open(code); };
  const when = (iso: string | null) => (iso ? dateTime(iso, locale) : "–");
  const loaded = lists[view];
  const rows = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!loaded || !needle) return loaded;
    return loaded.filter((v) =>
      v.code.toLowerCase().includes(needle)
      || itemTitle(v.title, null, v.optionLabel, locale).toLowerCase().includes(needle)
      || v.merchant.name.toLowerCase().includes(needle)
      || v.order.number.toLowerCase().includes(needle)
      || v.order.email.toLowerCase().includes(needle)
      || (v.order.name ?? "").toLowerCase().includes(needle));
  }, [loaded, q, locale]);

  return (
    <div className="stack" style={{ gap: 20 }}>
      <form className="panel vo-search" onSubmit={submit} role="search">
        <label htmlFor="vo-code" className="sr-only">{t("admin.vo.code")}</label>
        <span className="vo-search-box">
          <Icon name="search" />
          <input id="vo-code" className="mono" value={code} onChange={(e) => setCode(e.target.value)} placeholder="VND-XXXX-XXXX" autoComplete="off" autoCapitalize="characters" spellCheck={false} />
        </span>
        <button className="btn btn-primary" type="submit" disabled={busy || !code.trim()}>{t("admin.vo.find")}</button>
      </form>

      {error && <Notice tone="warn" icon="info">{t(`errors.${error}`)}</Notice>}
      {redeemed && <Notice icon="checkc">{t('admin.vo.redemption.success')}</Notice>}
      {voucher && <VoucherDetail key={voucher.code} voucher={voucher} busy={busy} onRedeem={redeem} onClose={() => { setVoucher(null); setRedeemed(false); window.history.replaceState(null, "", window.location.pathname); }} />}

      <section className="panel">
        <div className="panel-h">
          <div><h2>{t(VIEW_TEXT[view].title)}</h2><p className="muted">{t("admin.vo.listHint")}</p></div>
        </div>
        <div className="toolbar">
          <label className="search-box">
            <Icon name="search" />
            <span className="sr-only">{t("admin.vouchersSearch")}</span>
            <input className="input" value={q} onChange={(e) => setQ(e.target.value)} placeholder={t("admin.vouchersSearch")} />
          </label>
          <div className="seg" role="group" aria-label={t("admin.vo.list")}>
            {VIEWS.map((v) => <button key={v} type="button" aria-pressed={view === v} onClick={() => setView(v)}>{t(`admin.vo.tab.${v}`)}</button>)}
          </div>
        </div>
        {listError ? <Notice tone="danger" icon="xc">{t(`errors.${listError}`)}</Notice>
          : !rows ? <p className="muted small">{t("admin.vo.loading")}</p>
          : !rows.length && q.trim() && loaded?.length ? <p className="muted empty-row">{t("admin.vouchersNoResults")}</p>
          : !rows.length ? (
            <div className="empty-state">
              <span className="attn-ic indigo"><Icon name="ticket" /></span>
              <h3>{t(VIEW_TEXT[view].empty)}</h3>
            </div>
          ) : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>{t("admin.vo.code")}</th>
                    <th>{t("admin.col.deal")}</th>
                    <th>{t("admin.merchant")}</th>
                    <th className="num">{t("admin.vo.price")}</th>
                    <th>{t(VIEW_TEXT[view].dateCol)}</th>
                    <th>{t("business.colStatus")}</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((v) => (
                    <tr key={v.code} className={`vo-row${voucher?.code === v.code ? " is-open" : ""}`} onClick={() => open(v.code)}>
                      <td><button type="button" className="vo-code-btn mono" onClick={(e) => { e.stopPropagation(); void open(v.code); }}>{v.code}</button></td>
                      <td><span className="vo-deal">{itemTitle(v.title, null, v.optionLabel, locale)}</span></td>
                      <td>{v.merchant.name}</td>
                      <td className="num">{formatMoney(v.priceCents, locale)}</td>
                      <td>{when(VIEW_TEXT[view].date(v))}</td>
                      <td><StatusChip voucher={v} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
      </section>
    </div>
  );
}

function StatusChip({ voucher: v }: { voucher: AdminVoucherDTO }) {
  const { t } = useI18n();
  const chips: Record<AdminVoucherDTO["status"], [string, IconName, string]> = {
    active: ["teal", "checkc", "admin.vo.status.active"],
    redeemed: ["indigo", "check", "admin.vo.status.redeemed"],
    refunded: ["danger", "refund", "admin.vo.status.refunded"],
    expired: ["warn", "clock", "admin.vo.status.expired"],
  };
  const [tone, icon, label] = chips[v.status];
  return <span className={`chip ${tone}`}><Icon name={icon} />{t(label)}</span>;
}

/** Everything about one voucher, grouped as support needs it. */
function VoucherDetail({ voucher: v, onClose, onRedeem, busy }: { voucher: AdminVoucherDTO; onClose: () => void; onRedeem: () => void; busy: boolean }) {
  const { t, locale } = useI18n();
  const [confirming, setConfirming] = useState(false);
  const eligible = v.status === 'active' && !v.redeemedAt && !v.refundedAt && Date.parse(v.expiresAt) > Date.now();
  const when = (iso: string | null) => (iso ? dateTime(iso, locale) : "–");
  const facts = (rows: [string, ReactNode][]) => (
    <dl className="facts">{rows.map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value ?? "–"}</dd></div>)}</dl>
  );
  const history: { icon: IconName; label: string; at: string | null; tone?: string }[] = [
    { icon: "cart", label: t("admin.vo.ev.bought"), at: v.issuedAt },
    ...(v.cancellableUntil ? [{ icon: "refund" as IconName, label: t("admin.vo.ev.cancelUntil"), at: v.cancellableUntil }] : []),
    v.redeemedAt ? { icon: "check" as IconName, label: t("admin.vo.ev.used"), at: v.redeemedAt, tone: "done" }
      : v.refundedAt ? { icon: "refund" as IconName, label: t("admin.vo.ev.refunded"), at: v.refundedAt, tone: "bad" }
      : { icon: "clock" as IconName, label: t(v.status === "expired" ? "admin.vo.ev.expired" : "admin.vo.ev.validUntil"), at: v.expiresAt, tone: v.status === "expired" ? "bad" : "next" },
  ];

  return (
    <section className="panel vo-detail" aria-labelledby="vo-title">
      <div className="vo-head">
        <div>
          <p className="muted small">{t("admin.vo.voucher")}</p>
          <h2 id="vo-title" className="mono">{v.code}</h2>
          <div className="row wrap-row" style={{ gap: 6, marginTop: 8 }}>
            <StatusChip voucher={v} />
            {v.test && <span className="chip warn"><Icon name="info" />{t("business.testVoucher")}</span>}
          </div>
        </div>
        <button type="button" className="btn btn-ghost btn-sm" disabled={busy} onClick={onClose} aria-label={t("admin.mb.close")}><Icon name="x" /></button>
      </div>

      {eligible && <div style={{ display: 'flex', flexDirection: 'column', padding: '24px 20px', gap: 20 }}>
        <Notice tone="indigo">{t('admin.vo.redemption.hint')}</Notice>
        {confirming ? <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <p>{t('admin.vo.redemption.confirm', { code: v.code, merchant: v.merchant.name })}</p>
          <div className="row wrap-row" style={{ gap: 10 }}>
            <button type="button" className="btn btn-primary" disabled={busy} onClick={onRedeem}>{t(busy ? 'admin.vo.redemption.working' : 'admin.vo.redemption.confirmButton')}</button>
            <button type="button" className="btn btn-secondary" disabled={busy} onClick={() => setConfirming(false)}>{t('admin.vo.redemption.cancel')}</button>
          </div>
        </div> : <div><button type="button" className="btn btn-primary" disabled={busy} onClick={() => setConfirming(true)}><Icon name="check" />{t('admin.vo.redemption.action')}</button></div>}
      </div>}

      <div className="vo-grid">
        <div>
          <h3>{t("admin.vo.what")}</h3>
          {facts([
            [t("admin.col.deal"), <Link key="d" className="row-link" href={`/${locale}/deals/${v.deal.slug}`}>{itemTitle(v.title, null, v.optionLabel, locale)}</Link>],
            [t("admin.vo.price"), formatMoney(v.priceCents, locale)],
            [t("admin.vo.vat"), formatPct(v.vatBps, locale)],
            [t("admin.vo.payout"), formatMoney(v.payoutCents, locale)],
            [t("admin.vo.giftFor"), v.recipientName],
          ])}
        </div>
        <div>
          <h3>{t("admin.vo.history")}</h3>
          {v.redeemedAt && facts([
            [t('admin.vo.redemption.source'), t(`admin.vo.redemption.${v.redeemedByRole ?? 'unknown'}`)],
            [t('admin.vo.redemption.actor'), v.redeemedBy?.name ?? v.redeemedBy?.id],
          ])}
          <ol className="timeline-icons vo-timeline">
            {history.map((h) => (
              <li key={h.label} className={h.tone ? `is-${h.tone}` : undefined}>
                <span className="tl-ic"><Icon name={h.icon} /></span>
                <b>{h.label}</b>
                <small className="muted">{when(h.at)}</small>
              </li>
            ))}
          </ol>
        </div>
        <div>
          <h3>{t("admin.merchant")}</h3>
          {facts([[t("auth.displayName"), <Link key="m" className="row-link" href={`/${locale}/admin/businesses/${v.merchant.id}`}>{v.merchant.name}</Link>]])}
          <h3 style={{ marginTop: 18 }}>{t("admin.vo.buyer")}</h3>
          {facts([
            [t("admin.vo.order"), <span key="o" className="mono">{v.order.number}</span>],
            [t("admin.vo.name"), v.order.name],
            [t("admin.email"), <a key="e" className="row-link" href={`mailto:${v.order.email}`}>{v.order.email}</a>],
            [t("admin.mb.phone"), v.order.phone],
            [t("admin.vo.payment"), `${v.order.paymentMethod} · ${t(`admin.vo.orderStatus.${v.order.status}`)}`],
            [t("admin.vo.orderTotal"), formatMoney(v.order.totalCents, locale)],
            [t("admin.vo.email"), t(`admin.vo.emailStatus.${v.order.emailStatus}`)],
          ])}
        </div>
      </div>
    </section>
  );
}
