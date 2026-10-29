"use client";

import type { DealStatus } from "@vendelia/shared";
import { Icon } from "@/components/ui/Icon";
import { useI18n } from "@/i18n/I18nProvider";

export function DealStatusChip({ status }: { status: DealStatus }) {
  const { t } = useI18n();
  if (status === "live") return <span className="chip teal"><Icon name="checkc" />{t("business.statusLive")}</span>;
  if (status === "pending") return <span className="chip warn"><Icon name="clock" />{t("business.statusPending")}</span>;
  if (status === "rejected") return <span className="chip danger"><Icon name="xc" />{t("business.statusRejected")}</span>;
  return <span className="chip grey"><Icon name="doc" />{t("business.statusDraft")}</span>;
}
