import { guidesForKinds } from '../composition/guides';
import { DEFAULT_MAX_GUIDE_DISTANCE, scoreDistanceToGuide } from '../composition/scorePointAgainstGuides';
import type { AxisGuide, GuideKind } from '../composition/types';
import type { NativeLineCandidate } from './nativeHeuristicTypes';
import { normalizedHorizontalLineOverlayY } from './nativeLineDiagnosticOverlay';

export type LineGuideScoreResult =
  | {
      hasLine: false;
      score: null;
      nearestGuideLabel: null;
      distance: null;
      lineY: null;
    }
  | {
      hasLine: true;
      score: number;
      nearestGuideLabel: string;
      distance: number;
      lineY: number;
    };

type ScoredHorizontalGuideHit = {
  nearestGuideLabel: string;
  distance: number;
  score: number;
};

const DEFAULT_HORIZONTAL_LINE_GUIDE_KINDS: GuideKind[] = ['third', 'half'];
const HORIZONTAL_GUIDE_DISPLAY_LABELS: Readonly<Record<string, string>> = {
  UPPER_THIRD: 'upper third',
  CENTER_Y: 'center',
  LOWER_THIRD: 'lower third',
  PHI_UPPER: 'upper phi',
  PHI_LOWER: 'lower phi',
  ROOT2_UPPER: 'upper root-2',
  ROOT2_LOWER: 'lower root-2'
};

function emptyLineGuideScore(): LineGuideScoreResult {
  return {
    hasLine: false,
    score: null,
    nearestGuideLabel: null,
    distance: null,
    lineY: null
  };
}

function displayLabelForGuideLabel(label: string): string | null {
  return HORIZONTAL_GUIDE_DISPLAY_LABELS[label] ?? null;
}

export function scoreHorizontalLineAgainstGuides(
  lineCandidate: NativeLineCandidate | null | undefined,
  activeGuideKinds: GuideKind[] = DEFAULT_HORIZONTAL_LINE_GUIDE_KINDS,
  maxDistance: number = DEFAULT_MAX_GUIDE_DISTANCE
): LineGuideScoreResult {
  const lineY = normalizedHorizontalLineOverlayY(lineCandidate);
  if (lineY === null) return emptyLineGuideScore();

  const bestHit = guidesForKinds(activeGuideKinds)
    .filter((guide): guide is AxisGuide => guide.axis === 'y')
    .map<ScoredHorizontalGuideHit | null>((guide) => {
      const nearestGuideLabel = displayLabelForGuideLabel(guide.label);
      if (!nearestGuideLabel) return null;

      const distance = Math.abs(lineY - guide.value);
      return {
        nearestGuideLabel,
        distance,
        score: scoreDistanceToGuide(distance, maxDistance)
      };
    })
    .filter((hit): hit is ScoredHorizontalGuideHit => hit !== null)
    .sort((a, b) => b.score - a.score || a.distance - b.distance)[0];

  if (!bestHit) return emptyLineGuideScore();

  return {
    hasLine: true,
    score: bestHit.score,
    nearestGuideLabel: bestHit.nearestGuideLabel,
    distance: bestHit.distance,
    lineY
  };
}
