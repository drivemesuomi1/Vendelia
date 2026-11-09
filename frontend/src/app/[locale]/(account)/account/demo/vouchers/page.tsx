import type { Metadata } from "next";
import { demoAccount } from "@vendelia/shared";
import { getT, resolveLocale } from "@/i18n/server";
import { AccountPortal } from "@/features/vouchers/components/AccountPortal";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  return { title: getT(await resolveLocale(params))("account.demoTitle"), robots: { index: false } };
}

/** Demo account: vouchers, with sample data. */
export default function DemoVouchersPage() {
  const { user, vouchers } = demoAccount(process.env.PUBLIC_SITE_URL?.trim() || undefined);
  return <AccountPortal section="vouchers" user={user} initial={vouchers} demo />;
}
