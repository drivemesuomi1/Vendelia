import type { ReactNode } from "react";
import { BusinessGate } from "@/features/portal-demo/BusinessGate";
import { portalClass } from "@/lib/portal-fonts";
import "@/styles/portal.css";

export const metadata = { title: "Yritysportaali", robots: { index: false } };

/**
 * Business portal: a business signs in with the details the admin created, then creates deals for review.
 * Demo mode: accounts and deals live in the browser (features/portal-demo/store.ts) until the API exists.
 */
export default function BusinessLayout({ children }: { children: ReactNode }) {
  return (
    <div className={portalClass}>
      <BusinessGate>{children}</BusinessGate>
    </div>
  );
}
