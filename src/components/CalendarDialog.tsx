import { useEffect, useRef } from "react";
import type { ReactNode } from "react";

interface CalendarDialogProps {
  title: string;
  onClose: () => void;
  children: ReactNode;
  compact?: boolean;
}

export function CalendarDialog({ title, onClose, children, compact = false }: CalendarDialogProps) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = ref.current;
    dialog?.showModal();
    return () => dialog?.close();
  }, []);
  return <dialog ref={ref} className={`calendar-dialog modal-card${compact ? " compact-event-menu" : ""}`} aria-labelledby="dialog-title" onCancel={onClose}>
    <div className="modal-header">
      <h3 id="dialog-title">{title}</h3>
      <button type="button" className="ghost-button" aria-label="Chiudi" onClick={onClose}>{compact ? "×" : "Chiudi"}</button>
    </div>
    {children}
  </dialog>;
}
