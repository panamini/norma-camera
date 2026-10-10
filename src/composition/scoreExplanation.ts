import { DEFAULT_MAX_GUIDE_DISTANCE } from './scorePointAgainstGuides';
import type { CompositionGuide, CompositionScoreResult, GuideHit, NormalizedPoint } from './types';

const MEDIUM_SCORE_THRESHOLD = 45;

export function formatCompositionBreakdown(result: CompositionScoreResult): string[] {
  const lines = ['Composition', `Base guide score: ${Math.round(result.baseGuideScore)}`];

  if (result.lineContribution > 0) {
    lines.push(`Line signal: +${Math.round(result.lineContribution)}`);
    lines.push(`Total: ${Math.round(result.score)}`);
  }

  return lines;
}

export function formatNormalizedPoint(point: NormalizedPoint): string {
  return `x=${point.x.toFixed(3)} · y=${point.y.toFixed(3)}`;
}

export function formatGuideValue(value: number): string {
  return value.toFixed(3);
}

export function displayNameForGuide(guide: CompositionGuide): string {
  switch (guide.label) {
    case 'LEFT_THIRD':
      return 'left third';
    case 'RIGHT_THIRD':
      return 'right third';
    case 'UPPER_THIRD':
      return 'upper third';
    case 'LOWER_THIRD':
      return 'lower third';
    case 'CENTER_X':
      return 'vertical center';
    case 'CENTER_Y':
      return 'horizontal center';
    case 'PHI_LEFT':
      return 'left phi line';
    case 'PHI_RIGHT':
      return 'right phi line';
    case 'PHI_UPPER':
      return 'upper phi line';
    case 'PHI_LOWER':
      return 'lower phi line';
    case 'ROOT2_LEFT':
      return 'left root-2 line';
    case 'ROOT2_RIGHT':
      return 'right root-2 line';
    case 'ROOT2_UPPER':
      return 'upper root-2 line';
    case 'ROOT2_LOWER':
      return 'lower root-2 line';
    case 'DIAGONAL_FALLING':
      return 'falling diagonal';
    case 'DIAGONAL_RISING':
      return 'rising diagonal';
    default:
      return guide.label.toLowerCase().replaceAll('_', ' ');
  }
}

export function formatGuideHit(hit: GuideHit | null): string | null {
  if (!hit) {
    return null;
  }

  if (hit.guide.axis === 'segment') {
    return `${displayNameForGuide(hit.guide)} · segment · Δ=${hit.distance.toFixed(3)}`;
  }

  return `${displayNameForGuide(hit.guide)} · ${hit.guide.axis}=${formatGuideValue(hit.guide.value)} · Δ=${hit.distance.toFixed(3)}`;
}

export function explainCompositionScore(
  result: CompositionScoreResult,
  point: NormalizedPoint | null,
  readyThreshold: number
): string {
  if (!point) {
    return 'Tap the subject point. Manual V0 does not detect objects yet.';
  }

  if (!result.bestHit) {
    return 'No active composition guide is available for this overlay mode.';
  }

  const guideName = displayNameForGuide(result.bestHit.guide);
  const distance = result.bestHit.distance.toFixed(3);

  if (result.score >= readyThreshold) {
    return `High: candidate point is ${distance} from the ${guideName}; ready threshold is ${readyThreshold}.`;
  }

  if (result.score >= MEDIUM_SCORE_THRESHOLD) {
    return `Medium: candidate point is ${distance} from the ${guideName}; move closer for ${readyThreshold}.`;
  }

  return `Low: candidate point is ${distance} from the ${guideName}; guide score reaches 0 around ${DEFAULT_MAX_GUIDE_DISTANCE}.`;
}
