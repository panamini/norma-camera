import { clamp } from '../shared/clamp';
import { guidesForKinds } from './guides';
import type { GuideHit, NormalizedPoint, ScorePointOptions, ScorePointResult } from './types';

export const DEFAULT_MAX_GUIDE_DISTANCE = 0.12;

function axisValue(point: NormalizedPoint, axis: 'x' | 'y'): number {
  return axis === 'x' ? point.x : point.y;
}

export function scoreDistanceToGuide(distance: number, maxDistance = DEFAULT_MAX_GUIDE_DISTANCE): number {
  if (maxDistance <= 0) {
    return distance <= 0 ? 100 : 0;
  }

  return Math.round(clamp(1 - distance / maxDistance, 0, 1) * 100);
}

export function scorePointAgainstGuides(point: NormalizedPoint, options: ScorePointOptions): ScorePointResult {
  const maxDistance = options.maxDistance ?? DEFAULT_MAX_GUIDE_DISTANCE;
  const hits = guidesForKinds(options.activeGuideKinds)
    .map<GuideHit>((guide) => {
      const distance = Math.abs(axisValue(point, guide.axis) - guide.value);

      return {
        guide,
        distance,
        score: scoreDistanceToGuide(distance, maxDistance)
      };
    })
    .sort((a, b) => b.score - a.score || a.distance - b.distance);

  return {
    score: hits[0]?.score ?? 0,
    bestHit: hits[0] ?? null,
    hits
  };
}
