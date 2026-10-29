"use client";

import { Fragment } from "react";
import { useI18n } from "@/i18n/I18nProvider";

export function CheckoutSteps({ current }: { current: 1 | 2 | 3 }) {
  const { t } = useI18n();
  const steps = [t("checkout.stepCart"), t("checkout.stepDetails"), t("checkout.stepDone")];
  return (
    <ol className="stepper" aria-label={t("checkout.steps")} style={{ listStyle: "none", padding: 0 }}>
      {steps.map((s, i) => {
        const n = i + 1;
        return (
          <Fragment key={s}>
            <li>
              <span className={n === current ? "on" : n < current ? "done" : ""} aria-current={n === current ? "step" : undefined}>
                <span className="n">{n < current ? "✓" : n}</span>
                {s}
              </span>
            </li>
            {n < steps.length && <li aria-hidden="true">›</li>}
          </Fragment>
        );
      })}
    </ol>
  );
}
