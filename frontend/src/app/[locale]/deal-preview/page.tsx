import type { Metadata } from "next";
import { DealPreviewReceiver } from "@/features/merchant/components/DealPreviewReceiver";
import { siteThemeClass } from "@/lib/portal-fonts";
import "@/styles/site-theme.css";

export const metadata: Metadata = { title: "Preview", robots: { index: false, follow: false } };

/** Shown only inside the deal editor's preview frame; the draft arrives by postMessage, so nothing is loaded here. */
export default function DealPreviewPage() {
  return (
    <>
      {/* No site header in the frame: sticky parts (section tabs, buy box) stick to the very top. */}
      <style>{".preview-banner{display:none}html:root{--header-h:0px}"}</style>
      <div className={siteThemeClass}><DealPreviewReceiver /></div>
    </>
  );
}
