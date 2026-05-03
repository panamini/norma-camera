import { describe, expect, it } from 'vitest';
import { DEFAULT_AUTO_CAPTURE_CONFIG, decideAutoCapture } from '../../autocapture/decideAutoCapture';
import type { FrameQuality } from '../../autocapture/types';
import type { NativeFrameAnalysisResult } from '../nativeHeuristicTypes';
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
    explanation: 'Real luminance analysis. No semantic object detection yet.',
    ...overrides
  };
}

describe('native heuristic candidate adapter', () => {
  it('native heuristic unavailable returns no candidate', () => {
    const result = selectCompositionCandidate({ nowMs: 1_000, autoMode: 'native-heuristic', nativeFrameAnalysis: null });

    expect(result.candidate).toBeNull();
    expect(result.modeLabel).toBe('NATIVE HEURISTIC · UNAVAILABLE');
    expect(result.explanation).toContain('unavailable');
  });

  it('native candidate maps to composition candidate', () => {
    const result = selectCompositionCandidate({ nowMs: 3_000, autoMode: 'native-heuristic', nativeFrameAnalysis: makeNativeAnalysis() });

    expect(result.candidate?.source).toBe('native-heuristic');
    expect(result.candidate?.label).toBe('native heuristic subject');
    expect(result.candidate?.center.x).toBeCloseTo(1 / 3);
    expect(result.candidate?.confidence).toBeCloseTo(0.72);
  });

  it('native candidate center on left third scores high', () => {
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
  });

  it('native low confidence does not auto-capture', () => {
    const analysis = makeNativeAnalysis({
      status: 'low-confidence',
      subject: {
        source: 'native-heuristic',
        center: { x: 1 / 3, y: 1 / 2 },
        bounds: { x: 0.24, y: 0.38, width: 0.18, height: 0.24 },
        confidence: 0.1
      }
    });
    const scored = scoreNativeFrameAnalysis(analysis, ['third'], 3_000);
    const decision = decideAutoCapture({
      nowMs: 10_000,
      armed: true,
      compositionScore: scored.candidate ? scored.composition.score : 0,
      quality: goodQuality,
      lastCaptureAtMs: null,
      stableSinceMs: null
    });

    expect(scored.candidate).toBeNull();
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
});
