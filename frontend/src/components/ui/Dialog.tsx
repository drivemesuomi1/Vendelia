"use client";

import { useEffect, useRef, type ReactNode } from "react";

/** Native <dialog> as a React component: focus trap, Esc to close and backdrop for free. */
export function Dialog({ open, onClose, children, className = "", labelledBy, wide }: { open: boolean; onClose: () => void; children: ReactNode; className?: string; labelledBy?: string; wide?: boolean }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (open && !el.open) el.showModal();
    if (!open && el.open) el.close();
  }, [open]);
  return (
    <dialog
      ref={ref}
      className={className}
      aria-labelledby={labelledBy}
      style={wide ? { maxWidth: 760 } : undefined}
      onClose={onClose}
      onClick={(e) => {
        if (e.target === ref.current) onClose();
      }}
    >
      {open && children}
    </dialog>
  );
}
