import { guidesForKinds } from '../composition/guides';
import { DEFAULT_MAX_GUIDE_DISTANCE, scoreDistanceToGuide } from '../composition/scorePointAgainstGuides';
import type { GuideKind } from '../composition/types';
import type { NativeLineCandidate } from './nativeHeuristicTypes';
import { normalizedHorizontalLineOverlayY } from './nativeLineDiagnosticOverlay';

export type LineGuideScoreResult = {
  hasLine: boolean;
  score: number | null;
  nearestGuideLabel: string | null;
  distance: number | null;
  lineY: number | null;
};

const DEFAULT_HORIZONTAL_LINE_GUIDE_KINDS: GuideKind[] = ['third', 'half'];

function emptyLineGuideScore(hasLine = false, lineY: number | null = null): LineGuideScoreResult {
  return {
    hasLine,
    score: null,
    nearestGuideLabel: null,
    distance: null,
    lineY
  };
}

function displayLabelForGuideLabel(label: string): string {
  switch (label) {
    case 'UPPER_THIRD':
      return 'upper third';
    case 'CENTER_Y':
      return 'center';
    case 'LOWER_THIRD':
      return 'lower third';
    default:
      return label.toLowerCase().replace(/_/g, ' ');
  }
}

export function scoreHorizontalLineAgainstGuides(
  lineCandidate: NativeLineCandidate | null | undefined,
  activeGuideKinds: GuideKind[] = DEFAULT_HORIZONTAL_LINE_GUIDE_KINDS,
  maxDistance: number = DEFAULT_MAX_GUIDE_DISTANCE
): LineGuideScoreResult {
  const lineY = normalizedHorizontalLineOverlayY(lineCandidate);
  if (lineY === null) return emptyLineGuideScore(false);

  const bestHit = guidesForKinds(activeGuideKinds)
    .filter((guide) => guide.axis === 'y')
    .map((guide) => {
      const distance = Math.abs(lineY - guide.value);
      return {
        guide,
        distance,
        score: scoreDistanceToGuide(distance, maxDistance)
      };
    })
    .sort((a, b) => b.score - a.score || a.distance - b.distance)[0];

  if (!bestHit) return emptyLineGuideScore(true, lineY);

  return {
    hasLine: true,
    score: bestHit.score,
    nearestGuideLabel: displayLabelForGuideLabel(bestHit.guide.label),
    distance: bestHit.distance,
    lineY
  };
}
