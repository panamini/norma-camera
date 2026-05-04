import { describe, expect, it } from 'vitest';
import { DEFAULT_AUTO_CAPTURE_CONFIG, decideAutoCapture } from '../../autocapture/decideAutoCapture';
import type { FrameQuality } from '../../autocapture/types';
import type { NativeFrameAnalysisResult } from '../nativeHeuristicTypes';
import { NATIVE_CANDIDATE_CONFIDENCE_MIN, adaptNativeFrameAnalysisToCandidate, nativeFrameAnalysisHasRealQuality } from '../nativeHeuristicAdapter';
import { scoreNativeFrameAnalysis } from '../scoreNativeFrameAnalysis';
import { selectCompositionCandidate } from '../selectCompositionCandidate';

const goodQuality: FrameQuality = {
  sharpnessScore: 80,
  exposureScore: 75,
  motionScore: 10,
  sceneChangedScore: 100
};

function makeNativeAnalysis(overrides: Partial<NativeFrameAnalysisResult> = {}): NativeFrameAnalysisResult {
  return {
    status: 'ready',
    createdAtMs: 2_000,
    subject: {
      source: 'native-heuristic',
      center: { x: 1 / 3, y: 1 / 2 },
      bounds: { x: 0.24, y: 0.38, width: 0.18, height: 0.24 },
      confidence: 0.72
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
    explanation: 'Real luminance analysis. Real contrast candidate. No semantic object detection yet.',
    ...overrides
  };
}

describe('native visual-mass candidate adapter', () => {
  it('native unavailable returns no candidate', () => {
    const result = selectCompositionCandidate({ nowMs: 1_000, autoMode: 'native-heuristic', nativeFrameAnalysis: null });

    expect(result.candidate).toBeNull();
    expect(result.modeLabel).toBe('NATIVE VISUAL MASS · unavailable');
    expect(result.explanation).toContain('unavailable');
  });

  it('native error returns no candidate', () => {
    const result = selectCompositionCandidate({
      nowMs: 1_000,
      autoMode: 'native-heuristic',
      nativeFrameAnalysis: makeNativeAnalysis({ status: 'error', subject: null, exposure: null, sharpness: null, explanation: 'native failure' })
    });

    expect(result.candidate).toBeNull();
    expect(result.modeLabel).toBe('NATIVE VISUAL MASS · error');
    expect(result.explanation).toBe('native failure');
  });

  it('native low confidence returns no candidate', () => {
    const result = selectCompositionCandidate({
      nowMs: 1_000,
      autoMode: 'native-heuristic',
      nativeFrameAnalysis: makeNativeAnalysis({ status: 'low-confidence', subject: null, explanation: 'no strong contrast candidate' })
    });

    expect(result.candidate).toBeNull();
    expect(result.modeLabel).toBe('NATIVE VISUAL MASS · no strong candidate');
    expect(result.explanation).toContain('no strong contrast candidate');
  });

  it('native confidence below threshold rejects candidate', () => {
    const analysis = makeNativeAnalysis({
      subject: {
        source: 'native-heuristic',
        center: { x: 1 / 3, y: 1 / 2 },
        bounds: { x: 0.24, y: 0.38, width: 0.18, height: 0.24 },
        confidence: NATIVE_CANDIDATE_CONFIDENCE_MIN - 0.01
      }
    });
    const adapted = adaptNativeFrameAnalysisToCandidate({ analysis, nowMs: 3_000 });

    expect(adapted.candidate).toBeNull();
    expect(adapted.modeLabel).toBe('NATIVE VISUAL MASS · no strong candidate');
    expect(adapted.qualityIsReal).toBe(true);
  });

  it('native ready maps to CompositionCandidate', () => {
    const result = selectCompositionCandidate({ nowMs: 3_000, autoMode: 'native-heuristic', nativeFrameAnalysis: makeNativeAnalysis() });

    expect(result.candidate?.source).toBe('native-heuristic');
    expect(result.candidate?.label).toBe('native visual mass');
    expect(result.candidate?.center.x).toBeCloseTo(1 / 3);
    expect(result.candidate?.confidence).toBeCloseTo(0.72);
    expect(result.modeLabel).toBe('NATIVE VISUAL MASS');
  });

  it('native ready with exposure and sharpness marks quality as real', () => {
    expect(nativeFrameAnalysisHasRealQuality(makeNativeAnalysis())).toBe(true);
    expect(nativeFrameAnalysisHasRealQuality(makeNativeAnalysis({ sharpness: null }))).toBe(false);
  });

  it('native visual-mass center on left third scores high', () => {
    const scored = scoreNativeFrameAnalysis(makeNativeAnalysis(), ['third'], 3_000);

    expect(scored.source).toBe('native-heuristic');
    expect(scored.composition.score).toBeGreaterThanOrEqual(DEFAULT_AUTO_CAPTURE_CONFIG.compositionThreshold);
    expect(scored.composition.label).toBe('SUBJECT ON LEFT THIRD');
  });

  it('manual tap overrides native candidate', () => {
    const result = selectCompositionCandidate({
      nowMs: 3_000,
      autoMode: 'native-heuristic',
      manualSubject: { x: 0.8, y: 0.2 },
      nativeFrameAnalysis: makeNativeAnalysis()
    });

    expect(result.candidate?.source).toBe('manual');
    expect(result.candidate?.center).toEqual({ x: 0.8, y: 0.2 });
    expect(result.modeLabel).toBe('NATIVE VISUAL MASS · manual fallback');
  });

  it('native candidate below composition threshold does not capture', () => {
    const analysis = makeNativeAnalysis({
      subject: {
        source: 'native-heuristic',
        center: { x: 0.12, y: 0.15 },
        bounds: { x: 0.08, y: 0.08, width: 0.12, height: 0.16 },
        confidence: 0.72
      }
    });
    const scored = scoreNativeFrameAnalysis(analysis, ['third'], 3_000);
    const decision = decideAutoCapture({
      nowMs: 10_000,
      armed: true,
      compositionScore: scored.composition.score,
      quality: goodQuality,
      lastCaptureAtMs: null,
      stableSinceMs: null
    });

    expect(scored.composition.score).toBeLessThan(DEFAULT_AUTO_CAPTURE_CONFIG.compositionThreshold);
    expect(decision.kind).toBe('idle');
    expect(decision.reason).toBe('composition below threshold');
  });

  it('native high confidence and high score can enter candidate state', () => {
    const scored = scoreNativeFrameAnalysis(makeNativeAnalysis(), ['third'], 3_000);
    const decision = decideAutoCapture({
      nowMs: 10_000,
      armed: true,
      compositionScore: scored.composition.score,
      quality: goodQuality,
      lastCaptureAtMs: null,
      stableSinceMs: null
    });

    expect(scored.candidate?.source).toBe('native-heuristic');
    expect(decision.kind).toBe('candidate');
  });

  it('native high confidence and stable high score can capture', () => {
    const scored = scoreNativeFrameAnalysis(makeNativeAnalysis(), ['third'], 3_000);
    const decision = decideAutoCapture({
      nowMs: 11_000,
      armed: true,
      compositionScore: scored.composition.score,
      quality: goodQuality,
      lastCaptureAtMs: null,
      stableSinceMs: 10_000
    });

    expect(decision.kind).toBe('capture');
  });
});
