import type { ReactNode } from "react";
import { Icon, type IconName } from "./Icon";

/** Coloured info box. Tone is never the only signal: every notice has an icon and text. */
export function Notice({ tone = "teal", icon = "info", children, className = "" }: { tone?: "teal" | "indigo" | "warn" | "danger"; icon?: IconName; children: ReactNode; className?: string }) {
  return (
    <div className={`notice ${tone === "teal" ? "" : tone} ${className}`} role={tone === "danger" || tone === "warn" ? "alert" : undefined}>
      <Icon name={icon} />
      <div>{children}</div>
    </div>
  );
}
