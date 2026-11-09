import type { ReactNode } from "react";
import { portalClass } from "@/lib/portal-fonts";
import "@/styles/portal.css";
import "@/styles/site-theme.css";

/** Customer account: the same sidebar layout as the business portal and admin area. */
export default function AccountLayout({ children }: { children: ReactNode }) {
  return <div className={portalClass}>{children}</div>;
}
