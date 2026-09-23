import type { ItemOutcome, Occurrence } from "./calendar.js";

export interface CalendarEventMenuProps {
  item: Occurrence;
  initialConfirmDelete?: boolean;
  onClose: () => void;
  onEdit: () => void;
  onOutcome: (outcome: ItemOutcome) => Promise<void>;
  onDelete: () => Promise<void>;
}
