"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import type { DealDetailDTO } from "@vendelia/shared";
import { useI18n } from "@/i18n/I18nProvider";
import { PREVIEW_DEAL, PREVIEW_READY } from "../preview";

/** Phone width, and the narrowest width the desktop layout is shown at (wider panels use their full width). */
const DEVICES = { mobile: 390, desktop: 1024 } as const;
type Device = keyof typeof DEVICES;

/**
 * The real public deal page in a frame, fed the current draft. The frame is laid out at a phone width, or for
 * desktop at the panel's full width (at least 1024px), so the site's own breakpoints apply; narrower panels scale it down. `start` and `end` go in the toolbar.
 */
export function DealPreviewFrame({ deal, start, end }: { deal: DealDetailDTO | null; start?: ReactNode; end?: ReactNode }) {
  const { t, locale } = useI18n();
  const box = useRef<HTMLDivElement>(null);
  const frame = useRef<HTMLIFrameElement>(null);
  // Counts "ready" messages, so a reloaded frame gets the draft again.
  const [ready, setReady] = useState(0);
  const [device, setDevice] = useState<Device>("desktop");
  const [size, setSize] = useState({ width: 0, height: 0 });

  useEffect(() => {
    const el = box.current;
    if (!el) return;
    // Measure once now; the observer then follows resizes.
    const rect = el.getBoundingClientRect();
    setSize({ width: rect.width, height: rect.height });
    const ro = new ResizeObserver(([entry]) => setSize({ width: entry!.contentRect.width, height: entry!.contentRect.height }));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    const onMessage = (e: MessageEvent) => {
      if (e.origin === window.location.origin && e.source === frame.current?.contentWindow && e.data?.type === PREVIEW_READY) setReady((n) => n + 1);
    };
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, []);

  useEffect(() => {
    if (ready && deal) frame.current?.contentWindow?.postMessage({ type: PREVIEW_DEAL, deal }, window.location.origin);
  }, [ready, deal]);

  const width = device === "desktop" ? Math.max(DEVICES.desktop, Math.floor(size.width)) : DEVICES.mobile;
  const scale = size.width ? Math.min(1, size.width / width) : 1;

  return (
    <section className="preview-panel" aria-label={t("business.previewTitle")}>
      <div className="preview-bar">
        <div className="preview-bar-side">{start}</div>
        <div className="seg seg-sm" role="group" aria-label={t("business.previewDevice")}>
          {(Object.keys(DEVICES) as Device[]).map((d) => (
            <button key={d} type="button" aria-pressed={device === d} onClick={() => setDevice(d)}>{t(`business.device.${d}`)}</button>
          ))}
        </div>
        <div className="preview-bar-side end">{end}</div>
      </div>
      <div className="preview-box" ref={box}>
        <iframe
          ref={frame}
          src={`/${locale}/deal-preview`}
          title={t("business.previewTitle")}
          style={{
            width, height: size.height ? size.height / scale : "100%",
            transform: `scale(${scale})`, left: Math.max(0, (size.width - width * scale) / 2),
          }}
        />
      </div>
    </section>
  );
}
