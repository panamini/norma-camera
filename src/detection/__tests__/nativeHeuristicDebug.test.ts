import { describe, expect, it } from 'vitest';
import { mapNativeEvidenceToPreview } from '../nativeEvidenceCoordinateMapping';
import { makeNativeAnalysisDebugLine, nativeVisualMassStateForAnalysis, normalizeNativeAnalysisFreshness, STALE_NATIVE_ANALYSIS_MS } from '../nativeHeuristicDebug';
import type { NativeFrameAnalysisResult } from '../nativeHeuristicTypes';

function makeLiveAnalysis(overrides: Partial<NativeFrameAnalysisResult> = {}): NativeFrameAnalysisResult {
  return {
    status: 'low-confidence',
    createdAtMs: 10_000,
    subject: null,
    lineCandidate: null,
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
    lineCandidate: null,
    exposure: null,
    sharpness: null,
    explanation: 'Native analyzer unavailable: frame is not a NativeFrame.',
    analysisSource: 'analyzer-unavailable'
  };
}

function expectNoForbiddenSemanticLabels(value: string | null): void {
  expect(value ?? '').not.toMatch(/horizon detected|object detected|person detected|face detected|AI detected|scene understood|semantic detection/i);
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
    expect(line).toContain('horizontal line: no strong line candidate');
    expect(line).toContain('line guide score n/a');
    expectNoForbiddenSemanticLabels(line);
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
    expect(line).toContain('line guide score n/a');
    expectNoForbiddenSemanticLabels(line);
  });

  it('formats horizontal line signal and line guide score without semantic wording', () => {
    const line = makeNativeAnalysisDebugLine(
      makeLiveAnalysis({
        lineCandidate: {
          x1: 0,
          y1: 0.335,
          x2: 1,
          y2: 0.345,
          angleDeg: 0,
          confidence: 0.51,
          kind: 'horizontal-line'
        }
      }),
      true,
      10_120,
      68
    );

    expect(line).toContain('horizontal line: y 0.34 · confidence 51% · secondary composition signal');
    expect(line).toContain('line guide score 94 / 100 · nearest upper third · distance 0.007 · secondary composition signal');
    expectNoForbiddenSemanticLabels(line);
  });

  it('formats native evidence geometry and raw plus mapped debug values', () => {
    const analysis = makeLiveAnalysis({
      frameWidth: 400,
      frameHeight: 300,
      gridWidth: 32,
      gridHeight: 24,
      frameOrientation: 'right',
      isMirrored: false,
      subject: {
        source: 'native-heuristic',
        center: { x: 0.2, y: 0.25 },
        bounds: { x: 0.1, y: 0.2, width: 0.3, height: 0.4 },
        confidence: 0.7
      },
      lineCandidate: {
        x1: 0,
        y1: 0.3,
        x2: 1,
        y2: 0.3,
        angleDeg: 0,
        confidence: 0.7,
        kind: 'horizontal-line'
      }
    });

    const line = makeNativeAnalysisDebugLine(
      analysis,
      true,
      10_120,
      68,
      undefined,
      undefined,
      mapNativeEvidenceToPreview(analysis, { width: 300, height: 400, resizeMode: 'cover' })
    );

    expect(line).toContain('frame 400x300 · grid 32x24 · preview 300x400');
    expect(line).toContain('orientation right · mirror false · resize cover');
    expect(line).toContain('presented 300x400 · scale 1.000 · crop x 0.0 y 0.0');
    expect(line).toContain('line raw x1=0.000 y1=0.300 x2=1.000 y2=0.300');
    expect(line).toContain('line mapped x1=0.300 y1=1.000 x2=0.300 y2=0.000');
    expect(line).toContain('mass raw center x=0.200 y=0.250 · bounds x=0.100 y=0.200 w=0.300 h=0.400');
    expect(line).toContain('mass mapped center x=0.250 y=0.800 · bounds x=0.200 y=0.600 w=0.400 h=0.300');
    expectNoForbiddenSemanticLabels(line);
  });

  it('clamps horizontal line confidence in the debug readout', () => {
    const line = makeNativeAnalysisDebugLine(
      makeLiveAnalysis({
        lineCandidate: {
          x1: 0,
          y1: 0.5,
          x2: 1,
          y2: 0.5,
          angleDeg: 0,
          confidence: 1.2,
          kind: 'horizontal-line'
        }
      }),
      true,
      10_120
    );

    expect(line).toContain('horizontal line: y 0.50 · confidence 100% · secondary composition signal');
    expect(line).toContain('line guide score 100 / 100 · nearest center · distance 0.000 · secondary composition signal');
    expectNoForbiddenSemanticLabels(line);
  });

  it('scores horizontal line debug output against the active guide kinds', () => {
    const line = makeNativeAnalysisDebugLine(
      makeLiveAnalysis({
        lineCandidate: {
          x1: 0,
          y1: 0.5,
          x2: 1,
          y2: 0.5,
          angleDeg: 0,
          confidence: 0.8,
          kind: 'horizontal-line'
        }
      }),
      true,
      10_120,
      68,
      ['third']
    );

    expect(line).toContain('line guide score 0 / 100 · nearest lower third');
    expect(line).not.toContain('nearest center');
    expectNoForbiddenSemanticLabels(line);
  });

  it('ignores unknown or malformed line candidates in debug readout', () => {
    const line = makeNativeAnalysisDebugLine(
      makeLiveAnalysis({
        lineCandidate: {
          x1: 0,
          y1: 0.4,
          x2: 1,
          y2: 0.4,
          angleDeg: 0,
          confidence: 0.9,
          kind: 'unknown-line'
        }
      }),
      true,
      10_120
    );

    expect(line).toContain('horizontal line: no strong line candidate');
    expect(line).toContain('line guide score n/a');
    expectNoForbiddenSemanticLabels(line);
  });

  it('ignores low-confidence horizontal line candidates in debug readout', () => {
    const line = makeNativeAnalysisDebugLine(
      makeLiveAnalysis({
        lineCandidate: {
          x1: 0,
          y1: 0.5,
          x2: 1,
          y2: 0.5,
          angleDeg: 0,
          confidence: 0.1,
          kind: 'horizontal-line'
        }
      }),
      true,
      10_120
    );

    expect(line).toContain('horizontal line: no strong line candidate');
    expect(line).toContain('line guide score n/a');
    expectNoForbiddenSemanticLabels(line);
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

  it('marks stale live analysis unavailable and hides stale metrics and line signal', () => {
    const stale = normalizeNativeAnalysisFreshness(
      makeLiveAnalysis({
        lineCandidate: {
          x1: 0,
          y1: 0.4,
          x2: 1,
          y2: 0.4,
          angleDeg: 0,
          confidence: 0.7,
          kind: 'horizontal-line'
        }
      }),
      10_000 + STALE_NATIVE_ANALYSIS_MS + 1
    );

    expect(stale?.status).toBe('unavailable');
    expect(stale?.analysisSource).toBe('stale-live-frame');
    expect(stale?.subject).toBeNull();
    expect(stale?.lineCandidate).toBeNull();
    expect(stale?.exposure).toBeNull();
    expect(stale?.sharpness).toBeNull();

    const line = makeNativeAnalysisDebugLine(stale, true, 10_000 + STALE_NATIVE_ANALYSIS_MS + 1);
    expect(line).toContain('source stale live frame');
    expect(line).toContain('native visual mass: stale live frame');
    expect(line).toContain('meanLuma n/a');
    expect(line).toContain('edgeEnergy n/a');
    expect(line).toContain('visual confidence n/a');
    expect(line).toContain('guide score n/a');
    expect(line).toContain('horizontal line: no strong line candidate');
    expect(line).toContain('line guide score n/a');
    expectNoForbiddenSemanticLabels(line);
  });

  it('formats analyzer unavailable state with n/a metrics', () => {
    const line = makeNativeAnalysisDebugLine(makeAnalyzerUnavailableAnalysis(), true, 10_250);

    expect(line).toContain('source analyzer unavailable');
    expect(line).toContain('live frame age 250 ms');
    expect(line).toContain('updates n/a');
    expect(line).toContain('meanLuma n/a');
    expect(line).toContain('edgeEnergy n/a');
    expect(line).toContain('native visual mass: unavailable');
    expect(line).toContain('horizontal line: no strong line candidate');
    expect(line).toContain('line guide score n/a');
    expectNoForbiddenSemanticLabels(line);
  });

  it('keeps bridge inactive state honest when analyzer is unavailable', () => {
    expect(makeNativeAnalysisDebugLine(null, false, 10_000)).toBeNull();
    const line = makeNativeAnalysisDebugLine(null, true, 10_000);
    expect(line).toContain('source bridge inactive');
    expect(line).toContain('live frame age n/a');
    expect(line).toContain('native visual mass: unavailable');
    expect(line).toContain('visual confidence n/a');
    expect(line).toContain('guide score n/a');
    expect(line).toContain('horizontal line: no strong line candidate');
    expect(line).toContain('line guide score n/a');
    expectNoForbiddenSemanticLabels(line);
  });
});
