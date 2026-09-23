import type { CalendarState } from "./calendar.js";
import type { OutcomeRecord } from "./outcomeArchive.js";

export interface CalendarStatisticsProps { state: CalendarState; history: OutcomeRecord[] }
