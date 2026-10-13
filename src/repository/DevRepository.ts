import { emptyCalendar } from "../domain/calendar";
import { validateArchive } from "../domain/outcomeArchive";
import type { DatabaseBridge, DatabaseSnapshot } from "../model/database.js";
import type { Palette } from "../model/theme.js";
import { RepositoryDB } from "./RepositoryDB";

/**
 * Crea un repository di laboratorio indipendente e vuoto, con il RepositoryDB reale.
 * Il bridge conserva copie in memoria, valida gli archivi e controlla le revisioni.
 * Non accede a Electron, SQLite o storage del browser; una nuova istanza riparte da zero.
 */
export function createDevRepository(): RepositoryDB {
  let snapshot: DatabaseSnapshot | null = null;
  let palette: Palette = "natural";
  const bridge: DatabaseBridge = {
    read: async () => structuredClone(snapshot),
    readPalette: async () => palette,
    writePalette: async value => { palette = value; return palette; },
    write: async input => {
      if (input.expectedRevision !== (snapshot?.revision ?? null)) throw new Error("Revisione del laboratorio non aggiornata. Riprova.");
      validateArchive(input.archive);
      snapshot = {
        archive: structuredClone(input.archive), revision: (snapshot?.revision ?? -1) + 1,
        previous: input.replace ? structuredClone(snapshot?.archive ?? null) : snapshot?.previous ?? null,
      };
      return structuredClone(snapshot);
    },
    reset: async expectedRevision => {
      if (!snapshot || expectedRevision !== snapshot.revision) throw new Error("Revisione del laboratorio non aggiornata. Riprova.");
      snapshot = {
        archive: { format: "time-planner-backup", version: 3, calendar: emptyCalendar(), habits: [], history: [] },
        revision: snapshot.revision + 1, previous: null,
      };
      palette = "natural";
      return structuredClone(snapshot);
    },
  };
  return new RepositoryDB(() => bridge);
}
