import { describe, expect, it } from 'vitest';
import { DEFAULT_AUTO_CAPTURE_CONFIG } from '../../autocapture/decideAutoCapture';
import type { CanonId } from '../../composition/types';
import { STREAK_SCORE_THRESHOLD, currentStreak, dayKeyFor, journalStats, type JournalStatsEntry } from '../journalStats';

const DAY_MS = 24 * 60 * 60 * 1000;
const NOW_MS = Date.UTC(2026, 9, 17, 12, 0, 0); // 2026-10-17T12:00:00Z
const UTC = 0;

function entry(daysAgo: number, score: number, canonId: CanonId = 'thirds'): JournalStatsEntry {
  return { createdAtMs: NOW_MS - daysAgo * DAY_MS, score, canonId };
}

describe('dayKeyFor', () => {
  it('builds a local-date key for UTC', () => {
    expect(dayKeyFor(NOW_MS, UTC)).toBe('2026-10-17');
  });

  it('shifts the key across midnight with the timezone offset', () => {
    const justAfterUtcMidnight = Date.UTC(2026, 9, 17, 0, 30, 0);
    expect(dayKeyFor(justAfterUtcMidnight, UTC)).toBe('2026-10-17');
    // 120 minutes behind UTC puts local time before midnight.
    expect(dayKeyFor(justAfterUtcMidnight, 120)).toBe('2026-10-16');
    // 120 minutes ahead of UTC stays on the same local day.
    expect(dayKeyFor(justAfterUtcMidnight, -120)).toBe('2026-10-17');
  });
});

describe('currentStreak', () => {
  it('uses the auto-capture ready threshold, not a hardcoded value', () => {
    expect(STREAK_SCORE_THRESHOLD).toBe(DEFAULT_AUTO_CAPTURE_CONFIG.compositionThreshold);
  });

  it('is 0 for an empty journal', () => {
    expect(currentStreak([], NOW_MS, UTC)).toBe(0);
  });

  it('counts a qualifying capture today as a 1-day streak', () => {
    expect(currentStreak([entry(0, STREAK_SCORE_THRESHOLD)], NOW_MS, UTC)).toBe(1);
  });

  it('ignores days whose best capture is below the threshold', () => {
    expect(currentStreak([entry(0, STREAK_SCORE_THRESHOLD - 0.1)], NOW_MS, UTC)).toBe(0);
    expect(currentStreak([entry(0, 95), entry(1, 60), entry(2, 95)], NOW_MS, UTC)).toBe(1);
  });

  it('keeps a streak alive when today is quiet but yesterday qualified', () => {
    const entries = [entry(1, 90), entry(2, 85), entry(3, 88)];
    expect(currentStreak(entries, NOW_MS, UTC)).toBe(3);
  });

  it('drops the streak to 0 once two days pass without a qualifying capture', () => {
    expect(currentStreak([entry(2, 95), entry(3, 95)], NOW_MS, UTC)).toBe(0);
  });

  it('counts consecutive qualifying days ending today', () => {
    const entries = [entry(0, 84), entry(1, 91), entry(2, 83), entry(4, 99)];
    expect(currentStreak(entries, NOW_MS, UTC)).toBe(3);
  });

  it('treats several captures on one local day as one streak day', () => {
    const entries = [entry(0, 90), { ...entry(0, 85), createdAtMs: NOW_MS - 60 * 60 * 1000 }];
    expect(currentStreak(entries, NOW_MS, UTC)).toBe(1);
  });
});

describe('journalStats', () => {
  it('reports zeros and nulls for an empty journal', () => {
    const stats = journalStats([], NOW_MS, UTC);
    expect(stats.totalCaptures).toBe(0);
    expect(stats.currentStreak).toBe(0);
    expect(stats.sevenDayAverageScore).toBeNull();
    expect(stats.bestScoreByCanon.thirds).toBeUndefined();
    expect(stats.bestScoreByCanon.phi).toBeUndefined();
    expect(stats.bestScoreByCanon.root2).toBeUndefined();
    expect(stats.bestScoreByCanon.diagonals).toBeUndefined();
  });

  it('averages only the last seven days of scores', () => {
    const entries = [entry(0, 90), entry(2, 70), entry(10, 10)];
    const stats = journalStats(entries, NOW_MS, UTC);
    expect(stats.totalCaptures).toBe(3);
    expect(stats.sevenDayAverageScore).toBe(80);
  });

  it('returns a null average when nothing was captured in the last seven days', () => {
    const stats = journalStats([entry(8, 95), entry(30, 99)], NOW_MS, UTC);
    expect(stats.sevenDayAverageScore).toBeNull();
    expect(stats.totalCaptures).toBe(2);
  });

  it('tracks the best score per canon and leaves quiet canons undefined', () => {
    const entries = [entry(0, 84, 'phi'), entry(1, 91, 'phi'), entry(2, 60, 'thirds'), entry(20, 97, 'diagonals')];
    const stats = journalStats(entries, NOW_MS, UTC);
    expect(stats.bestScoreByCanon.phi).toBe(91);
    expect(stats.bestScoreByCanon.thirds).toBe(60);
    expect(stats.bestScoreByCanon.diagonals).toBe(97);
    expect(stats.bestScoreByCanon.root2).toBeUndefined();
  });
});
