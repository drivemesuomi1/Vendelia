"use client";

import { useEffect, useRef, type ReactNode } from "react";

/** Native <dialog> as a React component: focus trap, Esc to close and backdrop for free. */
export function Dialog({ open, onClose, children, className = "", labelledBy, describedBy, role, dismissible = true, wide }: { open: boolean; onClose: () => void; children: ReactNode; className?: string; labelledBy?: string; describedBy?: string; role?: 'dialog' | 'alertdialog'; dismissible?: boolean; wide?: boolean }) {
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
      aria-describedby={describedBy}
      role={role}
      style={wide ? { maxWidth: 760 } : undefined}
      onClose={onClose}
      onCancel={(event) => { if (!dismissible) event.preventDefault(); }}
      onClick={(e) => {
        if (dismissible && e.target === ref.current) onClose();
      }}
    >
      {open && children}
    </dialog>
  );
}
