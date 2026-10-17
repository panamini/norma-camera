import { describe, expect, it } from 'vitest';
import type { CapturedPhoto } from '../../state/cameraUiStore';
import {
  JOURNAL_SCHEMA_VERSION,
  journalEntryForPhoto,
  journalPhotoFileName,
  parseJournalMetadata,
  serializeJournalMetadata,
  type JournalEntry
} from '../journalSerialization';

const validEntry: JournalEntry = {
  createdAtMs: 1760083200000,
  label: 'COMPOSITION READY',
  score: 86,
  canonId: 'phi',
  fileName: '1760083200000-phi.jpg'
};

const photo: CapturedPhoto = {
  uri: 'file:///cache/mrousavy-capture.JPG',
  createdAtMs: 1760083200000,
  label: 'COMPOSITION READY',
  score: 86,
  canonId: 'phi'
};

describe('parseJournalMetadata', () => {
  it('round-trips a serialized journal', () => {
    const second: JournalEntry = { ...validEntry, createdAtMs: 1760169600000, canonId: 'thirds', fileName: '1760169600000-thirds.jpg' };
    const text = serializeJournalMetadata([second, validEntry]);
    expect(parseJournalMetadata(text)).toEqual([second, validEntry]);
  });

  it('returns empty for corrupted JSON, non-object documents, and empty text', () => {
    expect(parseJournalMetadata('{ not json')).toEqual([]);
    expect(parseJournalMetadata('')).toEqual([]);
    expect(parseJournalMetadata('42')).toEqual([]);
    expect(parseJournalMetadata('null')).toEqual([]);
    expect(parseJournalMetadata('[]')).toEqual([]);
  });

  it('returns empty for an unknown schema version or a missing entries array', () => {
    expect(parseJournalMetadata(JSON.stringify({ version: 2, entries: [validEntry] }))).toEqual([]);
    expect(parseJournalMetadata(JSON.stringify({ entries: [validEntry] }))).toEqual([]);
    expect(parseJournalMetadata(JSON.stringify({ version: JOURNAL_SCHEMA_VERSION, entries: 'nope' }))).toEqual([]);
  });

  it('skips bad rows and keeps valid ones', () => {
    const rows = [
      validEntry,
      null,
      'string-row',
      { ...validEntry, createdAtMs: 'yesterday' },
      { ...validEntry, score: Number.NaN },
      { ...validEntry, canonId: 'golden-spiral' },
      { ...validEntry, fileName: '' },
      { ...validEntry, label: 7 }
    ];
    const text = JSON.stringify({ version: JOURNAL_SCHEMA_VERSION, entries: rows });
    expect(parseJournalMetadata(text)).toEqual([validEntry]);
  });

  it('tolerates unknown fields at document and row level', () => {
    const text = JSON.stringify({
      version: JOURNAL_SCHEMA_VERSION,
      futureFlag: true,
      entries: [{ ...validEntry, mood: 'contemplative' }]
    });
    expect(parseJournalMetadata(text)).toEqual([validEntry]);
  });
});

describe('journalPhotoFileName', () => {
  it('derives the name from capture time and canon, keeping the source extension', () => {
    expect(journalPhotoFileName(photo)).toBe('1760083200000-phi.jpg');
  });

  it('falls back to jpg when the uri has no recognizable extension', () => {
    expect(journalPhotoFileName({ ...photo, uri: 'simulated-capture://1760083200000' })).toBe('1760083200000-phi.jpg');
  });
});

describe('journalEntryForPhoto', () => {
  it('copies the CapturedPhoto shape plus the journal-local filename, without the uri', () => {
    expect(journalEntryForPhoto(photo)).toEqual(validEntry);
  });
});
