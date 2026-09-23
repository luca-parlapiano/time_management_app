import type { ReactNode } from "react";

export interface CalendarDialogProps { title: string; onClose: () => void; children: ReactNode; compact?: boolean }
