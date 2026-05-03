import { scoreFrameComposition } from '../composition/scoreFrameComposition';
import type { GuideKind } from '../composition/types';
import type { CompositionCandidate, DetectedCompositionScore, DetectedCompositionScoreInput } from './types';

function isDetectedCompositionScoreInput(value: CompositionCandidate | DetectedCompositionScoreInput | null): value is DetectedCompositionScoreInput {
  return Boolean(value && typeof value === 'object' && 'activeGuideKinds' in value);
}

function explanationForCandidate(candidate: CompositionCandidate | null, fallbackExplanation?: string): string {
  if (!candidate) {
    return fallbackExplanation ?? 'No candidate. Tap subject or switch Auto.';
  }

  switch (candidate.source) {
    case 'manual':
      return fallbackExplanation ?? 'Manual subject point is being scored against the active guides.';
    case 'heuristic-placeholder':
      return fallbackExplanation ?? 'Placeholder subject is being scored. No real object or horizon detection yet.';
    case 'simulated-detector':
      return fallbackExplanation ?? 'Simulated subject is being scored to test auto-capture flow.';
    case 'none':
      return fallbackExplanation ?? 'No candidate. Tap subject or switch Auto.';
  }
}

export function scoreDetectedComposition(input: DetectedCompositionScoreInput): DetectedCompositionScore;
export function scoreDetectedComposition(
  candidate: CompositionCandidate | null,
  activeGuideKinds: GuideKind[],
  fallbackExplanation?: string
): DetectedCompositionScore;
export function scoreDetectedComposition(
  candidateOrInput: CompositionCandidate | DetectedCompositionScoreInput | null,
  activeGuideKinds: GuideKind[] = [],
  fallbackExplanation?: string
): DetectedCompositionScore {
  const candidate = isDetectedCompositionScoreInput(candidateOrInput) ? candidateOrInput.candidate : candidateOrInput;
  const kinds = isDetectedCompositionScoreInput(candidateOrInput) ? candidateOrInput.activeGuideKinds : activeGuideKinds;
  const explanation = isDetectedCompositionScoreInput(candidateOrInput) ? candidateOrInput.explanation : fallbackExplanation;
  const composition = scoreFrameComposition({
    subjectCenter: candidate?.center ?? null,
    activeGuideKinds: kinds
  });

  return {
    candidate,
    composition,
    scoreResult: composition,
    source: candidate?.source ?? 'none',
    confidence: candidate?.confidence ?? 0,
    explanation: explanationForCandidate(candidate, explanation)
  };
}
