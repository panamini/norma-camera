import { decideAutoCapture } from './decideAutoCapture';
import type { AutoCaptureConfig, AutoCaptureDecision, AutoCaptureInput } from './types';

type EvaluateInput = Omit<AutoCaptureInput, 'stableSinceMs'>;

export type AutoCaptureController = {
  evaluate: (input: EvaluateInput) => AutoCaptureDecision;
  reset: () => void;
  getStableSinceMs: () => number | null;
};

export function createAutoCaptureController(config: AutoCaptureConfig): AutoCaptureController {
  let stableSinceMs: number | null = null;

  return {
    evaluate(input) {
      const decision = decideAutoCapture({ ...input, stableSinceMs }, config);
      stableSinceMs = decision.nextStableSinceMs;
      return decision;
    },
    reset() {
      stableSinceMs = null;
    },
    getStableSinceMs() {
      return stableSinceMs;
    }
  };
}
