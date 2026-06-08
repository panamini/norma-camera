import { describe, expect, it } from 'vitest';
import { buildLumaQualityAnalysis, computeLumaQualityMetrics } from '../lumaMetrics';

function repeat(value: number, count: number): number[] {
  return Array.from({ length: count }, () => value);
}

describe('luma quality metrics', () => {
  it('scores balanced mid-luma exposure highly', () => {
    const metrics = computeLumaQualityMetrics({ width: 4, height: 4, values: repeat(0.52, 16) });

    expect(metrics.exposure?.meanLuma).toBeCloseTo(0.52);
    expect(metrics.exposure?.exposureScore).toBeGreaterThanOrEqual(99);
    expect(metrics.sharpness?.sharpnessScore).toBe(0);
  });

  it('penalizes clipped highlights and crushed shadows', () => {
    const metrics = computeLumaQualityMetrics({ width: 4, height: 4, values: [...repeat(1, 8), ...repeat(0, 8)] });

    expect(metrics.exposure?.clippedHighlightsRatio).toBeCloseTo(0.5);
    expect(metrics.exposure?.crushedShadowsRatio).toBeCloseTo(0.5);
    expect(metrics.exposure?.exposureScore).toBeLessThan(30);
  });

  it('reports stronger sharpness for a luminance boundary than for a flat grid', () => {
    const flat = computeLumaQualityMetrics({ width: 5, height: 5, values: repeat(0.5, 25) });
    const boundary = computeLumaQualityMetrics({
      width: 5,
      height: 5,
      values: [
        0, 0, 0, 1, 1,
        0, 0, 0, 1, 1,
        0, 0, 0, 1, 1,
        0, 0, 0, 1, 1,
        0, 0, 0, 1, 1
      ]
    });

    expect(flat.sharpness?.edgeEnergy).toBe(0);
    expect(boundary.sharpness?.edgeEnergy).toBeGreaterThan(flat.sharpness?.edgeEnergy ?? 0);
    expect(boundary.sharpness?.sharpnessScore).toBeGreaterThan(flat.sharpness?.sharpnessScore ?? 0);
  });

  it('normalizes byte luma samples', () => {
    const metrics = computeLumaQualityMetrics({ width: 2, height: 2, values: [128, 128, 128, 128] });

    expect(metrics.exposure?.meanLuma).toBeCloseTo(128 / 255);
  });

  it('supports explicit byte range for the value 1 boundary', () => {
    const metrics = computeLumaQualityMetrics({ width: 2, height: 2, values: [1, 1, 1, 1] }, { valueRange: 'byte' });

    expect(metrics.exposure?.meanLuma).toBeCloseTo(1 / 255);
    expect(metrics.exposure?.crushedShadowsRatio).toBe(1);
  });

  it('supports explicit unit range for full-white unit samples', () => {
    const metrics = computeLumaQualityMetrics({ width: 2, height: 2, values: [1, 1, 1, 1] }, { valueRange: 'unit' });

    expect(metrics.exposure?.meanLuma).toBe(1);
    expect(metrics.exposure?.clippedHighlightsRatio).toBe(1);
  });

  it('rejects malformed grids', () => {
    expect(() => computeLumaQualityMetrics({ width: 3, height: 3, values: [0.5] })).toThrow(/value count/);
  });

  it('builds a compact native-analysis compatible quality result', () => {
    const result = buildLumaQualityAnalysis({ width: 4, height: 4, values: repeat(0.52, 16) }, { createdAtMs: 42 });

    expect(result.status).toBe('low-confidence');
    expect(result.createdAtMs).toBe(42);
    expect(result.subject).toBeNull();
    expect(result.exposure?.exposureScore).toBeGreaterThanOrEqual(99);
    expect(result.sharpness?.sharpnessScore).toBe(0);
  });
});
