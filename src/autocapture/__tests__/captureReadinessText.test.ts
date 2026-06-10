import { describe, expect, it } from 'vitest';
import type { AutoCaptureDecision, CaptureReadinessCalibrationInput, FrameQuality } from '../types';
import { captureReadinessLine, captureReadinessNoCandidateLine } from '../captureReadinessText';

const forbiddenSemanticWords = /object detected|person detected|face detected|AI detected|recognized subject|semantic detection/i;
const goodQuality: FrameQuality = {
  sharpnessScore: 80,
  exposureScore: 75,
  motionScore: 10,
  sceneChangedScore: 100
};
const holdDecision: AutoCaptureDecision = {
  kind: 'candidate',
  reason: 'waiting for stability',
  stableForMs: 500,
  nextStableSinceMs: 1_000
};
const readyDecision: AutoCaptureDecision = {
  kind: 'capture',
  reason: 'stable gates passed',
  nextStableSinceMs: null
};

function makeReadinessInput(overrides: Partial<CaptureReadinessCalibrationInput> = {}): CaptureReadinessCalibrationInput {
  return {
    nowMs: 2_000,
    armed: true,
    detectionMode: 'native-heuristic',
    modeLabel: 'NATIVE VISUAL MASS · active',
    hasCandidate: true,
    compositionScore: 88,
    compositionThreshold: 82,
    quality: goodQuality,
    sharpnessThreshold: 55,
    exposureThreshold: 50,
    candidateConfidence: 0.7,
    lineContribution: 0,
    decision: holdDecision,
    nativeAnalysis: {
      status: 'ready',
      createdAtMs: 1_900,
      subject: {
        center: { x: 0.33, y: 0.5 },
        bounds: { x: 0.25, y: 0.4, width: 0.2, height: 0.2 },
        confidence: 0.7,
        source: 'native-heuristic'
      },
      exposure: { exposureScore: 75, meanLuma: 0.45, clippedHighlightsRatio: 0, crushedShadowsRatio: 0 },
      sharpness: { sharpnessScore: 80, edgeEnergy: 0.2 },
      explanation: 'Real luminance analysis.',
      analysisSource: 'live-frame'
    },
    ...overrides
  };
}

describe('capture readiness no-candidate copy', () => {
  it('keeps non-native modes generic', () => {
    expect(captureReadinessNoCandidateLine({ detectionMode: 'manual', modeLabel: 'MANUAL V0' })).toBe('ARMED · no subject');
    expect(captureReadinessNoCandidateLine({ detectionMode: 'auto-placeholder', modeLabel: 'AUTO V0.2 · PLACEHOLDER' })).toBe('ARMED · no subject');
    expect(captureReadinessNoCandidateLine({ detectionMode: 'simulated-detector', modeLabel: 'SIMULATED DETECTOR' })).toBe('ARMED · no subject');
  });

  it('explains missing native candidate without semantic wording', () => {
    const line = captureReadinessNoCandidateLine({ detectionMode: 'native-heuristic', modeLabel: 'NATIVE VISUAL MASS · no strong native candidate' });

    expect(line).toBe('ARMED · no subject · no strong native candidate');
    expect(line).not.toMatch(forbiddenSemanticWords);
  });

  it('keeps held native visual mass distinct from active capture readiness', () => {
    const line = captureReadinessNoCandidateLine({ detectionMode: 'native-heuristic', modeLabel: 'NATIVE VISUAL MASS · held briefly' });

    expect(line).toBe('ARMED · held briefly · wait for active native visual mass');
    expect(line).not.toMatch(forbiddenSemanticWords);
  });

  it('keeps stale live frame distinct from active native candidates', () => {
    const line = captureReadinessNoCandidateLine({ detectionMode: 'native-heuristic', modeLabel: 'NATIVE VISUAL MASS · stale live frame' });

    expect(line).toBe('ARMED · no subject · stale live frame');
    expect(line).not.toMatch(forbiddenSemanticWords);
  });

  it('keeps analyzer unavailable distinct from no strong native candidate', () => {
    const line = captureReadinessNoCandidateLine({ detectionMode: 'native-heuristic', modeLabel: 'NATIVE VISUAL MASS · unavailable' });

    expect(line).toBe('ARMED · no subject · native analyzer unavailable');
    expect(line).not.toMatch(forbiddenSemanticWords);
  });

  it('keeps native error distinct from unavailable', () => {
    const line = captureReadinessNoCandidateLine({ detectionMode: 'native-heuristic', modeLabel: 'NATIVE VISUAL MASS · error' });

    expect(line).toBe('ARMED · no subject · native error');
    expect(line).not.toMatch(forbiddenSemanticWords);
  });
});

describe('capture readiness calibration copy', () => {
  it('keeps ARM off explicit', () => {
    expect(captureReadinessLine(makeReadinessInput({ armed: false }))).toBe('ARM OFF · auto-capture disabled');
  });

  it('uses no-candidate copy when no candidate exists', () => {
    expect(captureReadinessLine(makeReadinessInput({ hasCandidate: false, modeLabel: 'NATIVE VISUAL MASS · held briefly' }))).toBe(
      'ARMED · held briefly · wait for active native visual mass'
    );
  });

  it('does not treat line signal as readiness without visual mass', () => {
    expect(captureReadinessLine(makeReadinessInput({ hasCandidate: false, lineContribution: 8, modeLabel: 'NATIVE VISUAL MASS · no strong native candidate' }))).toBe(
      'ARMED · no subject · no strong native candidate'
    );
  });

  it('waits for fresh native analysis before recommending readiness', () => {
    const line = captureReadinessLine(makeReadinessInput({ nowMs: 4_000 }));

    expect(line).toBe('ARMED · waiting for fresh analysis');
    expect(line).not.toMatch(forbiddenSemanticWords);
  });

  it('blocks readiness when exposure is low even with high composition', () => {
    const line = captureReadinessLine(makeReadinessInput({ quality: { ...goodQuality, exposureScore: 20 }, decision: readyDecision }));

    expect(line).toBe('ARMED · too dark · exposure blocked');
  });

  it('blocks readiness when sharpness is low even with high composition', () => {
    const line = captureReadinessLine(makeReadinessInput({ quality: { ...goodQuality, sharpnessScore: 20 }, decision: readyDecision }));

    expect(line).toBe('ARMED · too blurry · sharpness blocked');
  });

  it('asks for stronger visual mass confidence conservatively', () => {
    const line = captureReadinessLine(makeReadinessInput({ candidateConfidence: 0.24, decision: readyDecision }));

    expect(line).toBe('ARMED · need stronger visual mass confidence');
  });

  it('keeps composition below threshold as an adjustment, not ready', () => {
    expect(captureReadinessLine(makeReadinessInput({ compositionScore: 68 }))).toBe('ARMED · adjust composition · score 68 / 82');
  });

  it('uses hold steady while stability is still accumulating', () => {
    expect(captureReadinessLine(makeReadinessInput())).toBe('ARMED · hold steady');
  });

  it('keeps manual mode readiness based on the existing gates', () => {
    expect(
      captureReadinessLine(
        makeReadinessInput({
          detectionMode: 'manual',
          modeLabel: 'MANUAL V0',
          candidateConfidence: 1,
          nativeAnalysis: null
        })
      )
    ).toBe('ARMED · hold steady');
  });

  it('mentions line signal only as a secondary readiness detail', () => {
    expect(captureReadinessLine(makeReadinessInput({ lineContribution: 8 }))).toBe('ARMED · hold steady · line signal +8');
  });

  it('reports ready only after gates pass', () => {
    expect(captureReadinessLine(makeReadinessInput({ decision: readyDecision }))).toBe('ARMED · ready');
  });

  it('keeps ready text compact when line signal is absent', () => {
    expect(captureReadinessLine(makeReadinessInput({ decision: readyDecision, lineContribution: 0 }))).toBe('ARMED · ready');
  });

  it('does not use forbidden semantic wording', () => {
    const lines = [
      captureReadinessLine(makeReadinessInput()),
      captureReadinessLine(makeReadinessInput({ decision: readyDecision })),
      captureReadinessLine(makeReadinessInput({ candidateConfidence: 0.24 })),
      captureReadinessLine(makeReadinessInput({ quality: { ...goodQuality, exposureScore: 20 } }))
    ];

    expect(lines.join('\n')).not.toMatch(forbiddenSemanticWords);
  });
});
