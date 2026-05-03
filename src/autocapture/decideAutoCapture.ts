import type { AutoCaptureConfig, AutoCaptureDecision, AutoCaptureInput } from './types';

export const DEFAULT_AUTO_CAPTURE_CONFIG: AutoCaptureConfig = {
  compositionThreshold: 82,
  sharpnessThreshold: 55,
  exposureThreshold: 50,
  motionMax: 30,
  sceneChangedThreshold: 10,
  stableDurationMs: 1000,
  cooldownMs: 7000
};

function idle(reason: string): AutoCaptureDecision {
  return {
    kind: 'idle',
    reason,
    nextStableSinceMs: null
  };
}

export function decideAutoCapture(
  input: AutoCaptureInput,
  config: AutoCaptureConfig = DEFAULT_AUTO_CAPTURE_CONFIG
): AutoCaptureDecision {
  if (!input.armed) {
    return idle('not armed');
  }

  if (input.compositionScore < config.compositionThreshold) {
    return idle('composition below threshold');
  }

  if (input.quality.sharpnessScore < config.sharpnessThreshold) {
    return idle('sharpness below threshold');
  }

  if (input.quality.exposureScore < config.exposureThreshold) {
    return idle('exposure below threshold');
  }

  if (input.quality.motionScore > config.motionMax) {
    return idle('motion too high');
  }

  if (input.lastCaptureAtMs !== null && input.quality.sceneChangedScore < config.sceneChangedThreshold) {
    return idle('scene unchanged');
  }

  if (input.lastCaptureAtMs !== null && input.nowMs - input.lastCaptureAtMs < config.cooldownMs) {
    return idle('cooldown active');
  }

  const nextStableSinceMs = input.stableSinceMs ?? input.nowMs;
  const stableForMs = input.nowMs - nextStableSinceMs;

  if (stableForMs >= config.stableDurationMs) {
    return {
      kind: 'capture',
      reason: 'stable gates passed',
      nextStableSinceMs: null
    };
  }

  return {
    kind: 'candidate',
    reason: 'waiting for stability',
    stableForMs,
    nextStableSinceMs
  };
}
