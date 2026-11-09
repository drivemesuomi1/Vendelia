import type { ReactNode } from "react";
import { siteThemeClass } from "@/lib/portal-fonts";
import "@/styles/site-theme.css";

/** Customer sign-in: full-screen split like the portal sign-ins, without the shop header and footer. */
export default function SignInLayout({ children }: { children: ReactNode }) {
  return <div className={siteThemeClass}>{children}</div>;
}
