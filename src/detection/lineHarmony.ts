import { guidesForKinds } from '../composition/guides';
import type { CanonDefinition, CompositionGuide } from '../composition/types';
import type { NativeLineSegmentCandidate } from './nativeHeuristicTypes';
import type { LineSegmentStabilityState } from './nativeLineSegmentRetention';

/**
 * Line Harmony readout: how much the stable line segments agree with the
 * active canon's construction. Presentation-layer evidence only — it feeds
 * the viewfinder readout and the why sheet, never the composition score,
 * readiness, or capture. Approximate by construction (32×24 luma grid).
 */

export type HarmonySegment = NativeLineSegmentCandidate & {
  stabilityState?: LineSegmentStabilityState;
};

export type LineHarmonyConfig = {
  maxAngleDeltaDeg: number;
  maxOffset: number;
  minSegmentLength: number;
};

export const DEFAULT_LINE_HARMONY_CONFIG: LineHarmonyConfig = {
  maxAngleDeltaDeg: 10,
  maxOffset: 0.05,
  minSegmentLength: 0.08
};

export type SnappedSegment = {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
};

export type LineHarmonyMatch = {
  segment: HarmonySegment;
  guideLabel: string;
  agreement: number;
  angleDeltaDeg: number;
  offset: number;
  /**
   * The matched segment projected onto its guide. The 32×24 grid localizes
   * an edge to ±1 cell, so the overlay draws the snapped segment: a match
   * means "this edge agrees with this construction line", and it is drawn
   * on that line.
   */
  snapped: SnappedSegment;
};

export type LineHarmonyResult = {
  score: number;
  matches: LineHarmonyMatch[];
  consideredSegments: number;
};

export const EMPTY_LINE_HARMONY: LineHarmonyResult = { score: 0, matches: [], consideredSegments: 0 };

type SegmentGeometry = {
  midX: number;
  midY: number;
  angleDeg: number;
  length: number;
};

function normalizedAngleDeg(angleDeg: number): number {
  const normalized = ((angleDeg % 180) + 180) % 180;
  return normalized >= 90 ? normalized - 180 : normalized;
}

function angleDeltaDeg(a: number, b: number): number {
  const delta = Math.abs(normalizedAngleDeg(a) - normalizedAngleDeg(b));
  return Math.min(delta, 180 - delta);
}

/** Geometry derived from endpoints only; stored angle metadata is ignored. */
function segmentGeometry(segment: HarmonySegment): SegmentGeometry {
  const dx = segment.x2 - segment.x1;
  const dy = segment.y2 - segment.y1;
  return {
    midX: (segment.x1 + segment.x2) / 2,
    midY: (segment.y1 + segment.y2) / 2,
    angleDeg: (Math.atan2(dy, dx) * 180) / Math.PI,
    length: Math.hypot(dx, dy)
  };
}

type GuideTarget = {
  angleDeg: number;
  offsetFor: (geometry: SegmentGeometry) => number;
  snap: (segment: HarmonySegment) => SnappedSegment;
};

function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value));
}

function guideTarget(guide: CompositionGuide): GuideTarget {
  if (guide.axis === 'segment') {
    const dx = guide.end.x - guide.start.x;
    const dy = guide.end.y - guide.start.y;
    const lengthSquared = dx * dx + dy * dy;
    const length = Math.sqrt(lengthSquared);
    const project = (x: number, y: number) => {
      if (lengthSquared <= 0) return { x: guide.start.x, y: guide.start.y };
      const t = clamp01(((x - guide.start.x) * dx + (y - guide.start.y) * dy) / lengthSquared);
      return { x: guide.start.x + t * dx, y: guide.start.y + t * dy };
    };
    return {
      angleDeg: (Math.atan2(dy, dx) * 180) / Math.PI,
      offsetFor: (geometry) => {
        if (length <= 0) return Math.hypot(geometry.midX - guide.start.x, geometry.midY - guide.start.y);
        return Math.abs((geometry.midX - guide.start.x) * dy - (geometry.midY - guide.start.y) * dx) / length;
      },
      snap: (segment) => {
        const a = project(segment.x1, segment.y1);
        const b = project(segment.x2, segment.y2);
        return { x1: a.x, y1: a.y, x2: b.x, y2: b.y };
      }
    };
  }

  if (guide.axis === 'x') {
    return {
      angleDeg: 90,
      offsetFor: (geometry) => Math.abs(geometry.midX - guide.value),
      snap: (segment) => ({ x1: guide.value, y1: segment.y1, x2: guide.value, y2: segment.y2 })
    };
  }

  return {
    angleDeg: 0,
    offsetFor: (geometry) => Math.abs(geometry.midY - guide.value),
    snap: (segment) => ({ x1: segment.x1, y1: guide.value, x2: segment.x2, y2: guide.value })
  };
}

function isConsiderable(segment: HarmonySegment, geometry: SegmentGeometry, config: LineHarmonyConfig): boolean {
  if (segment.stabilityState === 'fresh') return false;
  if (!Number.isFinite(geometry.midX) || !Number.isFinite(geometry.midY) || !Number.isFinite(geometry.angleDeg)) return false;
  return geometry.length >= config.minSegmentLength;
}

function segmentWeight(segment: HarmonySegment, geometry: SegmentGeometry): number {
  const confidence = Number.isFinite(segment.confidence) ? Math.min(1, Math.max(0, segment.confidence)) : 0;
  return geometry.length * confidence;
}

export function scoreLineHarmony(
  segments: HarmonySegment[] | null | undefined,
  canon: CanonDefinition,
  config: LineHarmonyConfig = DEFAULT_LINE_HARMONY_CONFIG
): LineHarmonyResult {
  if (!segments || segments.length === 0) return EMPTY_LINE_HARMONY;

  const guides = guidesForKinds(canon.guideKinds).map((guide) => ({ guide, target: guideTarget(guide) }));
  if (guides.length === 0) return EMPTY_LINE_HARMONY;

  const matches: LineHarmonyMatch[] = [];
  let consideredSegments = 0;
  let totalWeight = 0;
  let agreedWeight = 0;

  for (const segment of segments) {
    const geometry = segmentGeometry(segment);
    if (!isConsiderable(segment, geometry, config)) continue;

    consideredSegments += 1;
    const weight = segmentWeight(segment, geometry);
    totalWeight += weight;

    let best: LineHarmonyMatch | null = null;
    for (const { guide, target } of guides) {
      const angleDelta = angleDeltaDeg(geometry.angleDeg, target.angleDeg);
      if (angleDelta > config.maxAngleDeltaDeg) continue;

      const offset = target.offsetFor(geometry);
      if (offset > config.maxOffset) continue;

      const agreement = (1 - angleDelta / config.maxAngleDeltaDeg) * (1 - offset / config.maxOffset);
      if (!best || agreement > best.agreement) {
        best = { segment, guideLabel: guide.label, agreement, angleDeltaDeg: angleDelta, offset, snapped: target.snap(segment) };
      }
    }

    if (best) {
      matches.push(best);
      agreedWeight += weight * best.agreement;
    }
  }

  if (consideredSegments === 0 || totalWeight <= 0) {
    return { score: 0, matches: [], consideredSegments };
  }

  return {
    score: Math.round((agreedWeight / totalWeight) * 100),
    matches: matches.sort((a, b) => b.agreement - a.agreement),
    consideredSegments
  };
}
