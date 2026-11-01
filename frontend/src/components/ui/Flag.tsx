import { useId } from "react";
import type { Locale } from "@/i18n/config";

/**
 * Small country flags drawn as SVG (emoji flags do not render on Windows).
 * Finnish -> Finland, Swedish -> Sweden, English -> United Kingdom.
 */
export function Flag({ locale, width = 22 }: { locale: Locale; width?: number }) {
  const clip = useId();
  const height = Math.round((width * 2) / 3);
  return (
    <span className="flag" style={{ width, height }} aria-hidden="true">
      {locale === "fi" && (
        <svg viewBox="0 0 18 12" width={width} height={height}>
          <rect width="18" height="12" fill="#fff" />
          <path d="M5 0v12M0 6h18" stroke="#003580" strokeWidth="3" />
        </svg>
      )}
      {locale === "sv" && (
        <svg viewBox="0 0 16 10" width={width} height={height} preserveAspectRatio="none">
          <rect width="16" height="10" fill="#006AA7" />
          <path d="M6 0v10M0 5h16" stroke="#FECC00" strokeWidth="2" />
        </svg>
      )}
      {locale === "en" && (
        <svg viewBox="0 0 60 30" width={width} height={height} preserveAspectRatio="none">
          <clipPath id={clip}><path d="M30 15h30v15zv15H0zH0V0zV0h30z" /></clipPath>
          <rect width="60" height="30" fill="#012169" />
          <path d="M0 0l60 30M60 0L0 30" stroke="#fff" strokeWidth="6" />
          <path d="M0 0l60 30M60 0L0 30" clipPath={`url(#${clip})`} stroke="#C8102E" strokeWidth="4" />
          <path d="M30 0v30M0 15h60" stroke="#fff" strokeWidth="10" />
          <path d="M30 0v30M0 15h60" stroke="#C8102E" strokeWidth="6" />
        </svg>
      )}
    </span>
  );
}
