import type { ItemOutcome, Occurrence } from "./calendar.js";

export interface AgendaEventCardProps {
  item: Occurrence; date: string; top: string; height: string; disabled?: boolean;
  onOpen: (item: Occurrence) => void;
  onDelete: (item: Occurrence) => void;
  onOutcome: (item: Occurrence, outcome: ItemOutcome) => Promise<void>;
}
