import { exportArchive, parseArchive, validateArchive } from "../domain/outcomeArchive";
import { readLegacyArchive } from "../infrastructure/legacyArchiveMigration";
import type { DatabaseBridge, DatabaseWrite, DBRepository, LegacyArchive } from "../model/database.js";
import type { PlannerArchive } from "../model/outcomeArchive.js";
import type { Palette } from "../model/theme.js";
import { loadPalette, PALETTE_STORAGE_KEY } from "../theme";

export class RepositoryDB implements DBRepository {
  constructor(
    private readonly bridge: () => DatabaseBridge | undefined = () => window.plannerDB,
    private readonly migrate: () => Promise<LegacyArchive> = readLegacyArchive,
  ) {}
  private connection() {
    const bridge = this.bridge();
    if (!bridge) throw new Error('Apri l’app desktop per utilizzare il database SQLite. Il browser non dispone del collegamento a Electron.');
    return bridge;
  }
  async loadPalette() { return loadPalette(); }
  async savePalette(value: Palette) { localStorage.setItem(PALETTE_STORAGE_KEY, value); }
  async initialize() {
    const connection = this.connection();
    const existing = await connection.read();
    if (existing) { validateArchive(existing.archive); return existing; }
    const legacy = await this.migrate();
    return connection.write({ ...legacy, expectedRevision: null });
  }
  async save(input: DatabaseWrite) { validateArchive(input.archive); return this.connection().write(input); }
  async prepareImport(text: string) { return parseArchive(text); }
  async exportBackup(archive: PlannerArchive) { return exportArchive(archive); }
}
export const repositoryDB = new RepositoryDB();
