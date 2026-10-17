import { clamp } from '../shared/clamp';
import { guidesForKinds } from './guides';
import type { CompositionGuide, GuideHit, NormalizedPoint, ScorePointOptions, ScorePointResult } from './types';

export const DEFAULT_MAX_GUIDE_DISTANCE = 0.12;

function axisValue(point: NormalizedPoint, axis: 'x' | 'y'): number {
  return axis === 'x' ? point.x : point.y;
}

export function distancePointToSegment(point: NormalizedPoint, start: NormalizedPoint, end: NormalizedPoint): number {
  const segmentX = end.x - start.x;
  const segmentY = end.y - start.y;
  const lengthSquared = segmentX * segmentX + segmentY * segmentY;

  if (lengthSquared <= 0) {
    return Math.hypot(point.x - start.x, point.y - start.y);
  }

  const t = clamp(((point.x - start.x) * segmentX + (point.y - start.y) * segmentY) / lengthSquared, 0, 1);
  return Math.hypot(point.x - (start.x + t * segmentX), point.y - (start.y + t * segmentY));
}

export function distancePointToGuide(point: NormalizedPoint, guide: CompositionGuide): number {
  if (guide.axis === 'segment') {
    return distancePointToSegment(point, guide.start, guide.end);
  }

  return Math.abs(axisValue(point, guide.axis) - guide.value);
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
      const distance = distancePointToGuide(point, guide);

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
