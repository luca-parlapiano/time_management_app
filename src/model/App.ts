import type { Occurrence } from "./calendar.js";
export type AppTab = "calendar" | "statistics" | "settings";
export interface CalendarEditorState { date: string; occurrence?: Occurrence }
