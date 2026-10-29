import type { ReactNode } from "react";
import { Footer } from "@/components/layout/Footer";
import { Header } from "@/components/layout/Header";

/** Sign-in and sign-up pages: normal header, narrow centred content. */
export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <Header />
      <main className="wrap auth-wrap">{children}</main>
      <Footer />
    </>
  );
}
