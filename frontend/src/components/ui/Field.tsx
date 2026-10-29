import type { InputHTMLAttributes, ReactNode, TextareaHTMLAttributes } from "react";
import { Icon } from "./Icon";

/** Label + control + hint + error, wired up for screen readers. */
export function Field({ id, label, hint, error, required, children }: { id: string; label: ReactNode; hint?: ReactNode; error?: string; required?: boolean; children: ReactNode }) {
  return (
    <div className="field">
      <label htmlFor={id}>
        {label} {required && <span className="req" aria-hidden="true">*</span>}
      </label>
      {children}
      {error && (
        <span className="err-msg" id={`${id}-err`}>
          <Icon name="xc" />
          {error}
        </span>
      )}
      {hint && <span className="hint" id={`${id}-hint`}>{hint}</span>}
    </div>
  );
}

export function TextInput({ id, error, hint, ...rest }: InputHTMLAttributes<HTMLInputElement> & { id: string; error?: string; hint?: boolean }) {
  const describedBy = [error ? `${id}-err` : "", hint ? `${id}-hint` : ""].filter(Boolean).join(" ") || undefined;
  return <input id={id} className="input" aria-invalid={error ? true : undefined} aria-describedby={describedBy} {...rest} />;
}

export function TextArea({ id, error, ...rest }: TextareaHTMLAttributes<HTMLTextAreaElement> & { id: string; error?: string }) {
  return <textarea id={id} className="input" aria-invalid={error ? true : undefined} aria-describedby={error ? `${id}-err` : undefined} {...rest} />;
}
