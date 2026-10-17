// Generato da scripts/sync-core.mjs: modificare il sorgente in App-desktop.
import { CALENDAR_EVENT_SLOT_MIN_HEIGHT, CALENDAR_TIMELINE_PIXELS_PER_MINUTE } from "../constants";
import type { CalendarTimeRange, CalendarTimeline } from "../model/calendar";
import { clamp, percentage } from "./math";

/**
 * Costruisce una scala compatta comune a tutte le colonne della settimana.
 * Riceve una fascia civile valida (start < end) e gli intervalli degli eventi di tutti i giorni.
 * Mantiene la densità di base nelle fasce lunghe e amplia solo dove serve a contenere gli header.
 * Limita gli intervalli alla fascia; ignora quelli vuoti e gestisce eventi sovrapposti su giorni diversi.
 */
export function buildCalendarTimeline(start: number, end: number, ranges: readonly CalendarTimeRange[]): CalendarTimeline {
  const boundaries = new Set([start, end]);
  const startsByEnd = new Map<number, Set<number>>();
  for (const range of ranges) {
    const from = clamp(range.start, start, end);
    const to = clamp(range.end, start, end);
    if (to <= from) continue;
    boundaries.add(from);
    boundaries.add(to);
    const starts = startsByEnd.get(to) ?? new Set<number>();
    starts.add(from);
    startsByEnd.set(to, starts);
  }
  const offsets = new Map<number, number>();
  let previousMinute = start;
  let previousOffset = 0;
  const points = [...boundaries].sort((a, b) => a - b).map(minute => {
    let offset = previousOffset + (minute - previousMinute) * CALENDAR_TIMELINE_PIXELS_PER_MINUTE;
    for (const from of startsByEnd.get(minute) ?? []) {
      offset = Math.max(offset, (offsets.get(from) ?? 0) + CALENDAR_EVENT_SLOT_MIN_HEIGHT);
    }
    offsets.set(minute, offset);
    previousMinute = minute;
    previousOffset = offset;
    return { minute, offset };
  });
  return { points, height: previousOffset };
}

/**
 * Converte un minuto civile in pixel sulla scala compatta, interpolando tra i punti adiacenti.
 * La scala deve provenire da buildCalendarTimeline; gli orari esterni restano ai suoi estremi.
 * Usare la stessa conversione per eventi, tacche orarie e indicatore dell'ora corrente.
 */
export function calendarTimelineOffset(minute: number, timeline: CalendarTimeline): number {
  let previous = timeline.points[0];
  if (minute <= previous.minute) return previous.offset;
  for (const point of timeline.points.slice(1)) {
    if (minute <= point.minute) {
      return previous.offset + (point.offset - previous.offset) * percentage(minute - previous.minute, point.minute - previous.minute) / 100;
    }
    previous = point;
  }
  return timeline.height;
}
