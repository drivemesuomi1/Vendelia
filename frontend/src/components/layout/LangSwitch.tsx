"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import { Flag } from "@/components/ui/Flag";
import { Icon } from "@/components/ui/Icon";
import { LOCALE_COOKIE, LOCALE_LABELS, LOCALES, type Locale } from "@/i18n/config";
import { useI18n } from "@/i18n/I18nProvider";

/**
 * Language picker with country flags. Switches the /fi|/sv|/en prefix of the current URL and remembers the choice.
 * Keyboard: Enter/Space/Arrow Down opens; Arrow Up/Down, Home/End move; Enter/Space picks; Esc or Tab closes.
 */
export function LangSwitch() {
  const { t, locale } = useI18n();
  const router = useRouter();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const button = useRef<HTMLButtonElement>(null);
  const options = useRef<(HTMLLIElement | null)[]>([]);

  function change(next: Locale) {
    setOpen(false);
    if (next === locale) return button.current?.focus();
    document.cookie = `${LOCALE_COOKIE}=${next}; path=/; max-age=31536000; samesite=lax`;
    const rest = pathname.replace(/^\/(fi|sv|en)(?=\/|$)/, "");
    router.push(`/${next}${rest}${window.location.search}`);
  }

  // Close on outside click; move focus to the current language when the list opens.
  useEffect(() => {
    if (!open) return;
    options.current[LOCALES.indexOf(locale)]?.focus();
    const away = (e: PointerEvent) => !root.current?.contains(e.target as Node) && setOpen(false);
    document.addEventListener("pointerdown", away);
    return () => document.removeEventListener("pointerdown", away);
  }, [open, locale]);

  function onButtonKey(e: KeyboardEvent) {
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      setOpen(true);
    }
  }

  function onListKey(e: KeyboardEvent) {
    const i = options.current.findIndex((o) => o === document.activeElement);
    const focus = (n: number) => options.current[(n + LOCALES.length) % LOCALES.length]?.focus();
    if (e.key === "ArrowDown") (e.preventDefault(), focus(i + 1));
    else if (e.key === "ArrowUp") (e.preventDefault(), focus(i - 1));
    else if (e.key === "Home") (e.preventDefault(), focus(0));
    else if (e.key === "End") (e.preventDefault(), focus(LOCALES.length - 1));
    else if (e.key === "Enter" || e.key === " ") (e.preventDefault(), i >= 0 && change(LOCALES[i]!));
    else if (e.key === "Escape") (e.preventDefault(), setOpen(false), button.current?.focus());
    else if (e.key === "Tab") setOpen(false);
  }

  return (
    <div className="langsw" ref={root}>
      <button
        ref={button}
        type="button"
        className="langsw-btn"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={`${t("nav.language")}: ${LOCALE_LABELS[locale].name}`}
        onClick={() => setOpen((v) => !v)}
        onKeyDown={onButtonKey}
      >
        <Flag locale={locale} width={20} />
        <span>{LOCALE_LABELS[locale].short}</span>
        <Icon name="chev" className="langsw-chev" />
      </button>
      {open && (
        <ul className="langsw-list" role="listbox" aria-label={t("nav.language")} onKeyDown={onListKey}>
          {LOCALES.map((l, i) => (
            <li
              key={l}
              ref={(el) => {
                options.current[i] = el;
              }}
              role="option"
              lang={l}
              tabIndex={-1}
              aria-selected={l === locale}
              className="langsw-opt"
              onClick={() => change(l)}
            >
              <Flag locale={l} width={24} />
              <span className="langsw-name">{LOCALE_LABELS[l].name}</span>
              {l === locale ? <Icon name="check" className="langsw-check" /> : <span className="langsw-code">{LOCALE_LABELS[l].short}</span>}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
