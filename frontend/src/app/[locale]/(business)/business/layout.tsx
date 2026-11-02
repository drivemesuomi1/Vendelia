import type { ReactNode } from "react";
import { BusinessGate } from "@/features/merchant/components/BusinessGate";
import { getSession } from "@/lib/session";
import { portalClass } from "@/lib/portal-fonts";
import "@/styles/portal.css";

export const metadata = { title: "Yritysportaali", robots: { index: false } };

/** Real Supabase Auth session and active merchant membership are checked server-side. */
export default async function BusinessLayout({ children }: { children: ReactNode }) {
  const user = await getSession();
  return (
    <div className={portalClass}>
      <BusinessGate user={user}>{children}</BusinessGate>
    </div>
  );
}
