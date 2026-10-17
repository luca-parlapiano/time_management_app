// Generato da scripts/sync-core.mjs: modificare il sorgente in App-desktop.
import type { AgendaTimeSlot } from "../model/calendar";
import { clamp, percentage } from "./math";

/**
 * Posiziona l'ora corrente sulle schede dell'agenda, la cui altezza non rappresenta la durata.
 * Riceve minuti civili, schede ordinate senza sovrapposizioni e altezza della colonna in pixel.
 * Durante un evento interpola nella sua scheda; nelle pause usa lo spazio fra le schede.
 * Senza eventi usa tutta la colonna; gli orari esterni restano entro i limiti della fascia.
 */
export function agendaTimePosition(now: number, start: number, end: number, height: number, slots: readonly AgendaTimeSlot[]): number {
  const interpolate = (from: number, to: number, top: number, bottom: number) =>
    top + (bottom - top) * percentage(clamp(now, from, to) - from, to - from) / 100;
  let previousEnd = start;
  let previousBottom = 0;
  for (const slot of slots) {
    if (now < slot.start) return interpolate(previousEnd, slot.start, previousBottom, slot.top);
    if (now <= slot.end) return interpolate(slot.start, slot.end, slot.top, slot.bottom);
    previousEnd = slot.end;
    previousBottom = slot.bottom;
  }
  return interpolate(previousEnd, end, previousBottom, height);
}
