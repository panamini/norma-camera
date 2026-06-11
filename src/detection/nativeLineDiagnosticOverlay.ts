import type { NativeLineCandidate, NativeLineSegmentCandidate } from './nativeHeuristicTypes';
import { lineSegmentMappingId, type NormalizedLineSegment } from './nativeEvidenceCoordinateMapping';
import type { LineSegmentStabilityState, StabilizedLineSegmentCandidate } from './nativeLineSegmentRetention';

export const MIN_HORIZONTAL_LINE_OVERLAY_CONFIDENCE = 0.34;
export const MIN_LINE_SEGMENT_SPIKE_OVERLAY_CONFIDENCE = 0.24;
export const MIN_LINE_SEGMENT_SPIKE_OVERLAY_LENGTH = 0.08;
export const MAX_LINE_SEGMENT_SPIKE_OVERLAY_SEGMENTS = 4;

export type NormalizedLineSegmentSpikeOverlaySegment = NormalizedLineSegment & {
  key: string;
  orientationKind: NativeLineSegmentCandidate['orientationKind'];
  confidence: number;
  lengthEuclidean: number;
  stabilityState: LineSegmentStabilityState;
};

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}

export function normalizedHorizontalLineOverlayY(lineCandidate: NativeLineCandidate | null | undefined): number | null {
  if (!lineCandidate || lineCandidate.kind !== 'horizontal-line') return null;

  const segment = normalizedLineCandidateOverlaySegment(lineCandidate);
  if (!segment) return null;

  return clamp01((segment.y1 + segment.y2) / 2);
}

export function normalizedLineCandidateOverlaySegment(lineCandidate: NativeLineCandidate | null | undefined): NormalizedLineSegment | null {
  if (!lineCandidate) return null;
  if (typeof lineCandidate.x1 !== 'number' || !Number.isFinite(lineCandidate.x1)) return null;
  if (typeof lineCandidate.x2 !== 'number' || !Number.isFinite(lineCandidate.x2)) return null;
  if (typeof lineCandidate.y1 !== 'number' || !Number.isFinite(lineCandidate.y1)) return null;
  if (typeof lineCandidate.y2 !== 'number' || !Number.isFinite(lineCandidate.y2)) return null;
  if (typeof lineCandidate.confidence !== 'number' || !Number.isFinite(lineCandidate.confidence)) return null;
  if (lineCandidate.confidence < MIN_HORIZONTAL_LINE_OVERLAY_CONFIDENCE) return null;

  return {
    x1: lineCandidate.x1,
    y1: lineCandidate.y1,
    x2: lineCandidate.x2,
    y2: lineCandidate.y2
  };
}

function isFiniteNumber(value: number | null | undefined): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function lineSegmentStabilityState(segment: NativeLineSegmentCandidate): LineSegmentStabilityState {
  const stabilityState = (segment as Partial<StabilizedLineSegmentCandidate>).stabilityState;
  return stabilityState === 'stable' || stabilityState === 'retained' ? stabilityState : 'fresh';
}

export function normalizedLineSegmentSpikeOverlaySegments(
  lineSegments: NativeLineSegmentCandidate[] | null | undefined
): NormalizedLineSegmentSpikeOverlaySegment[] {
  if (!Array.isArray(lineSegments)) return [];

  return lineSegments.flatMap((segment) => {
    if (segment.src !== 'native-line-segment-spike') return [];
    if (!isFiniteNumber(segment.x1) || !isFiniteNumber(segment.x2) || !isFiniteNumber(segment.y1) || !isFiniteNumber(segment.y2)) return [];
    if (!isFiniteNumber(segment.confidence) || segment.confidence < MIN_LINE_SEGMENT_SPIKE_OVERLAY_CONFIDENCE) return [];
    if (!isFiniteNumber(segment.lengthEuclidean) || segment.lengthEuclidean < MIN_LINE_SEGMENT_SPIKE_OVERLAY_LENGTH) return [];

    return [
      {
        key: lineSegmentMappingId(segment),
        x1: segment.x1,
        y1: segment.y1,
        x2: segment.x2,
        y2: segment.y2,
        orientationKind: segment.orientationKind,
        confidence: segment.confidence,
        lengthEuclidean: segment.lengthEuclidean,
        stabilityState: lineSegmentStabilityState(segment)
      }
    ];
  }).slice(0, MAX_LINE_SEGMENT_SPIKE_OVERLAY_SEGMENTS);
}
