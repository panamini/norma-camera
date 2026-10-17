import { Directory, File, Paths } from 'expo-file-system';
import type { CapturedPhoto } from '../state/cameraUiStore';
import { journalEntryForPhoto, parseJournalMetadata, serializeJournalMetadata, type JournalEntry } from './journalSerialization';

export const JOURNAL_DIRECTORY_NAME = 'harmony-journal';
const JOURNAL_METADATA_FILE_NAME = 'journal.json';

function journalDirectory(): Directory {
  return new Directory(Paths.document, JOURNAL_DIRECTORY_NAME);
}

function metadataFile(directory: Directory): File {
  return new File(directory, JOURNAL_METADATA_FILE_NAME);
}

function ensureJournalDirectory(): Directory {
  const directory = journalDirectory();
  if (!directory.exists) {
    directory.create({ intermediates: true, idempotent: true });
  }
  return directory;
}

/** Reads and validates the metadata file; corrupted or missing metadata reads as empty. */
function readEntries(directory: Directory): JournalEntry[] {
  try {
    const file = metadataFile(directory);
    if (!file.exists) return [];
    return parseJournalMetadata(file.textSync());
  } catch {
    return [];
  }
}

function writeEntries(directory: Directory, entries: readonly JournalEntry[]): void {
  const file = metadataFile(directory);
  if (!file.exists) {
    file.create();
  }
  file.write(serializeJournalMetadata(entries));
}

/** An entry whose photo file is gone is dropped gracefully (null). */
function photoForEntry(entry: JournalEntry, directory: Directory): CapturedPhoto | null {
  try {
    const file = new File(directory, entry.fileName);
    if (!file.exists) return null;
    return {
      uri: file.uri,
      createdAtMs: entry.createdAtMs,
      label: entry.label,
      score: entry.score,
      canonId: entry.canonId
    };
  } catch {
    return null;
  }
}

/**
 * Loads the persisted journal, newest first. Corrupted or missing metadata
 * yields an empty journal; entries whose photo file is missing are dropped.
 * Never throws — any failure degrades to session-only behavior.
 */
export function loadJournal(): CapturedPhoto[] {
  try {
    const directory = journalDirectory();
    if (!directory.exists) return [];
    return readEntries(directory)
      .map((entry) => photoForEntry(entry, directory))
      .filter((photo): photo is CapturedPhoto => photo !== null)
      .sort((a, b) => b.createdAtMs - a.createdAtMs);
  } catch {
    return [];
  }
}

/**
 * Copies the capture out of the purgeable camera cache into the journal
 * directory and prepends its metadata row. Never throws; on failure the
 * capture simply stays session-only.
 */
export async function appendJournalEntry(photo: CapturedPhoto): Promise<boolean> {
  try {
    const directory = ensureJournalDirectory();
    const entry = journalEntryForPhoto(photo);
    const destination = new File(directory, entry.fileName);
    if (!destination.exists) {
      new File(photo.uri).copy(destination);
    }
    const existing = readEntries(directory).filter((row) => row.createdAtMs !== entry.createdAtMs);
    writeEntries(directory, [entry, ...existing]);
    return true;
  } catch {
    return false;
  }
}

/**
 * Removes the journal entry captured at `createdAtMs`: deletes its photo file
 * and drops its metadata row. Never throws.
 */
export async function removeJournalEntry(createdAtMs: number): Promise<boolean> {
  try {
    const directory = journalDirectory();
    if (!directory.exists) return false;
    const entries = readEntries(directory);
    const entry = entries.find((row) => row.createdAtMs === createdAtMs);
    if (entry) {
      try {
        const file = new File(directory, entry.fileName);
        if (file.exists) file.delete();
      } catch {
        // The metadata row is still dropped below; a stray file is harmless.
      }
    }
    writeEntries(
      directory,
      entries.filter((row) => row.createdAtMs !== createdAtMs)
    );
    return true;
  } catch {
    return false;
  }
}
