"use client";

import Link from "next/link";
import { useI18n } from "@/i18n/I18nProvider";

export interface Crumb { label: string; href?: string }

/** Where the user is inside a portal section. The last item is the current page and is not a link. */
export function Breadcrumbs({ items }: { items: Crumb[] }) {
  const { t } = useI18n();
  return (
    <nav className="crumbs" aria-label={t("common.breadcrumb")}>
      <ol>
        {items.map((item, i) => {
          const current = i === items.length - 1;
          return (
            <li key={`${i}-${item.label}`}>
              {item.href && !current ? <Link href={item.href}>{item.label}</Link> : <span aria-current={current ? "page" : undefined} title={item.label}>{item.label}</span>}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
