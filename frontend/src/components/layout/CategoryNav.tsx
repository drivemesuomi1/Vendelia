"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useRef, useState, type ReactNode } from "react";
import { Icon, type IconName } from "@/components/ui/Icon";
import { useI18n } from "@/i18n/I18nProvider";
import { useAppData } from "@/lib/meta-context";
import { loc } from "@/lib/format";
import { useCity } from "./CityPicker";

/** Top-level categories in the bar, in order; "services" groups several categories in a dropdown. */
const ITEMS: ({ category: string } | { group: "services"; categories: string[] })[] = [
  { category: "food" },
  { category: "beauty" },
  { category: "wellness" },
  { group: "services", categories: ["cleaning", "chauffeur"] },
];

/** Category bar under the header: city menu, categories and the Services menu. */
export function CategoryNav() {
  const { t, locale } = useI18n();
  const { meta } = useAppData();
  const { city, pick } = useCity();
  const [active, setActive] = useState("");

  const category = (id: string) => meta.categories.find((c) => c.id === id);
  const href = (id: string) => `/${locale}/deals?category=${id}`;
  const cityName = loc(meta.cities.find((c) => c.id === city)?.name, locale);

  return (
    <nav className="catnav" aria-label={t("nav.categories")}>
      {/* Reading the query needs a Suspense boundary; keep it around this tiny reader only. */}
      <Suspense fallback={null}><ActiveCategory onChange={setActive} /></Suspense>
      <div className="wrap">
        <Menu label={cityName || t("nav.selectCity")} className="cn-city desk-only" icon="pin">
          {[{ id: "", label: t("common.allCities") }, ...meta.cities.map((c) => ({ id: c.id, label: loc(c.name, locale) }))].map((c) => (
            <li key={c.id || "all"}>
              <button type="button" onClick={() => pick(c.id)} aria-current={c.id === city || undefined}>
                <Icon name="pin" />{c.label}
                {c.id === city && <Icon name="check" className="cn-tick" />}
              </button>
            </li>
          ))}
        </Menu>
        {ITEMS.map((item) => {
          if ("category" in item) {
            const c = category(item.category);
            if (!c) return null;
            return (
              <Link key={c.id} className="cn-link" href={href(c.id)} aria-current={active === c.id ? "page" : undefined}>
                {loc(c.name, locale)}
              </Link>
            );
          }
          const children = item.categories.map(category).filter((c) => c !== undefined);
          if (!children.length) return null;
          return [
            <Menu key="services" label={t("nav.services")} className="desk-only" current={children.some((c) => c.id === active)}>
              {children.map((c) => (
                <li key={c.id}>
                  <Link href={href(c.id)} aria-current={active === c.id ? "page" : undefined}>
                    <Icon name={c.icon as IconName} />{loc(c.name, locale)}
                  </Link>
                </li>
              ))}
            </Menu>,
            // Phones: no dropdowns in a swipeable row, so the services are listed directly.
            ...children.map((c) => (
              <Link key={`m-${c.id}`} className="cn-link mob-only" href={href(c.id)} aria-current={active === c.id ? "page" : undefined}>
                {loc(c.name, locale)}
              </Link>
            )),
          ];
        })}
      </div>
    </nav>
  );
}

/** Reports the category being browsed (/deals?category=…), so the bar can highlight it. */
function ActiveCategory({ onChange }: { onChange: (id: string) => void }) {
  const pathname = usePathname();
  const params = useSearchParams();
  const id = pathname.endsWith("/deals") ? (params.get("category") ?? "") : "";
  useEffect(() => onChange(id), [id, onChange]);
  return null;
}

/** Dropdown: opens on click/tap or mouse hover; closes on Escape, outside click or navigation. */
function Menu({ label, className = "", icon, current, children }: { label: string; className?: string; icon?: IconName; current?: boolean; children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const pathname = usePathname();
  useEffect(() => setOpen(false), [pathname]);
  useEffect(() => {
    if (!open) return;
    const away = (e: PointerEvent) => !ref.current?.contains(e.target as Node) && setOpen(false);
    const esc = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      setOpen(false);
      ref.current?.querySelector<HTMLButtonElement>(".cn-btn")?.focus();
    };
    document.addEventListener("pointerdown", away);
    document.addEventListener("keydown", esc);
    return () => {
      document.removeEventListener("pointerdown", away);
      document.removeEventListener("keydown", esc);
    };
  }, [open]);
  // Closing waits a moment so the pointer can travel from the button into the list without it vanishing.
  const closeTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  useEffect(() => () => clearTimeout(closeTimer.current), []);
  const hover = (v: boolean) => (e: React.PointerEvent) => {
    if (e.pointerType !== "mouse") return;
    clearTimeout(closeTimer.current);
    if (v) setOpen(true);
    else closeTimer.current = setTimeout(() => setOpen(false), 200);
  };
  // A mouse has already opened the menu on hover, so its click must not toggle it shut; touch and keyboard toggle.
  const viaMouse = useRef(false);

  return (
    <div className={`cn-menu ${className}`} ref={ref} onPointerEnter={hover(true)} onPointerLeave={hover(false)}>
      <button type="button" className="cn-btn" aria-expanded={open} aria-current={current ? "page" : undefined}
        onPointerDown={(e) => (viaMouse.current = e.pointerType === "mouse")}
        onClick={() => {
          setOpen((o) => (viaMouse.current ? true : !o));
          viaMouse.current = false;
        }}
      >
        {icon && <Icon name={icon} />}
        {label}
        <Icon name="chev" className="cn-chev" />
      </button>
      <ul className="cn-list" hidden={!open} onClick={() => setOpen(false)}>{children}</ul>
    </div>
  );
}
