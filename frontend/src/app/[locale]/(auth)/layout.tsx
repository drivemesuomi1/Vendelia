import type { ReactNode } from "react";
import { Footer } from "@/components/layout/Footer";
import { Header } from "@/components/layout/Header";
import { siteThemeClass } from "@/lib/portal-fonts";
import "@/styles/site-theme.css";

/** Sign-in and sign-up pages: normal header, narrow centred content, in the same look as the rest of the site. */
export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className={siteThemeClass}>
      <Header />
      <main className="wrap auth-wrap">{children}</main>
      <Footer />
    </div>
  );
}
