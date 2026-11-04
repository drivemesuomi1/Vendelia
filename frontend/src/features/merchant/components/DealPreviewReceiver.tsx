"use client";

import { useEffect, useState, type MouseEvent } from "react";
import type { DealDetailDTO } from "@vendelia/shared";
import { useI18n } from "@/i18n/I18nProvider";
import { DealDetail } from "@/features/deals/components/DealDetail";
import { PREVIEW_DEAL, PREVIEW_READY } from "../preview";

/**
 * Inside the editor's preview frame: renders the public deal page from drafts posted by the editor.
 * Only messages from the parent window on this same site are accepted. Links do not navigate.
 */
export function DealPreviewReceiver() {
  const { t } = useI18n();
  const [deal, setDeal] = useState<DealDetailDTO | null>(null);
  useEffect(() => {
    const onMessage = (e: MessageEvent) => {
      if (e.origin !== window.location.origin || e.source !== window.parent) return;
      if (e.data?.type === PREVIEW_DEAL && e.data.deal) setDeal(e.data.deal as DealDetailDTO);
    };
    window.addEventListener("message", onMessage);
    if (window.parent !== window) window.parent.postMessage({ type: PREVIEW_READY }, window.location.origin);
    return () => window.removeEventListener("message", onMessage);
  }, []);
  const stayHere = (e: MouseEvent) => {
    const link = (e.target as HTMLElement).closest("a");
    if (link && !link.getAttribute("href")?.startsWith("#")) e.preventDefault();
  };
  return (
    <div className="deal-preview-frame" onClickCapture={stayHere}>
      {deal ? <DealDetail deal={deal} preview /> : <p className="muted" style={{ padding: 24 }}>{t("business.previewWaiting")}</p>}
    </div>
  );
}
