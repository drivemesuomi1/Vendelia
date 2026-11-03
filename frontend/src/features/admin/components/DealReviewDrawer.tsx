"use client";

import { useState } from "react";
import type { DealInput, MerchantStatus } from "@vendelia/shared";
import { Dialog } from "@/components/ui/Dialog";
import { Icon } from "@/components/ui/Icon";
import { Notice } from "@/components/ui/Notice";
import { useI18n } from "@/i18n/I18nProvider";
import { ApiError } from "@/lib/api-client";
import { formatDate } from "@/lib/format";
import { DealChip } from "@/features/portal-demo/DealChip";
import { DealPreview } from "@/features/portal-demo/DealPreview";

/** What the review UI needs from a deal, whether it comes from the API or the browser demo store. */
export interface ReviewableDeal {
  id: string;
  status: "draft" | "pending" | "live" | "rejected";
  input: DealInput;
  submittedAt: string | null;
  reviewNote: string | null;
  merchantName: string;
  merchantStatus?: MerchantStatus;
}

type Decide = (id: string, decision: "approve" | "reject", note?: string) => void | Promise<void>;

/**
 * Preview, reject-reason field and the approve / reject / take-off-sale buttons for one deal.
 * Used in the drawer (browser demo) and on the full review page. Mount with a `key` of the deal id.
 */
export function DealReviewForm({ deal, variant, onDecision, onDone }: {
  deal: ReviewableDeal;
  variant: "drawer" | "page";
  onDecision: Decide;
  onDone: () => void;
}) {
  const { t } = useI18n();
  const [note, setNote] = useState("");
  const [noteError, setNoteError] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // The comment goes to the business with either decision; rejecting needs one so they know what to fix.
  const decide = async (decision: "approve" | "reject") => {
    if (decision === "reject" && !note.trim()) return setNoteError(true);
    setBusy(true);
    setError(null);
    try {
      await onDecision(deal.id, decision, note.trim() || undefined);
      onDone();
    } catch (e) {
      setError(e instanceof ApiError ? e.code : "network");
      setBusy(false);
    }
  };

  const body = (
    <>
      <div className="row" style={{ gap: 8 }}><DealChip status={deal.status === "draft" ? "pending" : deal.status} /></div>
      {deal.merchantStatus && deal.merchantStatus !== "active" && <Notice tone="warn" icon="info">{t("admin.dr.merchantInactive")}</Notice>}
      {error && <Notice tone="danger" icon="xc">{t(`errors.${error}`)}</Notice>}
      {deal.reviewNote && <p className={`review-note${deal.status === "rejected" ? "" : " ok"}`}><span><b>{t("admin.dr.lastFeedback")}:</b> {deal.reviewNote}</span></p>}
      <DealPreview input={deal.input} businessName={deal.merchantName} />
      <div className="mb-field">
        <label htmlFor="dr-note">{t("admin.dr.feedback")}</label>
        <textarea id="dr-note" className="input" rows={4} maxLength={1000} value={note} onChange={(e) => { setNote(e.target.value); setNoteError(false); }} aria-invalid={noteError || undefined} aria-describedby="dr-note-hint" />
        <p className="hint" id="dr-note-hint">{t("admin.dr.feedbackHint")}</p>
        {noteError && <p className="err-msg"><Icon name="xc" />{t("admin.dr.reasonRequired")}</p>}
      </div>
    </>
  );
  const actions = (
    <>
      {deal.status !== "live" && (
        <button className="btn btn-primary" type="button" onClick={() => decide("approve")} disabled={busy}><Icon name="check" />{t("admin.dr.approve")}</button>
      )}
      {deal.status !== "rejected" && (
        <button className="btn btn-danger" type="button" onClick={() => decide("reject")} disabled={busy}>
          <Icon name="x" />{t(deal.status === "live" ? "admin.dr.unpublish" : "admin.dr.reject")}
        </button>
      )}
    </>
  );

  return variant === "drawer" ? (
    <>
      <div className="drawer-body">{body}</div>
      <div className="drawer-foot two">{actions}</div>
    </>
  ) : (
    <div className="review-page">
      <section className="panel stack">{body}</section>
      <div className="review-actions">{actions}</div>
    </div>
  );
}

/** Side panel version, still used by the browser-only demo business view. */
export function DealReviewDrawer({ deal, onDecision, onClose }: { deal: ReviewableDeal | null; onDecision: Decide; onClose: () => void }) {
  const { t, locale } = useI18n();
  return (
    <Dialog open={!!deal} onClose={onClose} className="drawer drawer-wide" labelledBy="dr-title">
      {deal && (
        <div className="mb-form">
          <div className="drawer-head">
            <div>
              <h2 id="dr-title" style={{ fontSize: 20 }}>{t("admin.dr.reviewTitle")}</h2>
              <p className="muted small">{t("admin.dr.submittedBy", { name: deal.merchantName, date: deal.submittedAt ? formatDate(deal.submittedAt, locale) : "–" })}</p>
            </div>
            <button type="button" className="btn btn-ghost btn-sm" onClick={onClose} aria-label={t("admin.mb.close")}><Icon name="x" /></button>
          </div>
          <DealReviewForm deal={deal} variant="drawer" onDecision={onDecision} onDone={onClose} />
        </div>
      )}
    </Dialog>
  );
}
