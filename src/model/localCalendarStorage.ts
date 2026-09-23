import type { CalendarState } from "./calendar.js";

export type CalendarStorage = Pick<Storage, "getItem" | "setItem">;

export interface CalendarLoad {
  state: CalendarState;
  raw: string | null;
  legacy: string | null;
  error: string | null;
}
