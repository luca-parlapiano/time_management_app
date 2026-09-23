import type { CalendarState, ItemOutcome, Occurrence } from "./calendar.js";

export interface WeeklyCalendarProps {
  state: CalendarState;
  week: string;
  disabled?: boolean;
  onAdd: (date: string) => void;
  onEdit: (item: Occurrence) => void;
  onDelete: (item: Occurrence) => void;
  onOutcome: (item: Occurrence, outcome: ItemOutcome) => Promise<void>;
}
