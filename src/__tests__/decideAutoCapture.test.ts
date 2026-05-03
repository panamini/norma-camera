import { describe, expect, it } from 'vitest';
import { decideAutoCapture } from '../autocapture/decideAutoCapture';
import type { AutoCaptureInput, FrameQuality } from '../autocapture/types';

const goodQuality: FrameQuality = {
  sharpnessScore: 80,
  exposureScore: 75,
  motionScore: 10,
  sceneChangedScore: 100
};

function makeInput(overrides: Partial<AutoCaptureInput> = {}): AutoCaptureInput {
  return {
    nowMs: 10_000,
    armed: true,
    compositionScore: 90,
    quality: goodQuality,
    lastCaptureAtMs: null,
    stableSinceMs: 9_000,
    ...overrides
  };
}

describe('decideAutoCapture', () => {
  it('low composition score does not auto-capture', () => {
    const decision = decideAutoCapture(makeInput({ compositionScore: 30 }));

    expect(decision.kind).toBe('idle');
    expect(decision.nextStableSinceMs).toBeNull();
  });

  it('not armed does not auto-capture', () => {
    const decision = decideAutoCapture(makeInput({ armed: false }));

    expect(decision.kind).toBe('idle');
    expect(decision.reason).toBe('not armed');
  });

  it('blurry quality does not auto-capture', () => {
    const decision = decideAutoCapture(makeInput({ quality: { ...goodQuality, sharpnessScore: 20 } }));

    expect(decision.kind).toBe('idle');
    expect(decision.reason).toBe('sharpness below threshold');
  });

  it('high motion does not auto-capture', () => {
    const decision = decideAutoCapture(makeInput({ quality: { ...goodQuality, motionScore: 80 } }));

    expect(decision.kind).toBe('idle');
    expect(decision.reason).toBe('motion too high');
  });

  it('stable high score returns candidate before stable duration', () => {
    const decision = decideAutoCapture(makeInput({ nowMs: 10_500, stableSinceMs: 10_000 }));

    expect(decision.kind).toBe('candidate');
    if (decision.kind === 'candidate') {
      expect(decision.stableForMs).toBe(500);
      expect(decision.nextStableSinceMs).toBe(10_000);
    }
  });

  it('stable high score returns capture after stable duration', () => {
    const decision = decideAutoCapture(makeInput({ nowMs: 11_000, stableSinceMs: 10_000 }));

    expect(decision.kind).toBe('capture');
  });

  it('cooldown prevents repeated capture', () => {
    const decision = decideAutoCapture(makeInput({ nowMs: 13_000, lastCaptureAtMs: 10_000, stableSinceMs: 12_000 }));

    expect(decision.kind).toBe('idle');
    expect(decision.reason).toBe('cooldown active');
  });

  it('after capture, stability resets', () => {
    const decision = decideAutoCapture(makeInput({ nowMs: 11_000, stableSinceMs: 10_000 }));

    expect(decision.kind).toBe('capture');
    expect(decision.nextStableSinceMs).toBeNull();
  });
});
