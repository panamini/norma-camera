import {
  mapNormalizedFramePointToPreviewPoint,
  mapNormalizedFrameRectToPreviewRect,
  type NativeEvidencePreviewMapping
} from './nativeEvidenceCoordinateMapping';
import type {
  NativeFrameAnalysisResult,
  NativeVisualMassDebug,
  NativeVisualMassDebugCandidate,
  NativeVisualMassDebugCell
} from './nativeHeuristicTypes';
import type { NormalizedPoint, NormalizedRect } from './types';

export const NATIVE_VISUAL_MASS_OVERLAY_CONFIDENCE_MIN = 0.14;
export const NATIVE_VISUAL_MASS_DEBUG_TOP_CANDIDATE_LIMIT = 3;

export type NativeVisualMassOverlayCandidate = {
  center: NormalizedPoint;
  bounds: NormalizedRect;
  confidence: number;
};

export type NativeVisualMassDebugOverlay = {
  raw: NativeVisualMassDebug;
  mapped: NativeVisualMassDebug;
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

function isFinitePositiveInteger(value: number | null | undefined): value is number {
  return typeof value === 'number' && Number.isFinite(value) && Number.isInteger(value) && value > 0;
}

function isFiniteUnitMetric(value: number | null | undefined): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= 1;
}

function normalizeDebugCell(cell: NativeVisualMassDebugCell | null | undefined): NativeVisualMassDebugCell | null {
  if (!cell || !isFiniteNormalizedRect(cell) || !isFiniteUnitMetric(cell.energy)) return null;

  return {
    x: cell.x,
    y: cell.y,
    width: cell.width,
    height: cell.height,
    energy: cell.energy
  };
}

function normalizeDebugCandidate(candidate: NativeVisualMassDebugCandidate | null | undefined): NativeVisualMassDebugCandidate | null {
  if (!candidate || !isFiniteNormalizedPoint(candidate.center) || !isFiniteNormalizedRect(candidate.bounds) || !isFiniteUnitMetric(candidate.confidence)) {
    return null;
  }
  if (candidate.energy !== undefined && !isFiniteUnitMetric(candidate.energy)) return null;

  return {
    center: candidate.center,
    bounds: candidate.bounds,
    confidence: candidate.confidence,
    ...(candidate.energy === undefined ? null : { energy: candidate.energy }),
    ...(typeof candidate.reason === 'string' ? { reason: candidate.reason } : null)
  };
}

function normalizeDebug(debug: NativeVisualMassDebug | null | undefined): NativeVisualMassDebug | null {
  if (!debug) return null;
  if (
    !isFinitePositiveInteger(debug.gridWidth) ||
    !isFinitePositiveInteger(debug.gridHeight) ||
    !isFinitePositiveInteger(debug.heatmapWidth) ||
    !isFinitePositiveInteger(debug.heatmapHeight)
  ) {
    return null;
  }

  const cells = debug.cells.map(normalizeDebugCell);
  if (cells.some((cell) => cell === null)) return null;

  const topCandidates = debug.topCandidates.map(normalizeDebugCandidate);
  if (topCandidates.some((candidate) => candidate === null)) return null;

  const selectedCandidate = normalizeDebugCandidate(debug.selectedCandidate);
  const stabilizedCandidate = normalizeDebugCandidate(debug.stabilizedCandidate);

  return {
    gridWidth: debug.gridWidth,
    gridHeight: debug.gridHeight,
    heatmapWidth: debug.heatmapWidth,
    heatmapHeight: debug.heatmapHeight,
    cells: cells.filter((cell): cell is NativeVisualMassDebugCell => cell !== null),
    topCandidates: topCandidates.filter((candidate): candidate is NativeVisualMassDebugCandidate => candidate !== null).slice(0, NATIVE_VISUAL_MASS_DEBUG_TOP_CANDIDATE_LIMIT),
    selectedCandidate,
    stabilizedCandidate,
    explanation: typeof debug.explanation === 'string' ? debug.explanation : 'Visual mass is contrast/luminance evidence, not object detection.'
  };
}

function mapDebugCell(cell: NativeVisualMassDebugCell, mapping: NativeEvidencePreviewMapping | undefined): NativeVisualMassDebugCell | null {
  if (!mapping?.frameGeometry) return cell;

  const mappedRect = mapNormalizedFrameRectToPreviewRect(cell, mapping.frameGeometry, mapping.previewGeometry);
  if (!isFiniteNormalizedRect(mappedRect)) return null;

  return {
    ...mappedRect,
    energy: cell.energy
  };
}

function mapDebugCandidate(candidate: NativeVisualMassDebugCandidate | null, mapping: NativeEvidencePreviewMapping | undefined): NativeVisualMassDebugCandidate | null {
  if (!candidate || !mapping?.frameGeometry) return candidate;

  const center = mapNormalizedFramePointToPreviewPoint(candidate.center, mapping.frameGeometry, mapping.previewGeometry);
  const bounds = mapNormalizedFrameRectToPreviewRect(candidate.bounds, mapping.frameGeometry, mapping.previewGeometry);
  if (!isFiniteNormalizedPoint(center) || !isFiniteNormalizedRect(bounds)) return null;

  return {
    ...candidate,
    center,
    bounds
  };
}

function mapDebug(debug: NativeVisualMassDebug, mapping: NativeEvidencePreviewMapping | undefined): NativeVisualMassDebug | null {
  const mappedCells = debug.cells.map((cell) => mapDebugCell(cell, mapping));
  if (mappedCells.some((cell) => cell === null)) return null;

  const mappedTopCandidates = debug.topCandidates.map((candidate) => mapDebugCandidate(candidate, mapping));
  if (mappedTopCandidates.some((candidate) => candidate === null)) return null;

  return {
    ...debug,
    cells: mappedCells.filter((cell): cell is NativeVisualMassDebugCell => cell !== null),
    topCandidates: mappedTopCandidates.filter((candidate): candidate is NativeVisualMassDebugCandidate => candidate !== null),
    selectedCandidate: mapDebugCandidate(debug.selectedCandidate, mapping),
    stabilizedCandidate: mapDebugCandidate(debug.stabilizedCandidate, mapping)
  };
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

export function nativeVisualMassDebugOverlay(
  analysis: NativeFrameAnalysisResult | null | undefined,
  mapping?: NativeEvidencePreviewMapping
): NativeVisualMassDebugOverlay | null {
  if (analysis?.analysisSource !== 'live-frame') return null;

  const raw = normalizeDebug(analysis.visualMassDebug);
  if (!raw) return null;

  const mapped = mapDebug(raw, mapping);
  if (!mapped) return null;

  return { raw, mapped };
}
