import type { ReactNode } from "react";
import { Footer } from "@/components/layout/Footer";
import { Header } from "@/components/layout/Header";
import { CartDrawer } from "@/features/cart/components/CartDrawer";

/** Customer-facing pages: header, footer and the slide-in cart. */
export default function ShopLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <Header />
      {children}
      <Footer />
      <CartDrawer />
    </>
  );
}
