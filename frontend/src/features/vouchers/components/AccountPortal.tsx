"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState, type ReactNode } from "react";
import type { VoucherDTO } from "@vendelia/shared";
import { PortalShell } from "@/components/layout/PortalShell";
import { Dialog } from "@/components/ui/Dialog";
import { Icon } from "@/components/ui/Icon";
import { Notice } from "@/components/ui/Notice";
import { useToast } from "@/components/ui/Toast";
import { useI18n } from "@/i18n/I18nProvider";
import { ApiError } from "@/lib/api-client";
import { formatDate, formatMoney, itemTitle } from "@/lib/format";
import { logout } from "@/features/auth/api";
import { requestRefund } from "../api";
import { VoucherCard } from "./VoucherCard";
import { VoucherStatus } from "./VoucherStatus";

type Section = "overview" | "vouchers" | "orders";
type Filter = "active" | "all";
type User = { name: string; email: string };
const SOON_DAYS = 14;
const daysLeft = (iso: string) => Math.ceil((new Date(iso).getTime() - Date.now()) / 86_400_000);

/** Sidebar shell of the customer account (same look as the portals). The demo account signs "out" to the sign-in page. */
export function AccountShell({ user, demo = false, children }: { user: User; demo?: boolean; children: ReactNode }) {
  const { t, locale } = useI18n();
  const router = useRouter();
  const signOut = async () => {
    if (!demo) await logout().catch(() => undefined);
    router.push(demo ? `/${locale}/login` : `/${locale}`);
    router.refresh();
  };
  return (
    <PortalShell kind="account" base={`/${locale}/account${demo ? "/demo" : ""}`} account={{ title: user.name, lines: [user.email], onSignOut: signOut }}>
      {demo && (
        <div className="acct-demo" role="status">
          <Icon name="info" />
          <span>{t("account.demoNote")}</span>
          <Link href={`/${locale}/login`}>{t("auth.login")}</Link>
        </div>
      )}
      {children}
    </PortalShell>
  );
}

/**
 * One section of the customer account: an overview (key figures, vouchers ready to use, what needs attention, recent
 * orders), all vouchers (show the QR, download the PDF, cancel within the refund window), or the order history.
 * `demo` shows sample data: PDFs come from the demo endpoint and cancelling is switched off.
 */
export function AccountPortal({ section, user, initial, demo = false }: { section: Section; user: User; initial: VoucherDTO[]; demo?: boolean }) {
  const { t, locale } = useI18n();
  const toast = useToast();
  const [vouchers, setVouchers] = useState(initial);
  const [filter, setFilter] = useState<Filter>("active");
  const [showing, setShowing] = useState<VoucherDTO | null>(null);
  const [cancelling, setCancelling] = useState<VoucherDTO | null>(null);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const base = `/${locale}/account${demo ? "/demo" : ""}`;
  const active = vouchers.filter((v) => v.status === "active");
  const soon = active.filter((v) => daysLeft(v.expiresAt) <= SOON_DAYS);
  const cancellable = active.filter((v) => v.cancellableUntil && daysLeft(v.cancellableUntil) >= 0 && !v.refundRequestedAt);
  const orders = useMemo(() => {
    const byNumber = new Map<string, VoucherDTO[]>();
    for (const v of vouchers) byNumber.set(v.orderNumber, [...(byNumber.get(v.orderNumber) ?? []), v]);
    return [...byNumber.entries()]
      .map(([number, items]) => ({ number, items, date: items[0]!.issuedAt, total: items.reduce((sum, v) => sum + v.priceCents, 0) }))
      .sort((a, b) => b.date.localeCompare(a.date));
  }, [vouchers]);
  const spent = vouchers.filter((v) => v.status !== "refunded").reduce((s, v) => s + v.priceCents, 0);
  const firstName = user.name.split(" ")[0] || user.name;
  const pdfHref = (code: string) => (demo ? `/api/demo/vouchers/${code}/pdf?locale=${locale}` : `/api/me/vouchers/${code}/pdf`);
  const title = (v: VoucherDTO) => itemTitle(v.title, null, v.optionLabel, locale);

  async function confirmCancel() {
    if (!cancelling) return;
    if (demo) { setCancelling(null); toast(t("account.demoNoCancel")); return; }
    setBusy(true);
    setError(null);
    try {
      const updated = await requestRefund(cancelling.code, reason.trim());
      setVouchers((vs) => vs.map((v) => (v.code === updated.code ? updated : v)));
      setCancelling(null);
      setReason("");
      toast(t("vouchers.cancelled"));
    } catch (e) {
      setError(t(`errors.${e instanceof ApiError ? e.code : "network"}`));
    } finally {
      setBusy(false);
    }
  }

  const empty = (icon: "ticket" | "doc", heading: string) => (
    <div className="empty-state">
      <span className="attn-ic indigo"><Icon name={icon} /></span>
      <h3>{heading}</h3>
      <p className="muted small">{t("account.emptyText")}</p>
      <Link className="btn btn-primary btn-sm" href={`/${locale}/deals`}>{t("home.seeAll")}<Icon name="right" /></Link>
    </div>
  );

  const orderList = (list: typeof orders) => list.map((o) => (
    <article key={o.number} className="acct-order">
      <header>
        <div>
          <h3>{t("vouchers.order")} <span className="mono">{o.number}</span></h3>
          <p className="muted small">{t("vouchers.purchasedOn", { date: formatDate(o.date, locale) })} · {t(o.items.length === 1 ? "account.itemsOne" : "account.items", { n: o.items.length })}</p>
        </div>
        <p className="acct-order-total">{formatMoney(o.total, locale)}</p>
      </header>
      <ul>
        {o.items.map((v) => (
          <li key={v.code}>
            <img src={v.imageUrl} alt="" loading="lazy" />
            <div className="acct-order-item">
              <b>{title(v)}</b>
              <small className="muted">{v.merchantName} · <span className="mono">{v.code}</span></small>
            </div>
            <VoucherStatus v={v} />
            <span className="acct-order-price">{formatMoney(v.priceCents, locale)}</span>
            {v.status !== "refunded"
              ? <a className="btn btn-ghost btn-sm" href={pdfHref(v.code)} download aria-label={`${t("account.pdf")} ${v.code}`} title={t("account.pdf")}><Icon name="download" /></a>
              : <span className="acct-order-pdf-gap" />}
          </li>
        ))}
      </ul>
    </article>
  ));

  return (
    <div className="adm acct">
      {section === "overview" && (
        <>
          <header className="adm-head">
            <div><h1>{t("account.hello", { name: firstName })}</h1><p className="muted small">{t("vouchers.signedInAs", { email: user.email })}</p></div>
            <Link className="btn btn-primary btn-sm" href={`/${locale}/deals`}><Icon name="search" />{t("account.findDeals")}</Link>
          </header>

          <section className="adm-kpis" aria-label={t("account.figures")}>
            {([
              ["account.statActive", String(active.length)],
              ["account.statSoon", String(soon.length)],
              ["account.statOrders", String(orders.length)],
              ["account.statSpent", formatMoney(spent, locale)],
            ] as const).map(([label, value]) => (
              <div className="kpi-tile" key={label}><p className="kt-label">{t(label)}</p><p className="kt-value">{value}</p></div>
            ))}
          </section>

          <div className="adm-grid" style={{ marginTop: 20 }}>
            <section className="panel span-8">
              <div className="panel-h">
                <div><h2>{t("account.ready")}</h2><p className="muted">{t("account.readySub")}</p></div>
                <Link className="link-sm" href={`${base}/vouchers`}>{t("admin.viewAll")}<Icon name="right" /></Link>
              </div>
              {!active.length ? empty("ticket", t("account.noActive")) : (
                <ul className="acct-ready">
                  {active.slice(0, 4).map((v) => (
                    <li key={v.code}>
                      <img src={v.imageUrl} alt="" loading="lazy" />
                      <div className="acct-order-item">
                        <b>{title(v)}</b>
                        <small className="muted">{v.merchantName} · {t("vouchers.validUntil", { date: formatDate(v.expiresAt, locale) })}</small>
                      </div>
                      <div className="acct-ready-actions">
                        <button type="button" className="btn btn-secondary btn-sm" onClick={() => setShowing(v)}><Icon name="scan" />{t("vouchers.show")}</button>
                        <a className="btn btn-ghost btn-sm" href={pdfHref(v.code)} download aria-label={`${t("account.pdf")} ${v.code}`} title={t("account.pdf")}><Icon name="download" /></a>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section className="panel span-4">
              <div className="panel-h"><h2>{t("admin.attention")}</h2></div>
              <ul className="attn">
                <li>
                  <Link href={`${base}/vouchers`}>
                    <span className="attn-ic warn"><Icon name="clock" /></span>
                    <span className="attn-t">{t("account.attnSoon")}</span>
                    <b className="attn-n">{soon.length}</b><Icon name="right" />
                  </Link>
                </li>
                <li>
                  <Link href={`${base}/vouchers`}>
                    <span className="attn-ic indigo"><Icon name="refund" /></span>
                    <span className="attn-t">{t("account.attnCancel")}</span>
                    <b className="attn-n">{cancellable.length}</b><Icon name="right" />
                  </Link>
                </li>
              </ul>
            </section>

            <section className="panel span-12">
              <div className="panel-h">
                <div><h2>{t("account.recentOrders")}</h2></div>
                <Link className="link-sm" href={`${base}/orders`}>{t("admin.viewAll")}<Icon name="right" /></Link>
              </div>
              {!orders.length ? empty("doc", t("account.noOrders")) : <div className="acct-orders">{orderList(orders.slice(0, 2))}</div>}
            </section>
          </div>
        </>
      )}

      {section === "vouchers" && (
        <>
          <header className="adm-head">
            <div><h1>{t("account.tabVouchers")}</h1><p className="muted small">{t("account.vouchersSub")}</p></div>
            <div className="seg" role="group" aria-label={t("account.filter")}>
              <button type="button" aria-pressed={filter === "active"} onClick={() => setFilter("active")}>{t("account.filterActive")} <small>{active.length}</small></button>
              <button type="button" aria-pressed={filter === "all"} onClick={() => setFilter("all")}>{t("account.filterAll")} <small>{vouchers.length}</small></button>
            </div>
          </header>
          {!(filter === "active" ? active : vouchers).length ? <section className="panel">{empty("ticket", t(vouchers.length ? "account.noActive" : "vouchers.none"))}</section> : (
            <ul className="acct-grid">
              {(filter === "active" ? active : vouchers).map((v, i) => (
                <li key={v.code} className={`acct-card is-${v.status}`} style={{ animationDelay: `${Math.min(i, 6) * 50}ms` }}>
                  <div className="acct-card-img"><img src={v.imageUrl} alt="" loading="lazy" /></div>
                  <div className="acct-card-body">
                    <div className="row wrap-row" style={{ gap: 6 }}>
                      <VoucherStatus v={v} />
                      {v.recipientName && <span className="chip indigo"><Icon name="gift" />{t("vouchers.giftFor", { name: v.recipientName })}</span>}
                    </div>
                    <h3>{title(v)}</h3>
                    <p className="muted small">{v.merchantName}</p>
                    <dl className="acct-card-facts">
                      <div><dt>{t("vouchers.code")}</dt><dd className="mono">{v.code}</dd></div>
                      <div><dt>{t("account.price")}</dt><dd>{formatMoney(v.priceCents, locale)}</dd></div>
                      <div>
                        <dt>{t(v.status === "redeemed" ? "account.usedOn" : v.status === "refunded" ? "account.refundedOn" : "account.validTo")}</dt>
                        <dd>{formatDate((v.status === "redeemed" ? v.redeemedAt : v.status === "refunded" ? v.refundedAt : v.expiresAt) ?? v.expiresAt, locale)}</dd>
                      </div>
                    </dl>
                    {v.refundRequestedAt
                      ? <p className="hint">{t("vouchers.refundPendingHint", { date: formatDate(v.refundRequestedAt, locale) })}</p>
                      : v.cancellableUntil && <p className="hint">{t("vouchers.freeCancelUntil", { date: formatDate(v.cancellableUntil, locale) })}</p>}
                  </div>
                  <div className="acct-card-actions">
                    {v.status === "active" && <button type="button" className="btn btn-primary btn-sm" onClick={() => setShowing(v)}><Icon name="scan" />{t("vouchers.show")}</button>}
                    {v.status !== "refunded" && <a className="btn btn-secondary btn-sm" href={pdfHref(v.code)} download><Icon name="download" />{t("account.pdf")}</a>}
                    {v.refundRequestedAt
                      ? <span className="chip warn"><Icon name="clock" />{t("vouchers.refundPending")}</span>
                      : v.status === "active" && v.cancellableUntil && daysLeft(v.cancellableUntil) >= 0 && <button type="button" className="btn btn-ghost btn-sm acct-cancel" onClick={() => { setError(null); setReason(""); setCancelling(v); }}>{t("vouchers.cancelRefund")}</button>}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </>
      )}

      {section === "orders" && (
        <>
          <header className="adm-head"><div><h1>{t("account.tabOrders")}</h1><p className="muted small">{t("account.ordersSub")}</p></div></header>
          {!orders.length ? <section className="panel">{empty("doc", t("account.noOrders"))}</section> : <div className="acct-orders">{orderList(orders)}</div>}
        </>
      )}

      <Notice className="mt" icon="help">{t("vouchers.help")}</Notice>

      <Dialog open={!!showing} onClose={() => setShowing(null)} wide labelledBy="show-title">
        <div className="pad row between">
          <h2 id="show-title" style={{ fontSize: 20 }}>{t("vouchers.voucher")}</h2>
          <button className="btn btn-ghost" onClick={() => setShowing(null)} aria-label={t("common.close")}><Icon name="x" /></button>
        </div>
        {showing && (
          <div style={{ padding: "0 16px 16px" }} className="stack">
            <VoucherCard v={showing} />
            <a className="btn btn-secondary btn-block" href={pdfHref(showing.code)} download><Icon name="download" />{t("account.pdf")}</a>
          </div>
        )}
      </Dialog>

      <Dialog open={!!cancelling} onClose={() => setCancelling(null)} labelledBy="cancel-title">
        {cancelling && (
          <div className="pad stack">
            <h2 id="cancel-title" style={{ fontSize: 20 }}>{t("vouchers.cancelTitle")}</h2>
            <p>{title(cancelling)} · <span className="mono">{cancelling.code}</span></p>
            <p className="muted">{t("vouchers.cancelBody", { amount: formatMoney(cancelling.priceCents, locale) })}</p>
            <label className="stack" htmlFor="refund-reason">
              <span className="small">{t("vouchers.refundReason")}</span>
              <textarea id="refund-reason" className="input" rows={3} maxLength={1000} value={reason} onChange={(e) => setReason(e.target.value)} />
            </label>
            {error && <Notice tone="danger" icon="xc">{error}</Notice>}
            <div className="row wrap-row" style={{ justifyContent: "flex-end" }}>
              <button className="btn btn-secondary" onClick={() => setCancelling(null)}>{t("vouchers.keep")}</button>
              <button className="btn btn-primary" onClick={confirmCancel} disabled={busy}>{t("vouchers.cancelRefund")}</button>
            </div>
          </div>
        )}
      </Dialog>
    </div>
  );
}
