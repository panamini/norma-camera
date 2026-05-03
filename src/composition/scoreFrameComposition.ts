import { ADJUST_LABEL, CENTERED_LABEL, NO_SUBJECT_LABEL, READY_LABEL, labelForBestHit } from './labels';
import { scorePointAgainstGuides } from './scorePointAgainstGuides';
import type { CompositionScoreInput, CompositionScoreResult, GuideHit } from './types';

const HIGH_SCORE_THRESHOLD = 82;
const MEDIUM_SCORE_THRESHOLD = 45;

function bestHitFor(hits: GuideHit[], label: string): GuideHit | null {
  return hits.find((hit) => hit.guide.label === label) ?? null;
}

function isCenteredOnBothAxes(hits: GuideHit[]): boolean {
  const centerX = bestHitFor(hits, 'CENTER_X');
  const centerY = bestHitFor(hits, 'CENTER_Y');

  return Boolean(centerX && centerY && centerX.score >= HIGH_SCORE_THRESHOLD && centerY.score >= HIGH_SCORE_THRESHOLD);
}

export function scoreFrameComposition(input: CompositionScoreInput): CompositionScoreResult {
  if (!input.subjectCenter) {
    return {
      score: 0,
      bestHit: null,
      label: NO_SUBJECT_LABEL,
      isInteresting: false
    };
  }

  const guideScore = scorePointAgainstGuides(input.subjectCenter, {
    activeGuideKinds: input.activeGuideKinds
  });

  if (isCenteredOnBothAxes(guideScore.hits)) {
    return {
      score: 100,
      bestHit: guideScore.bestHit,
      label: CENTERED_LABEL,
      isInteresting: true
    };
  }

  const score = guideScore.score;
  const highScoreLabel = score >= HIGH_SCORE_THRESHOLD ? labelForBestHit(guideScore.bestHit) ?? READY_LABEL : null;
  const label = highScoreLabel ?? (score >= MEDIUM_SCORE_THRESHOLD ? ADJUST_LABEL : ADJUST_LABEL);

  return {
    score,
    bestHit: guideScore.bestHit,
    label,
    isInteresting: score >= HIGH_SCORE_THRESHOLD
  };
}
