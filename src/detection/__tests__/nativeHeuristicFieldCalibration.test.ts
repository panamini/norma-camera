import { describe, expect, it } from 'vitest';
import { decideAutoCapture } from '../../autocapture/decideAutoCapture';
import { captureReadinessNoCandidateLine } from '../../autocapture/captureReadinessText';
import type { FrameQuality } from '../../autocapture/types';
import {
  NATIVE_ACTIVE_CANDIDATE_CONFIDENCE_MIN,
  NATIVE_CANDIDATE_CONFIDENCE_MIN,
  adaptNativeFrameAnalysisToCandidate
} from '../nativeHeuristicAdapter';
import type { NativeFrameAnalysisResult } from '../nativeHeuristicTypes';
import { scoreNativeFrameAnalysis } from '../scoreNativeFrameAnalysis';

const goodQuality: FrameQuality = {
  sharpnessScore: 80,
  exposureScore: 75,
  motionScore: 10,
  sceneChangedScore: 100
};

function makeNativeAnalysis(confidence: number): NativeFrameAnalysisResult {
  return {
    status: 'ready',
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
    explanation: 'Real luminance analysis. Real contrast candidate. No recognition is used.',
    analysisSource: 'live-frame'
  };
}

describe('native visual-mass field calibration guardrail', () => {
  it('keeps held native visual mass as readout-only, not an admitted candidate', () => {
    const heldConfidence = (NATIVE_CANDIDATE_CONFIDENCE_MIN + NATIVE_ACTIVE_CANDIDATE_CONFIDENCE_MIN) / 2;
    const adapted = adaptNativeFrameAnalysisToCandidate({ analysis: makeNativeAnalysis(heldConfidence), nowMs: 2_050 });

    expect(adapted.candidate).toBeNull();
    expect(adapted.modeLabel).toBe('NATIVE VISUAL MASS · held briefly');
    expect(adapted.qualityIsReal).toBe(true);
  });

  it('prevents held native visual mass from entering auto-capture stability', () => {
    const heldConfidence = (NATIVE_CANDIDATE_CONFIDENCE_MIN + NATIVE_ACTIVE_CANDIDATE_CONFIDENCE_MIN) / 2;
    const scored = scoreNativeFrameAnalysis(makeNativeAnalysis(heldConfidence), ['third'], 2_050);
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

  it('keeps active native visual mass eligible when confidence is sufficient', () => {
    const scored = scoreNativeFrameAnalysis(makeNativeAnalysis(NATIVE_ACTIVE_CANDIDATE_CONFIDENCE_MIN), ['third'], 2_050);
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

  it('uses held readiness copy without semantic labels', () => {
    const line = captureReadinessNoCandidateLine({ detectionMode: 'native-heuristic', modeLabel: 'NATIVE VISUAL MASS · held briefly' });

    expect(line).toBe('ARMED · held briefly · wait for active native visual mass');
    expect(line).not.toMatch(/object detected|person detected|face detected|AI detected|recognized subject|semantic detection/i);
  });
});
