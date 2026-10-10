import { describe, expect, it } from 'vitest';
import { BURN_IN_MAX_DIMENSION, burnInStrokeWidth, burnInTargetSize, burnInTickHalfLength } from '../burnInGeometry';

describe('burnInTargetSize', () => {
  it('caps the longest side and preserves aspect', () => {
    expect(burnInTargetSize(4096, 3072)).toEqual({ width: 2048, height: 1536 });
    expect(burnInTargetSize(3072, 4096)).toEqual({ width: 1536, height: 2048 });
  });

  it('never upscales', () => {
    expect(burnInTargetSize(1000, 750)).toEqual({ width: 1000, height: 750 });
  });

  it('uses the configured maximum', () => {
    expect(BURN_IN_MAX_DIMENSION).toBe(2048);
    expect(burnInTargetSize(4000, 2000, 1000)).toEqual({ width: 1000, height: 500 });
  });

  it('returns empty on degenerate input', () => {
    expect(burnInTargetSize(0, 100)).toEqual({ width: 0, height: 0 });
    expect(burnInTargetSize(100, -1)).toEqual({ width: 0, height: 0 });
  });
});

describe('burn-in mark scaling', () => {
  it('keeps strokes and ticks visible at any target size', () => {
    expect(burnInStrokeWidth(2048)).toBe(4);
    expect(burnInStrokeWidth(400)).toBe(2);
    expect(burnInTickHalfLength(2048)).toBe(26);
    expect(burnInTickHalfLength(320)).toBe(8);
  });
});
