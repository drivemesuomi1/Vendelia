"use client";

import { useRouter } from "next/navigation";
import { Icon } from "@/components/ui/Icon";
import { useI18n } from "@/i18n/I18nProvider";
import { logout } from "../api";

export function LogoutButton({ className = "btn btn-ghost btn-sm" }: { className?: string }) {
  const { t, locale } = useI18n();
  const router = useRouter();
  return (
    <button
      className={className}
      onClick={async () => {
        await logout();
        router.push(`/${locale}`);
        router.refresh();
      }}
    >
      <Icon name="logout" />
      {t("auth.logout")}
    </button>
  );
}
