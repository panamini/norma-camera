import { describe, expect, it } from 'vitest';
import { DEFAULT_AUTO_CAPTURE_CONFIG, decideAutoCapture } from '../../autocapture/decideAutoCapture';
import type { FrameQuality } from '../../autocapture/types';
import { scoreDetectedComposition } from '../scoreDetectedComposition';
import { selectCompositionCandidate } from '../selectCompositionCandidate';

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
