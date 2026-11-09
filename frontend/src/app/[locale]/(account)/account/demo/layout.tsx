import type { ReactNode } from "react";
import { notFound } from "next/navigation";
import { demoAccount, demoAccountEnabled } from "@vendelia/shared";
import { AccountShell } from "@/features/vouchers/components/AccountPortal";

/** Sample account, no sign-in. Off in production unless VENDELIA_DEMO_ACCOUNT=true. */
export default function DemoAccountLayout({ children }: { children: ReactNode }) {
  if (!demoAccountEnabled(process.env)) notFound();
  return <AccountShell user={demoAccount().user} demo>{children}</AccountShell>;
}
