import { useEffect, useRef, type ReactNode } from "react";

export function CalendarDialog({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = ref.current;
    dialog?.showModal();
    return () => dialog?.close();
  }, []);
  return <dialog ref={ref} className="calendar-dialog modal-card" aria-labelledby="dialog-title" onCancel={onClose}>
    <div className="modal-header">
      <h3 id="dialog-title">{title}</h3>
      <button type="button" className="ghost-button" onClick={onClose}>Chiudi</button>
    </div>
    {children}
  </dialog>;
}
