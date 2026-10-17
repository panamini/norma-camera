import { CANON_ORDER } from '../composition/canons';
import type { CanonId } from '../composition/types';
import type { CapturedPhoto } from '../state/cameraUiStore';

export const JOURNAL_SCHEMA_VERSION = 1;

/** A journal row: the captured photo's metadata plus its journal-local photo filename. */
export type JournalEntry = {
  createdAtMs: number;
  label: string;
  score: number;
  canonId: CanonId;
  fileName: string;
};

function isCanonId(value: unknown): value is CanonId {
  return typeof value === 'string' && (CANON_ORDER as string[]).includes(value);
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

/** Validates one metadata row. Unknown extra fields are tolerated; a bad row yields null. */
function parseJournalEntry(row: unknown): JournalEntry | null {
  if (typeof row !== 'object' || row === null) return null;
  const candidate = row as Record<string, unknown>;
  if (!isFiniteNumber(candidate.createdAtMs)) return null;
  if (typeof candidate.label !== 'string') return null;
  if (!isFiniteNumber(candidate.score)) return null;
  if (!isCanonId(candidate.canonId)) return null;
  if (typeof candidate.fileName !== 'string' || candidate.fileName.length === 0) return null;
  return {
    createdAtMs: candidate.createdAtMs,
    label: candidate.label,
    score: candidate.score,
    canonId: candidate.canonId,
    fileName: candidate.fileName
  };
}

/**
 * Parses journal metadata JSON. Corrupted JSON, a wrong document shape, or an
 * unknown schema version yields an empty journal; bad rows are skipped and
 * unknown fields (row-level and document-level) are tolerated. Never throws.
 */
export function parseJournalMetadata(text: string): JournalEntry[] {
  try {
    const parsed: unknown = JSON.parse(text);
    if (typeof parsed !== 'object' || parsed === null) return [];
    const document = parsed as Record<string, unknown>;
    if (document.version !== JOURNAL_SCHEMA_VERSION) return [];
    if (!Array.isArray(document.entries)) return [];
    return document.entries.map(parseJournalEntry).filter((entry): entry is JournalEntry => entry !== null);
  } catch {
    return [];
  }
}

/** Serializes entries into the versioned journal metadata document. */
export function serializeJournalMetadata(entries: readonly JournalEntry[]): string {
  return JSON.stringify({ version: JOURNAL_SCHEMA_VERSION, entries });
}

/** Journal-local photo filename: capture time + canon, keeping the source extension. */
export function journalPhotoFileName(photo: Pick<CapturedPhoto, 'uri' | 'createdAtMs' | 'canonId'>): string {
  const match = /\.([A-Za-z0-9]{1,5})$/.exec(photo.uri);
  const extension = match ? match[1].toLowerCase() : 'jpg';
  return `${photo.createdAtMs}-${photo.canonId}.${extension}`;
}

/** Builds the metadata row for a capture about to enter the journal. */
export function journalEntryForPhoto(photo: CapturedPhoto): JournalEntry {
  return {
    createdAtMs: photo.createdAtMs,
    label: photo.label,
    score: photo.score,
    canonId: photo.canonId,
    fileName: journalPhotoFileName(photo)
  };
}
