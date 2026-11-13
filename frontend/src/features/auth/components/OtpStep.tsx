"use client";

import { useEffect, useRef, useState, type ClipboardEvent, type FormEvent, type KeyboardEvent } from "react";
import { Icon } from "@/components/ui/Icon";
import { useI18n } from "@/i18n/I18nProvider";

const LENGTH = 6;
const RESEND_SECONDS = 30;

/**
 * Six-box email code entry shown after the sign-up details. UI only for now: the code is not checked yet,
 * `onVerify` runs once all six digits are in. Paste fills every box; backspace steps back.
 */
export function OtpStep({ email, busy, error, onVerify, onBack }: {
  email: string;
  busy: boolean;
  error?: string;
  onVerify: (code: string) => void;
  onBack: () => void;
}) {
  const { t } = useI18n();
  const [digits, setDigits] = useState<string[]>(Array(LENGTH).fill(""));
  const [wait, setWait] = useState(RESEND_SECONDS);
  const boxes = useRef<(HTMLInputElement | null)[]>([]);
  const code = digits.join("");

  useEffect(() => { boxes.current[0]?.focus(); }, []);
  useEffect(() => {
    if (wait <= 0) return;
    const timer = setTimeout(() => setWait((s) => s - 1), 1000);
    return () => clearTimeout(timer);
  }, [wait]);

  const fill = (from: number, value: string) => {
    const chars = value.replace(/\D/g, "").slice(0, LENGTH - from).split("");
    if (!chars.length) return;
    const next = [...digits];
    chars.forEach((c, i) => { next[from + i] = c; });
    setDigits(next);
    boxes.current[Math.min(from + chars.length, LENGTH - 1)]?.focus();
  };
  const key = (i: number, e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !digits[i] && i > 0) {
      const next = [...digits]; next[i - 1] = ""; setDigits(next);
      boxes.current[i - 1]?.focus();
      e.preventDefault();
    } else if (e.key === "ArrowLeft" && i > 0) boxes.current[i - 1]?.focus();
    else if (e.key === "ArrowRight" && i < LENGTH - 1) boxes.current[i + 1]?.focus();
  };
  const paste = (i: number, e: ClipboardEvent<HTMLInputElement>) => { e.preventDefault(); fill(i, e.clipboardData.getData("text")); };
  const submit = (e: FormEvent) => { e.preventDefault(); if (code.length === LENGTH) onVerify(code); };

  return (
    <form className="signin-form otp-step" onSubmit={submit} noValidate>
      <span className="otp-badge" aria-hidden="true"><Icon name="mail" /></span>
      <div>
        <h1>{t("auth.otpTitle")}</h1>
        <p className="muted">{t("auth.otpSub", { email })}</p>
      </div>

      {error && <p className="signin-err" role="alert"><Icon name="xc" />{error}</p>}

      <fieldset className="otp-field">
        <legend>{t("auth.otpLabel")}</legend>
        <div className="otp-boxes">
          {digits.map((d, i) => (
            <input
              key={i}
              ref={(el) => { boxes.current[i] = el; }}
              className={d ? "is-filled" : undefined}
              value={d}
              inputMode="numeric"
              autoComplete={i === 0 ? "one-time-code" : "off"}
              maxLength={LENGTH}
              aria-label={t("auth.otpDigit", { n: i + 1 })}
              onChange={(e) => {
                const v = e.target.value.replace(/\D/g, "");
                if (v.length > 1) return fill(i, v);
                const next = [...digits]; next[i] = v; setDigits(next);
                if (v && i < LENGTH - 1) boxes.current[i + 1]?.focus();
              }}
              onKeyDown={(e) => key(i, e)}
              onPaste={(e) => paste(i, e)}
              onFocus={(e) => e.target.select()}
            />
          ))}
        </div>
      </fieldset>

      <button className="btn btn-primary btn-block signin-submit" type="submit" disabled={busy || code.length < LENGTH}>
        {busy ? <><span className="signin-spin" aria-hidden="true" />{t("auth.creating")}</> : <>{t("auth.otpVerify")}<Icon name="right" /></>}
      </button>

      <div className="otp-links">
        <button type="button" className="otp-link" disabled={wait > 0} onClick={() => setWait(RESEND_SECONDS)}>
          {wait > 0 ? t("auth.otpResendIn", { s: wait }) : t("auth.otpResend")}
        </button>
        <button type="button" className="otp-link" onClick={onBack}><Icon name="left" />{t("auth.otpChange")}</button>
      </div>
    </form>
  );
}
