"use client";

import { useState } from "react";
import { Dialog } from "@/components/ui/Dialog";
import { Icon } from "@/components/ui/Icon";
import { useI18n } from "@/i18n/I18nProvider";
import { formatDate } from "@/lib/format";
import { DealChip } from "@/features/portal-demo/DealChip";
import { DealPreview } from "@/features/portal-demo/DealPreview";
import { reviewDeal, useDemoStore, type DemoDeal } from "@/features/portal-demo/store";

/**
 * Side panel to review one deal: full preview, approve, reject (reason required) or take a live deal off sale.
 * Mount with a `key` of the deal id so the reject form resets between deals.
 */
export function DealReviewDrawer({ deal, onClose }: { deal: DemoDeal | null; onClose: () => void }) {
  const { t, locale } = useI18n();
  const { businesses } = useDemoStore();
  const [rejecting, setRejecting] = useState(false);
  const [note, setNote] = useState("");
  const [noteError, setNoteError] = useState(false);
  const businessName = businesses.find((b) => b.id === deal?.businessId)?.name ?? "–";

  const approve = (d: DemoDeal) => {
    reviewDeal(d.id, "approve");
    onClose();
  };
  const reject = (d: DemoDeal) => {
    if (!rejecting) return setRejecting(true);
    if (!note.trim()) return setNoteError(true);
    reviewDeal(d.id, "reject", note);
    onClose();
  };

  return (
    <Dialog open={!!deal} onClose={onClose} className="drawer drawer-wide" labelledBy="dr-title">
      {deal && (
        <div className="mb-form">
          <div className="drawer-head">
            <div>
              <h2 id="dr-title" style={{ fontSize: 20 }}>{t("admin.dr.reviewTitle")}</h2>
              <p className="muted small">{t("admin.dr.submittedBy", { name: businessName, date: formatDate(deal.submittedAt, locale) })}</p>
            </div>
            <button type="button" className="btn btn-ghost btn-sm" onClick={onClose} aria-label={t("admin.mb.close")}><Icon name="x" /></button>
          </div>
          <div className="drawer-body">
            <div className="row" style={{ gap: 8 }}><DealChip status={deal.status} /></div>
            {deal.status === "rejected" && deal.reviewNote && <p className="review-note"><b>{t("admin.dr.reason")}:</b> {deal.reviewNote}</p>}
            <DealPreview input={deal.input} businessName={businessName} />
            {rejecting && (
              <div className="mb-field">
                <label htmlFor="dr-note">{t("admin.rejectReason")}</label>
                <textarea id="dr-note" className="input" rows={3} value={note} autoFocus onChange={(e) => { setNote(e.target.value); setNoteError(false); }} aria-invalid={noteError || undefined} />
                {noteError && <p className="err-msg"><Icon name="xc" />{t("admin.dr.reasonRequired")}</p>}
              </div>
            )}
          </div>
          <div className="drawer-foot two">
            {deal.status !== "live" && (
              <button className="btn btn-primary" type="button" onClick={() => approve(deal)} disabled={rejecting}><Icon name="check" />{t("admin.dr.approve")}</button>
            )}
            {deal.status !== "rejected" && (
              <button className="btn btn-danger" type="button" onClick={() => reject(deal)}>
                <Icon name="x" />{rejecting ? t("admin.dr.confirmReject") : t(deal.status === "live" ? "admin.dr.unpublish" : "admin.dr.reject")}
              </button>
            )}
            {rejecting && <button className="btn btn-secondary" type="button" onClick={() => setRejecting(false)}>{t("admin.mb.cancel")}</button>}
          </div>
        </div>
      )}
    </Dialog>
  );
}
