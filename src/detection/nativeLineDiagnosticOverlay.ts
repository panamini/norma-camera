import type { NativeLineCandidate } from './nativeHeuristicTypes';

export const MIN_HORIZONTAL_LINE_OVERLAY_CONFIDENCE = 0.34;

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}

export function normalizedHorizontalLineOverlayY(lineCandidate: NativeLineCandidate | null | undefined): number | null {
  if (!lineCandidate) return null;
  if (lineCandidate.kind !== 'horizontal-line') return null;
  if (typeof lineCandidate.y1 !== 'number' || !Number.isFinite(lineCandidate.y1)) return null;
  if (typeof lineCandidate.y2 !== 'number' || !Number.isFinite(lineCandidate.y2)) return null;
  if (typeof lineCandidate.confidence !== 'number' || !Number.isFinite(lineCandidate.confidence)) return null;
  if (lineCandidate.confidence < MIN_HORIZONTAL_LINE_OVERLAY_CONFIDENCE) return null;

  return clamp01((lineCandidate.y1 + lineCandidate.y2) / 2);
}
