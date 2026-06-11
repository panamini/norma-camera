import type { NativeLineCandidate } from './nativeHeuristicTypes';
import type { NormalizedLineSegment } from './nativeEvidenceCoordinateMapping';

export const MIN_HORIZONTAL_LINE_OVERLAY_CONFIDENCE = 0.34;

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
