import type { ReactNode } from "react";
import { resolveLocale } from "@/i18n/server";
import { requireSession } from "@/lib/session";
import { AccountShell } from "@/features/vouchers/components/AccountPortal";

/** Signed-in customers only; anyone else goes to sign-in and comes back to the account. */
export default async function SignedInAccountLayout({ children, params }: { children: ReactNode; params: Promise<{ locale: string }> }) {
  const locale = await resolveLocale(params);
  const user = await requireSession(locale, `/${locale}/account`);
  return <AccountShell user={{ name: user.name, email: user.email }}>{children}</AccountShell>;
}
