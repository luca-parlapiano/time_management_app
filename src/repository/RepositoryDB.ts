import { archiveForStorage, exportArchive, parseArchive, upgradeArchive, validateArchive } from "../domain/outcomeArchive";
import { reconcileHabitCompletion } from "../domain/habitCompletion";
import { emptyCalendar } from "../domain/calendar";
import type { DatabaseBridge, DatabaseSnapshot, DatabaseWrite, DBRepository } from "../model/database.js";
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
  /**
   * Prepara lo snapshot restituito dal bridge senza modificarlo né riscrivere SQLite.
   * Valida archivio corrente e copia precedente e ricostruisce le chiusure dagli esiti;
   * una copia precedente assente resta null, gli errori vengono propagati alla UI.
   */
  private prepareSnapshot(snapshot: DatabaseSnapshot): DatabaseSnapshot {
    const archive = upgradeArchive(snapshot.archive);
    const previous = snapshot.previous === null ? null : upgradeArchive(snapshot.previous);
    validateArchive(archive);
    if (previous !== null) validateArchive(previous);
    return {
      ...snapshot,
      archive: reconcileHabitCompletion(archive),
      previous: previous === null ? null : reconcileHabitCompletion(previous),
    };
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
    if (existing) return this.prepareSnapshot(existing);
    const archive: PlannerArchive = {
      format: 'time-planner-backup', version: 2, calendar: emptyCalendar(), habits: [], history: [],
    };
    return this.prepareSnapshot(await connection.write({ archive, expectedRevision: null }));
  }
  /** Invia solo dati persistenti al worker e ricostruisce la chiusura sullo snapshot confermato, anche con un worker già avviato. */
  async save(input: DatabaseWrite) {
    validateArchive(input.archive);
    const saved = await this.connection().write({ ...input, archive: archiveForStorage(input.archive) });
    return this.prepareSnapshot(saved);
  }
  async reset(expectedRevision: number) { return this.prepareSnapshot(await this.connection().reset(expectedRevision)); }
  async prepareImport(text: string) { return parseArchive(text); }
  async exportBackup(archive: PlannerArchive) { return exportArchive(archive); }
}
export const repositoryDB = new RepositoryDB();
