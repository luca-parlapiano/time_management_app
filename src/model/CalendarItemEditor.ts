import type { CalendarItem, EditTarget, Occurrence } from "./calendar.js";

export interface CalendarItemEditorProps {
  date: string;
  item?: CalendarItem;
  occurrence?: Occurrence;
  items: CalendarItem[];
  onClose: () => void;
  onSave: (item: CalendarItem, unlocked: boolean, target?: EditTarget, weekdays?: number[]) => Promise<void>;
  onDelete: (target: EditTarget, unlocked: boolean) => Promise<void>;
}
