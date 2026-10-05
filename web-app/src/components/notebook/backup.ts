import {
  normalizeLearning,
  type LearningProgress,
} from "../../services/lessons.ts";

/** Name of the notebook backup file. */
export const BACKUP_FILE_NAME = "elementapi-koleksiyon.json";

/** Larger files are rejected before they are read. */
export const MAX_BACKUP_BYTES = 32_768;

/** The backup file's content: the progress plus a format version. */
export function backupData(progress: LearningProgress) {
  return { version: 1, ...progress };
}

/**
 * Reads the text of a backup file. Returns normalized progress (unknown compounds
 * and unearned routes dropped), or `null` when it is not a version 1 notebook backup.
 */
export function parseBackup(text: string): LearningProgress | null {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    return null;
  }
  if (!parsed || typeof parsed !== "object") return null;
  const record = parsed as Record<string, unknown>;
  const valid =
    record.version === 1 &&
    Array.isArray(record.discoveries) &&
    Array.isArray(record.lessons);
  return valid ? normalizeLearning(record) : null;
}
