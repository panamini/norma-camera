import type { NativeFrameAnalysisResult } from './nativeHeuristicTypes';
import type { NormalizedPoint, NormalizedRect } from './types';

export const NATIVE_VISUAL_MASS_OVERLAY_CONFIDENCE_MIN = 0.14;

export type NativeVisualMassOverlayCandidate = {
  center: NormalizedPoint;
  bounds: NormalizedRect;
  confidence: number;
};

function isFiniteNormalizedPoint(point: NormalizedPoint | null | undefined): point is NormalizedPoint {
  return (
    Boolean(point) &&
    typeof point?.x === 'number' &&
    Number.isFinite(point.x) &&
    point.x >= 0 &&
    point.x <= 1 &&
    typeof point.y === 'number' &&
    Number.isFinite(point.y) &&
    point.y >= 0 &&
    point.y <= 1
  );
}

function isFiniteNormalizedRect(bounds: NormalizedRect | null | undefined): bounds is NormalizedRect {
  return (
    Boolean(bounds) &&
    typeof bounds?.x === 'number' &&
    Number.isFinite(bounds.x) &&
    bounds.x >= 0 &&
    bounds.x <= 1 &&
    typeof bounds.y === 'number' &&
    Number.isFinite(bounds.y) &&
    bounds.y >= 0 &&
    bounds.y <= 1 &&
    typeof bounds.width === 'number' &&
    Number.isFinite(bounds.width) &&
    bounds.width > 0 &&
    bounds.width <= 1 &&
    typeof bounds.height === 'number' &&
    Number.isFinite(bounds.height) &&
    bounds.height > 0 &&
    bounds.height <= 1 &&
    bounds.x + bounds.width <= 1 &&
    bounds.y + bounds.height <= 1
  );
}

export function nativeVisualMassOverlayCandidate(analysis: NativeFrameAnalysisResult | null | undefined): NativeVisualMassOverlayCandidate | null {
  if (analysis?.analysisSource !== 'live-frame') return null;

  const subject = analysis.subject;
  if (!subject || subject.confidence < NATIVE_VISUAL_MASS_OVERLAY_CONFIDENCE_MIN) return null;
  if (!isFiniteNormalizedPoint(subject.center) || !isFiniteNormalizedRect(subject.bounds)) return null;

  return {
    center: subject.center,
    bounds: subject.bounds,
    confidence: subject.confidence
  };
}
