import { describe, expect, it } from 'vitest';
import { makeNativeAnalysisDebugLine, nativeVisualMassStateForAnalysis, normalizeNativeAnalysisFreshness, STALE_NATIVE_ANALYSIS_MS } from '../nativeHeuristicDebug';
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
  it('formats live metrics and no-candidate state distinctly from guide score', () => {
    const line = makeNativeAnalysisDebugLine(makeLiveAnalysis(), true, 10_250);

    expect(line).toContain('source live frame');
    expect(line).toContain('live frame age 250 ms');
    expect(line).toContain('updates 3');
    expect(line).toContain('meanLuma 0.610');
    expect(line).toContain('edgeEnergy 0.1042');
    expect(line).toContain('native visual mass: no strong native candidate');
    expect(line).toContain('visual confidence n/a');
    expect(line).toContain('guide score n/a');
  });

  it('formats active native visual confidence separately from guide score', () => {
    const line = makeNativeAnalysisDebugLine(
      makeLiveAnalysis({
        subject: {
          source: 'native-heuristic',
          center: { x: 0.4, y: 0.5 },
          bounds: { x: 0.3, y: 0.4, width: 0.2, height: 0.2 },
          confidence: 0.42
        }
      }),
      true,
      10_120,
      68
    );

    expect(line).toContain('source live frame');
    expect(line).toContain('live frame age 120 ms');
    expect(line).toContain('native visual mass: active');
    expect(line).toContain('visual confidence 42%');
    expect(line).toContain('guide score 68');
  });

  it('labels retained native visual mass as held briefly', () => {
    const analysis = makeLiveAnalysis({
      subject: {
        source: 'native-heuristic',
        center: { x: 0.4, y: 0.5 },
        bounds: { x: 0.3, y: 0.4, width: 0.2, height: 0.2 },
        confidence: 0.16
      }
    });

    expect(nativeVisualMassStateForAnalysis(analysis)).toBe('held briefly');
    expect(makeNativeAnalysisDebugLine(analysis, true, 10_120, 61)).toContain('native visual mass: held briefly');
  });

  it('marks stale live analysis unavailable and hides stale metrics', () => {
    const stale = normalizeNativeAnalysisFreshness(makeLiveAnalysis(), 10_000 + STALE_NATIVE_ANALYSIS_MS + 1);

    expect(stale?.status).toBe('unavailable');
    expect(stale?.analysisSource).toBe('stale-live-frame');
    expect(stale?.exposure).toBeNull();
    expect(stale?.sharpness).toBeNull();

    const line = makeNativeAnalysisDebugLine(stale, true, 10_000 + STALE_NATIVE_ANALYSIS_MS + 1);
    expect(line).toContain('source stale live frame');
    expect(line).toContain('native visual mass: stale live frame');
    expect(line).toContain('meanLuma n/a');
    expect(line).toContain('edgeEnergy n/a');
    expect(line).toContain('visual confidence n/a');
    expect(line).toContain('guide score n/a');
  });

  it('formats analyzer unavailable state with n/a metrics', () => {
    const line = makeNativeAnalysisDebugLine(makeAnalyzerUnavailableAnalysis(), true, 10_250);

    expect(line).toContain('source analyzer unavailable');
    expect(line).toContain('live frame age 250 ms');
    expect(line).toContain('updates n/a');
    expect(line).toContain('meanLuma n/a');
    expect(line).toContain('edgeEnergy n/a');
    expect(line).toContain('native visual mass: unavailable');
  });

  it('keeps bridge inactive state honest when analyzer is unavailable', () => {
    expect(makeNativeAnalysisDebugLine(null, false, 10_000)).toBeNull();
    const line = makeNativeAnalysisDebugLine(null, true, 10_000);
    expect(line).toContain('source bridge inactive');
    expect(line).toContain('live frame age n/a');
    expect(line).toContain('native visual mass: unavailable');
    expect(line).toContain('visual confidence n/a');
    expect(line).toContain('guide score n/a');
  });
});
