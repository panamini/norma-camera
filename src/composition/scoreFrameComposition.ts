import { ADJUST_LABEL, CENTERED_LABEL, NO_SUBJECT_LABEL, READY_LABEL, labelForBestHit } from './labels';
import { scorePointAgainstGuides } from './scorePointAgainstGuides';
import type { CompositionScoreInput, CompositionScoreResult, GuideHit } from './types';

const HIGH_SCORE_THRESHOLD = 82;
const MEDIUM_SCORE_THRESHOLD = 45;
export const MAX_LINE_ALIGNMENT_CONTRIBUTION = 8;

function clampScore(value: number): number {
  return Math.max(0, Math.min(100, value));
}

function normalizedLineAlignmentScore(value: number | null | undefined): number | null {
  if (typeof value !== 'number' || !Number.isFinite(value)) return null;
  return clampScore(value);
}

export function potentialLineContributionForAlignmentScore(value: number | null | undefined): number {
  const alignmentScore = normalizedLineAlignmentScore(value);
  if (alignmentScore === null || alignmentScore <= 0) return 0;
  return Math.round((alignmentScore / 100) * MAX_LINE_ALIGNMENT_CONTRIBUTION);
}

function scoreWithLineContribution(baseScore: number, potentialLineContribution: number): number {
  if (potentialLineContribution <= 0) return baseScore;

  const combinedScore = clampScore(baseScore + potentialLineContribution);

  if (baseScore < HIGH_SCORE_THRESHOLD) return Math.min(combinedScore, HIGH_SCORE_THRESHOLD - 1);

  return combinedScore;
}

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
      baseGuideScore: 0,
      lineAlignmentScore: null,
      lineContribution: 0,
      bestHit: null,
      label: NO_SUBJECT_LABEL,
      isInteresting: false
    };
  }

  const guideScore = scorePointAgainstGuides(input.subjectCenter, {
    activeGuideKinds: input.activeGuideKinds
  });

  const baseGuideScore = guideScore.score;
  const lineAlignmentScore = normalizedLineAlignmentScore(input.lineAlignmentScore);
  const potentialLineContribution = potentialLineContributionForAlignmentScore(lineAlignmentScore);
  const score = scoreWithLineContribution(baseGuideScore, potentialLineContribution);
  const lineContribution = Math.max(0, score - baseGuideScore);

  if (isCenteredOnBothAxes(guideScore.hits)) {
    return {
      score: 100,
      baseGuideScore: 100,
      lineAlignmentScore,
      lineContribution: 0,
      bestHit: guideScore.bestHit,
      label: CENTERED_LABEL,
      isInteresting: true
    };
  }

  const highScoreLabel = score >= HIGH_SCORE_THRESHOLD ? labelForBestHit(guideScore.bestHit) ?? READY_LABEL : null;
  const label = highScoreLabel ?? (score >= MEDIUM_SCORE_THRESHOLD ? ADJUST_LABEL : ADJUST_LABEL);

  return {
    score,
    baseGuideScore,
    lineAlignmentScore,
    lineContribution,
    bestHit: guideScore.bestHit,
    label,
    isInteresting: score >= HIGH_SCORE_THRESHOLD
  };
}
