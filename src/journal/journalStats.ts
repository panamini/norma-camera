import { DEFAULT_AUTO_CAPTURE_CONFIG } from '../autocapture/decideAutoCapture';
import { CANON_ORDER } from '../composition/canons';
import type { CanonId } from '../composition/types';

/** The minimal entry shape the stats need; JournalEntry and CapturedPhoto both satisfy it. */
export type JournalStatsEntry = {
  createdAtMs: number;
  score: number;
  canonId: CanonId;
};

export type JournalStats = {
  totalCaptures: number;
  currentStreak: number;
  sevenDayAverageScore: number | null;
  bestScoreByCanon: Record<CanonId, number | undefined>;
};

/** A day feeds the streak only when at least one entry reaches the ready threshold. */
export const STREAK_SCORE_THRESHOLD = DEFAULT_AUTO_CAPTURE_CONFIG.compositionThreshold;

const MINUTE_MS = 60 * 1000;
const DAY_MS = 24 * 60 * MINUTE_MS;
const SEVEN_DAYS_MS = 7 * DAY_MS;

/** offsetMinutes follows `Date.getTimezoneOffset` semantics: minutes behind UTC. */
function resolveOffsetMinutes(ms: number, offsetMinutes?: number): number {
  return offsetMinutes ?? new Date(ms).getTimezoneOffset();
}

/** Local-date day key (`YYYY-MM-DD`) for a timestamp. */
export function dayKeyFor(ms: number, offsetMinutes?: number): string {
  const localMs = ms - resolveOffsetMinutes(ms, offsetMinutes) * MINUTE_MS;
  return new Date(localMs).toISOString().slice(0, 10);
}

/**
 * Consecutive local days ending today or yesterday, each with at least one
 * entry scoring at the ready threshold or above. A quiet today does not break
 * yesterday's run; a gap before that does.
 */
export function currentStreak(entries: readonly JournalStatsEntry[], nowMs: number, offsetMinutes?: number): number {
  const offset = resolveOffsetMinutes(nowMs, offsetMinutes);
  const qualifyingDays = new Set<string>();
  for (const entry of entries) {
    if (entry.score >= STREAK_SCORE_THRESHOLD) {
      qualifyingDays.add(dayKeyFor(entry.createdAtMs, offset));
    }
  }
  if (qualifyingDays.size === 0) return 0;

  const startDaysAgo = qualifyingDays.has(dayKeyFor(nowMs, offset)) ? 0 : qualifyingDays.has(dayKeyFor(nowMs - DAY_MS, offset)) ? 1 : null;
  if (startDaysAgo === null) return 0;

  let streak = 0;
  for (let daysAgo = startDaysAgo; qualifyingDays.has(dayKeyFor(nowMs - daysAgo * DAY_MS, offset)); daysAgo += 1) {
    streak += 1;
  }
  return streak;
}

/** Mean score of the entries captured in the trailing seven days; null when there are none. */
function sevenDayAverageScore(entries: readonly JournalStatsEntry[], nowMs: number): number | null {
  const recent = entries.filter((entry) => entry.createdAtMs > nowMs - SEVEN_DAYS_MS && entry.createdAtMs <= nowMs);
  if (recent.length === 0) return null;
  const total = recent.reduce((sum, entry) => sum + entry.score, 0);
  return total / recent.length;
}

/** Best score recorded per canon; a canon with no entries stays undefined. */
function bestScoreByCanon(entries: readonly JournalStatsEntry[]): Record<CanonId, number | undefined> {
  const best = {} as Record<CanonId, number | undefined>;
  for (const canonId of CANON_ORDER) {
    best[canonId] = undefined;
  }
  for (const entry of entries) {
    const current = best[entry.canonId];
    if (current === undefined || entry.score > current) {
      best[entry.canonId] = entry.score;
    }
  }
  return best;
}

/** Aggregates the journal into the stats the JOURNAL sheet shows. Pure; never throws. */
export function journalStats(entries: readonly JournalStatsEntry[], nowMs: number, offsetMinutes?: number): JournalStats {
  return {
    totalCaptures: entries.length,
    currentStreak: currentStreak(entries, nowMs, offsetMinutes),
    sevenDayAverageScore: sevenDayAverageScore(entries, nowMs),
    bestScoreByCanon: bestScoreByCanon(entries)
  };
}
