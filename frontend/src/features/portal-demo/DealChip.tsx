"use client";

import { Icon } from "@/components/ui/Icon";
import { useI18n } from "@/i18n/I18nProvider";
import type { DemoDealStatus } from "./store";

/** Review status of a deal as admins see it (the business portal says "In review" instead of "Waiting"). */
export function DealChip({ status }: { status: DemoDealStatus }) {
  const { t } = useI18n();
  if (status === "live") return <span className="chip teal"><Icon name="checkc" />{t("admin.dr.live")}</span>;
  if (status === "pending") return <span className="chip warn"><Icon name="clock" />{t("admin.dr.pending")}</span>;
  return <span className="chip danger"><Icon name="xc" />{t("admin.dr.rejected")}</span>;
}
