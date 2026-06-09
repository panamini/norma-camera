import { describe, expect, it } from 'vitest';
import { makeNativeAnalysisDebugLine, normalizeNativeAnalysisFreshness, STALE_NATIVE_ANALYSIS_MS } from '../nativeHeuristicDebug';
import type { NativeFrameAnalysisResult } from '../nativeHeuristicTypes';

function makeLiveAnalysis(overrides: Partial<NativeFrameAnalysisResult> = {}): NativeFrameAnalysisResult {
  return {
    status: 'low-confidence',
    createdAtMs: 10_000,
    subject: null,
    exposure: {
      exposureScore: 82,
      meanLuma: 0.61,
      clippedHighlightsRatio: 0.01,
      crushedShadowsRatio: 0.02
    },
    sharpness: {
      sharpnessScore: 44,
      edgeEnergy: 0.1042
    },
    explanation: 'Real live Android luminance metrics from VisionCamera frames are available.',
    analysisSource: 'live-frame',
    updateCount: 3,
    analysisFps: 4.2,
    ...overrides
  };
}

function makeAnalyzerUnavailableAnalysis(): NativeFrameAnalysisResult {
  return {
    status: 'unavailable',
    createdAtMs: 10_000,
    subject: null,
    exposure: null,
    sharpness: null,
    explanation: 'Native analyzer unavailable: frame is not a NativeFrame.',
    analysisSource: 'analyzer-unavailable'
  };
}

describe('native live frame debug formatting', () => {
  it('formats live meanLuma and edgeEnergy with source, status, age, and updates', () => {
    const line = makeNativeAnalysisDebugLine(makeLiveAnalysis(), true, 10_250);

    expect(line).toContain('analysis source: live frame');
    expect(line).toContain('status low-confidence');
    expect(line).toContain('age 250 ms');
    expect(line).toContain('updates 3');
    expect(line).toContain('meanLuma 0.610');
    expect(line).toContain('edgeEnergy 0.1042');
  });

  it('marks stale live analysis unavailable and hides stale metrics', () => {
    const stale = normalizeNativeAnalysisFreshness(makeLiveAnalysis(), 10_000 + STALE_NATIVE_ANALYSIS_MS + 1);

    expect(stale?.status).toBe('unavailable');
    expect(stale?.analysisSource).toBe('stale-live-frame');
    expect(stale?.exposure).toBeNull();
    expect(stale?.sharpness).toBeNull();

    const line = makeNativeAnalysisDebugLine(stale, true, 10_000 + STALE_NATIVE_ANALYSIS_MS + 1);
    expect(line).toContain('analysis source: stale live frame');
    expect(line).toContain('meanLuma n/a');
    expect(line).toContain('edgeEnergy n/a');
  });

  it('formats analyzer unavailable state with n/a metrics', () => {
    const line = makeNativeAnalysisDebugLine(makeAnalyzerUnavailableAnalysis(), true, 10_250);

    expect(line).toContain('analysis source: analyzer unavailable');
    expect(line).toContain('status unavailable');
    expect(line).toContain('age 250 ms');
    expect(line).toContain('updates n/a');
    expect(line).toContain('meanLuma n/a');
    expect(line).toContain('edgeEnergy n/a');
  });

  it('keeps bridge inactive state honest when analyzer is unavailable', () => {
    expect(makeNativeAnalysisDebugLine(null, false, 10_000)).toBeNull();
    expect(makeNativeAnalysisDebugLine(null, true, 10_000)).toBe('analysis source: bridge inactive · status unavailable · age n/a · updates n/a · meanLuma n/a · edgeEnergy n/a');
  });
});
