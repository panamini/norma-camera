import { describe, expect, it } from 'vitest';
import type { NativeFrameAnalysisResult } from '../nativeHeuristicTypes';
import { adaptNativeFrameAnalysisToCandidate } from '../nativeHeuristicAdapter';

function makeAnalysis(status: NativeFrameAnalysisResult['status'], confidence: number): NativeFrameAnalysisResult {
  return {
    status,
    createdAtMs: 2_000,
    subject: {
      source: 'native-heuristic',
      center: { x: 1 / 3, y: 1 / 2 },
      bounds: { x: 0.24, y: 0.38, width: 0.18, height: 0.24 },
      confidence
    },
    exposure: {
      exposureScore: 76,
      meanLuma: 0.52,
      clippedHighlightsRatio: 0.02,
      crushedShadowsRatio: 0.04
    },
    sharpness: {
      sharpnessScore: 74,
      edgeEnergy: 0.31
    },
    explanation: 'Real live Android luminance metrics and a stabilized coarse native visual-mass candidate are available. No recognition is used.'
  };
}

describe('PR2.7 native visual mass adapter', () => {
  it('maps a conservative active native subject when the subject confidence passes activation threshold', () => {
    const result = adaptNativeFrameAnalysisToCandidate({
      analysis: makeAnalysis('low-confidence', 0.72),
      nowMs: 3_000
    });

    expect(result.candidate?.source).toBe('native-heuristic');
    expect(result.candidate?.label).toBe('native visual mass');
    expect(result.candidate?.bounds).toEqual({ x: 0.24, y: 0.38, width: 0.18, height: 0.24 });
    expect(result.candidate?.confidence).toBeCloseTo(0.72);
    expect(result.modeLabel).toBe('NATIVE VISUAL MASS · active');
    expect(result.explanation).toContain('No recognition is used');
  });

  it('maps a stabilized retained native subject above the lower retention threshold as held briefly', () => {
    const result = adaptNativeFrameAnalysisToCandidate({
      analysis: makeAnalysis('low-confidence', 0.16),
      nowMs: 3_000
    });

    expect(result.candidate?.source).toBe('native-heuristic');
    expect(result.candidate?.confidence).toBeCloseTo(0.16);
    expect(result.modeLabel).toBe('NATIVE VISUAL MASS · held briefly');
  });

  it('still rejects a weak conservative native subject below the retention threshold', () => {
    const result = adaptNativeFrameAnalysisToCandidate({
      analysis: makeAnalysis('low-confidence', 0.12),
      nowMs: 3_000
    });

    expect(result.candidate).toBeNull();
    expect(result.modeLabel).toBe('NATIVE VISUAL MASS · no strong native candidate');
  });
});
