"use client";

export function QtyStepper({
  value,
  onChange,
  min = 1,
  max = 10,
  label,
  decLabel,
  incLabel,
}: {
  value: number;
  onChange: (next: number) => void;
  min?: number;
  max?: number;
  label: string;
  decLabel: string;
  incLabel: string;
}) {
  return (
    <div className="qty" role="group" aria-label={label}>
      <button type="button" aria-label={decLabel} disabled={value <= min} onClick={() => onChange(Math.max(min, value - 1))}>
        −
      </button>
      <output aria-live="polite">{value}</output>
      <button type="button" aria-label={incLabel} disabled={value >= max} onClick={() => onChange(Math.min(max, value + 1))}>
        +
      </button>
    </div>
  );
}
