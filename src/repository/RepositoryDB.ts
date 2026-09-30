import { exportArchive, parseArchive, validateArchive } from "../domain/outcomeArchive";
import { emptyCalendar } from "../domain/calendar";
import type { DatabaseBridge, DatabaseWrite, DBRepository } from "../model/database.js";
import type { PlannerArchive } from "../model/outcomeArchive.js";
import type { Palette } from "../model/theme.js";

export class RepositoryDB implements DBRepository {
  constructor(
    private readonly bridge: () => DatabaseBridge | undefined = () => window.plannerDB,
  ) {}
  private connection() {
    const bridge = this.bridge();
    if (!bridge) throw new Error('Apri l’app desktop per utilizzare il database SQLite. Il browser non dispone del collegamento a Electron.');
    return bridge;
  }
  /** Legge la preferenza del dispositivo da SQLite tramite il worker. */
  async loadPalette() { return this.connection().readPalette(); }
  /** Salva solo la preferenza, senza riscrivere calendario e storico. */
  async savePalette(value: Palette) { await this.connection().writePalette(value); }
  /**
   * Legge lo snapshot SQLite esistente o inizializza un archivio vuoto alla prima apertura.
   * Non consulta storage alternativi. Errori di lettura o scrittura vengono propagati:
   * un archivio non leggibile non deve essere sostituito con dati vuoti.
   */
  async initialize() {
    const connection = this.connection();
    const existing = await connection.read();
    if (existing) { validateArchive(existing.archive); return existing; }
    const archive: PlannerArchive = {
      format: 'time-planner-backup', version: 1, calendar: emptyCalendar(), habits: [], history: [],
    };
    return connection.write({ archive, expectedRevision: null });
  }
  async save(input: DatabaseWrite) { validateArchive(input.archive); return this.connection().write(input); }
  async prepareImport(text: string) { return parseArchive(text); }
  async exportBackup(archive: PlannerArchive) { return exportArchive(archive); }
}
export const repositoryDB = new RepositoryDB();
