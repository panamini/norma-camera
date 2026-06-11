import { describe, expect, it } from 'vitest';
import { scoreHorizontalLineAgainstGuides } from '../lineGuideScore';
import type { NativeLineCandidate } from '../nativeHeuristicTypes';

function makeLine(overrides: Partial<NativeLineCandidate> = {}): NativeLineCandidate {
  return {
    x1: 0,
    y1: 1 / 3,
    x2: 1,
    y2: 1 / 3,
    angleDeg: 0,
    confidence: 0.6,
    kind: 'horizontal-line',
    ...overrides
  };
}

describe('horizontal line guide score signal', () => {
  it('returns n/a when no line is available', () => {
    expect(scoreHorizontalLineAgainstGuides(null)).toEqual({
      hasLine: false,
      score: null,
      nearestGuideLabel: null,
      distance: null,
      lineY: null
    });
  });

  it('scores a line near the upper third highly', () => {
    const result = scoreHorizontalLineAgainstGuides(makeLine({ y1: 0.335, y2: 0.345 }));

    expect(result.hasLine).toBe(true);
    expect(result.score).toBeGreaterThanOrEqual(90);
    expect(result.nearestGuideLabel).toBe('upper third');
    expect(result.distance).toBeLessThan(0.01);
    expect(result.lineY).toBeCloseTo(0.34, 3);
  });

  it('scores a line near the center highly', () => {
    const result = scoreHorizontalLineAgainstGuides(makeLine({ y1: 0.5, y2: 0.5 }));

    expect(result.hasLine).toBe(true);
    expect(result.score).toBe(100);
    expect(result.nearestGuideLabel).toBe('center');
    expect(result.distance).toBe(0);
  });

  it('scores a line far from guides lower', () => {
    const result = scoreHorizontalLineAgainstGuides(makeLine({ y1: 0.22, y2: 0.22 }));

    expect(result.hasLine).toBe(true);
    expect(result.score).toBe(6);
    expect(result.nearestGuideLabel).toBe('upper third');
  });

  it('returns n/a for malformed or unsupported line candidates', () => {
    expect(scoreHorizontalLineAgainstGuides(makeLine({ kind: 'unknown-line' }))).toEqual({
      hasLine: false,
      score: null,
      nearestGuideLabel: null,
      distance: null,
      lineY: null
    });
    expect(scoreHorizontalLineAgainstGuides(makeLine({ y1: Infinity }))).toEqual({
      hasLine: false,
      score: null,
      nearestGuideLabel: null,
      distance: null,
      lineY: null
    });
  });

  it('returns n/a for candidates below the render threshold', () => {
    expect(scoreHorizontalLineAgainstGuides(makeLine({ confidence: 0.1 }))).toEqual({
      hasLine: false,
      score: null,
      nearestGuideLabel: null,
      distance: null,
      lineY: null
    });
  });

  it('returns n/a when no horizontal guides are active', () => {
    expect(scoreHorizontalLineAgainstGuides(makeLine({ y1: 0.5, y2: 0.5 }), [])).toEqual({
      hasLine: false,
      score: null,
      nearestGuideLabel: null,
      distance: null,
      lineY: null
    });
  });
});
