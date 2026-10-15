import { archiveForStorage, exportArchive, parseArchive, upgradeArchive, validateArchive } from "../domain/outcomeArchive";
import { reconcileHabitCompletion } from "../domain/habitCompletion";
import { upgradeTimeSeries } from "../domain/timeSeries";
import { emptyCalendar } from "../domain/calendar";
import type { DatabaseBridge, DatabaseSnapshot, DatabaseWrite, DBRepository } from "../model/database.js";
import type { PlannerArchive } from "../model/outcomeArchive.js";
import type { Palette } from "../model/theme.js";

/** Indica se l'archivio usa almeno una preferenza trofei introdotta nel formato corrente. */
function hasTrophyPreferences(archive: PlannerArchive): boolean {
  return Boolean(archive.habits?.some(habit => habit.trophiesEnabled) ||
    archive.weeklyTimeHabits?.some(habit => habit.series?.some(series => series.trophiesEnabled)));
}

/** Riconosce il rifiuto di un processo Electron precedente che non conosce ancora i campi dei trofei. */
function isStaleTrophyValidatorError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  return error.message.includes('Dati delle ore non validi') ||
    error.message.includes('campo non previsto') && error.message.includes('trophiesEnabled');
}

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
    const upgraded = upgradeTimeSeries(archive);
    const upgradedPrevious = previous === null ? null : upgradeTimeSeries(previous);
    validateArchive(upgraded);
    if (upgradedPrevious !== null) validateArchive(upgradedPrevious);
    return {
      ...snapshot,
      archive: reconcileHabitCompletion(upgraded),
      previous: upgradedPrevious === null ? null : reconcileHabitCompletion(upgradedPrevious),
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
      format: 'time-planner-backup', version: 3, calendar: emptyCalendar(), habits: [], history: [],
    };
    return this.prepareSnapshot(await connection.write({ archive, expectedRevision: null }));
  }
  /** Invia solo dati persistenti al worker e ricostruisce la chiusura sullo snapshot confermato, anche con un worker già avviato. */
  async save(input: DatabaseWrite) {
    validateArchive(input.archive);
    let saved: DatabaseSnapshot;
    try {
      saved = await this.connection().write({ ...input, archive: archiveForStorage(input.archive) });
    } catch (error) {
      if (hasTrophyPreferences(input.archive) && isStaleTrophyValidatorError(error)) {
        throw new Error('La parte desktop dell\'app deve essere riavviata per attivare i trofei. I dati non sono stati modificati: chiudi e riapri l\'app, poi riprova.', { cause: error });
      }
      throw error;
    }
    return this.prepareSnapshot(saved);
  }
  async reset(expectedRevision: number) { return this.prepareSnapshot(await this.connection().reset(expectedRevision)); }
  async prepareImport(text: string) { return parseArchive(text); }
  async exportBackup(archive: PlannerArchive) { return exportArchive(archive); }
}
export const repositoryDB = new RepositoryDB();
