import { describe, expect, it } from 'vitest';
import { DEFAULT_AUTO_CAPTURE_CONFIG, decideAutoCapture } from '../../autocapture/decideAutoCapture';
import type { FrameQuality } from '../../autocapture/types';
import { scoreDetectedComposition } from '../scoreDetectedComposition';
import { selectCompositionCandidate } from '../selectCompositionCandidate';
import type { NativeLineCandidate } from '../nativeHeuristicTypes';
import type { CompositionCandidate } from '../types';

function makeCandidate(overrides: Partial<CompositionCandidate> = {}): CompositionCandidate {
  return {
    id: 'test-candidate',
    source: 'native-heuristic',
    label: 'native visual mass',
    center: { x: 0.39, y: 0.1 },
    confidence: 0.7,
    createdAtMs: 1_000,
    ...overrides
  };
}

function makeHorizontalLine(overrides: Partial<NativeLineCandidate> = {}): NativeLineCandidate {
  return {
    x1: 0,
    y1: 1 / 3,
    x2: 1,
    y2: 1 / 3,
    angleDeg: 0,
    confidence: 0.7,
    kind: 'horizontal-line',
    ...overrides
  };
}

const goodQuality: FrameQuality = {
  sharpnessScore: 80,
  exposureScore: 75,
  motionScore: 10,
  sceneChangedScore: 100
};

describe('scoreDetectedComposition', () => {
  it('candidate scoring reaches high score when placeholder is on left third', () => {
    const selection = selectCompositionCandidate({ nowMs: 1_000, autoMode: 'auto-placeholder', manualSubject: null });
    const scored = scoreDetectedComposition(selection.candidate, ['third'], selection.explanation);

    expect(scored.source).toBe('heuristic-placeholder');
    expect(scored.composition.score).toBeGreaterThanOrEqual(DEFAULT_AUTO_CAPTURE_CONFIG.compositionThreshold);
    expect(scored.composition.label).toBe('SUBJECT ON LEFT THIRD');
  });

  it('adds a horizontal line as a secondary contribution when a candidate exists', () => {
    const scored = scoreDetectedComposition(makeCandidate(), ['third'], undefined, makeHorizontalLine());

    expect(scored.lineGuideScore.hasLine).toBe(true);
    expect(scored.composition.baseGuideScore).toBe(53);
    expect(scored.composition.lineAlignmentScore).toBe(100);
    expect(scored.composition.lineContribution).toBe(8);
    expect(scored.composition.score).toBe(61);
  });

  it('does not score a horizontal line without a subject candidate', () => {
    const scored = scoreDetectedComposition(null, ['third'], undefined, makeHorizontalLine());

    expect(scored.lineGuideScore.hasLine).toBe(true);
    expect(scored.composition.score).toBe(0);
    expect(scored.composition.lineAlignmentScore).toBeNull();
    expect(scored.composition.lineContribution).toBe(0);
  });

  it('ARM can become candidate then capture using automatic placeholder candidate', () => {
    const selection = selectCompositionCandidate({ nowMs: 1_000, autoMode: 'auto-placeholder', manualSubject: null });
    const scored = scoreDetectedComposition(selection.candidate, ['third'], selection.explanation);

    const candidateDecision = decideAutoCapture({
      nowMs: 10_000,
      armed: true,
      compositionScore: scored.composition.score,
      quality: goodQuality,
      lastCaptureAtMs: null,
      stableSinceMs: null
    });

    expect(candidateDecision.kind).toBe('candidate');

    const captureDecision = decideAutoCapture({
      nowMs: 11_000,
      armed: true,
      compositionScore: scored.composition.score,
      quality: goodQuality,
      lastCaptureAtMs: null,
      stableSinceMs: candidateDecision.nextStableSinceMs
    });

    expect(captureDecision.kind).toBe('capture');
  });
});
