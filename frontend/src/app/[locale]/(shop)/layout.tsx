import type { ReactNode } from "react";
import { Footer } from "@/components/layout/Footer";
import { Header } from "@/components/layout/Header";
import { CartDrawer } from "@/features/cart/components/CartDrawer";
import { siteThemeClass } from "@/lib/portal-fonts";
import "@/styles/site-theme.css";

/** Customer-facing pages: header, footer and the slide-in cart, in the same look as the portals. */
export default function ShopLayout({ children }: { children: ReactNode }) {
  return (
    <div className={siteThemeClass}>
      <Header />
      {children}
      <Footer />
      <CartDrawer />
    </div>
  );
}
