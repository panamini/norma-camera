import { describe, expect, it } from 'vitest';
import { canonById } from '../../composition/canons';
import { PHI_INV } from '../../composition/guides';
import type { NativeLineSegmentCandidate } from '../nativeHeuristicTypes';
import { DEFAULT_LINE_HARMONY_CONFIG, EMPTY_LINE_HARMONY, scoreLineHarmony, type HarmonySegment } from '../lineHarmony';

function segment(partial: Partial<HarmonySegment> & Pick<NativeLineSegmentCandidate, 'x1' | 'y1' | 'x2' | 'y2'>): HarmonySegment {
  return {
    angleDeg: 0,
    lengthEuclidean: 0,
    confidence: 0.8,
    orientationKind: 'unknown',
    src: 'native-line-segment-spike',
    stabilityState: 'stable',
    ...partial
  };
}

const THIRDS = canonById('thirds');
const PHI = canonById('phi');
const DIAGONALS = canonById('diagonals');

describe('scoreLineHarmony', () => {
  it('returns the empty readout without segments', () => {
    expect(scoreLineHarmony(null, THIRDS)).toEqual(EMPTY_LINE_HARMONY);
    expect(scoreLineHarmony([], THIRDS)).toEqual(EMPTY_LINE_HARMONY);
  });

  it('scores a horizontal segment sitting exactly on the upper third at 100', () => {
    const result = scoreLineHarmony([segment({ x1: 0.1, y1: 1 / 3, x2: 0.9, y2: 1 / 3 })], THIRDS);
    expect(result.score).toBe(100);
    expect(result.consideredSegments).toBe(1);
    expect(result.matches[0]?.guideLabel).toBe('UPPER_THIRD');
    expect(result.matches[0]?.agreement).toBeCloseTo(1, 9);
  });

  it('matches vertical segments to the phi verticals', () => {
    const result = scoreLineHarmony([segment({ x1: PHI_INV, y1: 0.2, x2: PHI_INV, y2: 0.8 })], PHI);
    expect(result.matches[0]?.guideLabel).toBe('PHI_RIGHT');
    expect(result.score).toBe(100);
  });

  it('matches a diagonal segment to the falling diagonal', () => {
    const result = scoreLineHarmony([segment({ x1: 0.3, y1: 0.3, x2: 0.7, y2: 0.7 })], DIAGONALS);
    expect(result.matches[0]?.guideLabel).toBe('DIAGONAL_FALLING');
    expect(result.score).toBe(100);
  });

  it('degrades with offset and rejects beyond tolerance', () => {
    const offsetValue = DEFAULT_LINE_HARMONY_CONFIG.maxOffset / 2;
    const near = scoreLineHarmony([segment({ x1: 0.1, y1: 1 / 3 + offsetValue, x2: 0.9, y2: 1 / 3 + offsetValue })], THIRDS);
    expect(near.score).toBe(50);

    const far = scoreLineHarmony([segment({ x1: 0.1, y1: 0.5, x2: 0.9, y2: 0.5 })], THIRDS);
    expect(far.score).toBe(0);
    expect(far.consideredSegments).toBe(1);
    expect(far.matches).toHaveLength(0);
  });

  it('rejects segments whose angle disagrees even at zero offset', () => {
    const tilted = scoreLineHarmony([segment({ x1: 0.1, y1: 1 / 3 - 0.08, x2: 0.9, y2: 1 / 3 + 0.08 })], THIRDS);
    expect(tilted.matches).toHaveLength(0);
  });

  it('weighs disagreeing segments against the score', () => {
    const agreeing = segment({ x1: 0.1, y1: 1 / 3, x2: 0.9, y2: 1 / 3 });
    const disagreeing = segment({ x1: 0.1, y1: 0.5, x2: 0.9, y2: 0.5 });
    const result = scoreLineHarmony([agreeing, disagreeing], THIRDS);
    expect(result.consideredSegments).toBe(2);
    expect(result.score).toBe(50);
    expect(result.matches).toHaveLength(1);
  });

  it('ignores fresh and too-short segments', () => {
    const freshSegment = segment({ x1: 0.1, y1: 1 / 3, x2: 0.9, y2: 1 / 3, stabilityState: 'fresh' });
    const crumb = segment({ x1: 0.45, y1: 1 / 3, x2: 0.5, y2: 1 / 3 });
    const result = scoreLineHarmony([freshSegment, crumb], THIRDS);
    expect(result).toEqual(EMPTY_LINE_HARMONY);
  });

  it('snaps matched segments onto their guide', () => {
    const offsetValue = 0.02;
    const nearUpperThird = scoreLineHarmony([segment({ x1: 0.1, y1: 1 / 3 + offsetValue, x2: 0.9, y2: 1 / 3 + offsetValue })], THIRDS);
    expect(nearUpperThird.matches[0]?.snapped).toEqual({ x1: 0.1, y1: 1 / 3, x2: 0.9, y2: 1 / 3 });

    const nearPhiVertical = scoreLineHarmony([segment({ x1: PHI_INV + 0.02, y1: 0.2, x2: PHI_INV + 0.02, y2: 0.8 })], PHI);
    expect(nearPhiVertical.matches[0]?.snapped).toEqual({ x1: PHI_INV, y1: 0.2, x2: PHI_INV, y2: 0.8 });

    const nearDiagonal = scoreLineHarmony([segment({ x1: 0.3, y1: 0.33, x2: 0.7, y2: 0.73 })], DIAGONALS);
    const snapped = nearDiagonal.matches[0]?.snapped;
    expect(snapped).toBeDefined();
    expect(snapped!.x1).toBeCloseTo(snapped!.y1, 9);
    expect(snapped!.x2).toBeCloseTo(snapped!.y2, 9);
  });

  it('accepts plain segments without a stability state', () => {
    const plain = segment({ x1: 0.1, y1: 2 / 3, x2: 0.9, y2: 2 / 3 });
    delete (plain as { stabilityState?: unknown }).stabilityState;
    const result = scoreLineHarmony([plain], THIRDS);
    expect(result.score).toBe(100);
    expect(result.matches[0]?.guideLabel).toBe('LOWER_THIRD');
  });
});
