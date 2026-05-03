import type { GuideHit, NormalizedPoint } from './types';

const HIGH_SCORE_THRESHOLD = 82;
const MEDIUM_SCORE_THRESHOLD = 45;

function formatNormalizedValue(value: number): string {
  return value.toFixed(3);
}

export function formatNormalizedPoint(point: NormalizedPoint): string {
  return `x=${formatNormalizedValue(point.x)} · y=${formatNormalizedValue(point.y)}`;
}

export function guideDisplayName(hit: GuideHit | null): string {
  switch (hit?.guide.label) {
    case 'LEFT_THIRD':
      return 'LEFT THIRD';
    case 'RIGHT_THIRD':
      return 'RIGHT THIRD';
    case 'UPPER_THIRD':
      return 'UPPER THIRD';
    case 'LOWER_THIRD':
      return 'LOWER THIRD';
    case 'CENTER_X':
      return 'VERTICAL CENTER';
    case 'CENTER_Y':
      return 'HORIZONTAL CENTER';
    default:
      return 'NONE';
  }
}

export function describeGuideHit(hit: GuideHit | null): string {
  if (!hit) {
    return 'nearest guide: none';
  }

  const axisValue = hit.guide.axis === 'x' ? `x=${formatNormalizedValue(hit.guide.value)}` : `y=${formatNormalizedValue(hit.guide.value)}`;
  return `nearest guide: ${guideDisplayName(hit)} · ${axisValue} · Δ=${formatNormalizedValue(hit.distance)}`;
}

export function explainGuideScore(score: number, hit: GuideHit | null): string {
  if (!hit) {
    return 'No subject point has been selected. Manual V0 does not detect objects or horizons yet.';
  }

  const roundedScore = Math.round(score);
  const guideName = guideDisplayName(hit).toLowerCase();
  const distance = formatNormalizedValue(hit.distance);

  if (roundedScore >= HIGH_SCORE_THRESHOLD) {
    return `High because the selected subject point is close to the ${guideName} guide (Δ=${distance}).`;
  }

  if (roundedScore >= MEDIUM_SCORE_THRESHOLD) {
    return `Medium because the selected subject point is near, but not on, the ${guideName} guide (Δ=${distance}).`;
  }

  return `Low because the selected subject point is too far from the nearest active guide, ${guideName} (Δ=${distance}).`;
}
