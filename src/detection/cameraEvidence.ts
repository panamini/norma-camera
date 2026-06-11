import type { NativeEvidencePreviewMapping, NormalizedLineSegment } from './nativeEvidenceCoordinateMapping';
import type { NativeFrameAnalysisResult, NativeLineCandidate, NativeVisualMassDebug } from './nativeHeuristicTypes';
import { nativeVisualMassDebugOverlay } from './nativeVisualMassOverlay';
import type { NormalizedPoint, NormalizedRect } from './types';

export type CameraEvidenceSource = 'manual' | 'native-visual-mass' | 'native-line-signal' | 'simulated' | 'placeholder';
export type CameraEvidenceSpace = 'raw-frame' | 'preview';
export type CameraEvidenceKind = 'point' | 'rect' | 'line-segment' | 'heatmap';
export type CameraEvidencePurpose = 'scoring' | 'debug-only';
export type LineSegmentOrientationKind = 'horizontal' | 'vertical' | 'diagonal' | 'unknown';

export type CameraEvidenceBase = {
  id: string;
  source: CameraEvidenceSource;
  kind: CameraEvidenceKind;
  space: CameraEvidenceSpace;
  purpose: CameraEvidencePurpose;
  confidence: number | null;
  createdAtMs: number | null;
  explanation?: string;
};

export type CameraPointEvidence = CameraEvidenceBase & {
  kind: 'point';
  point: NormalizedPoint;
};

export type CameraRectEvidence = CameraEvidenceBase & {
  kind: 'rect';
  rect: NormalizedRect;
};

export type CameraLineSegmentEvidence = CameraEvidenceBase & {
  kind: 'line-segment';
  line: NormalizedLineSegment;
  angleDeg: number | null;
  lengthNormalized: number;
  orientationKind: LineSegmentOrientationKind;
  lineKind: NativeLineCandidate['kind'];
};

export type CameraHeatmapSummary = {
  gridWidth: number;
  gridHeight: number;
  heatmapWidth: number;
  heatmapHeight: number;
  cellCount: number;
  topCandidateCount: number;
  selectedCenter: NormalizedPoint | null;
  stabilizedCenter: NormalizedPoint | null;
};

export type CameraHeatmapEvidence = CameraEvidenceBase & {
  kind: 'heatmap';
  heatmap: CameraHeatmapSummary;
};

export type CameraEvidence = CameraPointEvidence | CameraRectEvidence | CameraLineSegmentEvidence | CameraHeatmapEvidence;

export type CameraEvidenceSnapshot = {
  createdAtMs: number | null;
  raw: CameraEvidence[];
  mapped: CameraEvidence[];
  scoring: CameraEvidence[];
  debugOnly: CameraEvidence[];
};

export type CameraEvidenceFromNativeAnalysisInput = {
  analysis: NativeFrameAnalysisResult | null | undefined;
  nativeEvidenceMapping?: NativeEvidencePreviewMapping | null;
  createdAtMs?: number | null;
};

export type CameraEvidenceFromManualSubjectInput = {
  manualSubject: NormalizedPoint | null | undefined;
  createdAtMs: number | null;
};

export type BuildCameraEvidenceSnapshotInput = {
  nativeAnalysis?: NativeFrameAnalysisResult | null;
  nativeEvidenceMapping?: NativeEvidencePreviewMapping | null;
  manualSubject?: NormalizedPoint | null;
  createdAtMs?: number | null;
};

const NATIVE_VISUAL_MASS_EXPLANATION = 'Native visual mass signal from contrast/luminance analysis; not object detection.';
const NATIVE_LINE_SIGNAL_EXPLANATION = 'Native line signal is geometric evidence, not object recognition.';
const MANUAL_SUBJECT_EXPLANATION = 'Manual subject point selected by the user.';
const VISUAL_MASS_HEATMAP_EXPLANATION = 'Visual mass heatmap summarizes contrast/luminance evidence; not object detection.';
const MAPPED_EVIDENCE_COORDINATE_LIMIT = 16;

function isFiniteNumber(value: number | null | undefined): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function isFiniteUnitNumber(value: number | null | undefined): value is number {
  return isFiniteNumber(value) && value >= 0 && value <= 1;
}

function finiteCreatedAtMs(value: number | null | undefined): number | null {
  return isFiniteNumber(value) ? value : null;
}

function finiteConfidence(value: number | null | undefined): number | null {
  return isFiniteUnitNumber(value) ? value : null;
}

function isFiniteMappedNumber(value: number | null | undefined): value is number {
  return isFiniteNumber(value) && Math.abs(value) <= MAPPED_EVIDENCE_COORDINATE_LIMIT;
}

function evidenceId(prefix: string, space: CameraEvidenceSpace, createdAtMs: number | null): string {
  return `${prefix}-${space}-${createdAtMs ?? 'unknown'}`;
}

function isFinitePoint(point: NormalizedPoint | null | undefined): point is NormalizedPoint {
  return Boolean(point) && isFiniteNumber(point?.x) && isFiniteNumber(point?.y);
}

function isFiniteMappedPoint(point: NormalizedPoint | null | undefined): point is NormalizedPoint {
  return Boolean(point) && isFiniteMappedNumber(point?.x) && isFiniteMappedNumber(point?.y);
}

function isFiniteUnitPoint(point: NormalizedPoint | null | undefined): point is NormalizedPoint {
  return Boolean(point) && isFiniteUnitNumber(point?.x) && isFiniteUnitNumber(point?.y);
}

function isFiniteRect(rect: NormalizedRect | null | undefined): rect is NormalizedRect {
  return Boolean(rect) && isFiniteNumber(rect?.x) && isFiniteNumber(rect?.y) && isFiniteNumber(rect?.width) && isFiniteNumber(rect?.height);
}

function isFiniteMappedRect(rect: NormalizedRect | null | undefined): rect is NormalizedRect {
  return (
    Boolean(rect) &&
    isFiniteMappedNumber(rect?.x) &&
    isFiniteMappedNumber(rect?.y) &&
    isFiniteMappedNumber(rect?.width) &&
    isFiniteMappedNumber(rect?.height)
  );
}

function isFiniteUnitRect(rect: NormalizedRect | null | undefined): rect is NormalizedRect {
  return (
    Boolean(rect) &&
    isFiniteUnitNumber(rect?.x) &&
    isFiniteUnitNumber(rect?.y) &&
    isFiniteUnitNumber(rect?.width) &&
    isFiniteUnitNumber(rect?.height) &&
    rect.width > 0 &&
    rect.height > 0 &&
    rect.x + rect.width <= 1 &&
    rect.y + rect.height <= 1
  );
}

function isFiniteLineSegment(line: NormalizedLineSegment | null | undefined): line is NormalizedLineSegment {
  return Boolean(line) && isFiniteNumber(line?.x1) && isFiniteNumber(line?.y1) && isFiniteNumber(line?.x2) && isFiniteNumber(line?.y2);
}

function isFiniteMappedLineSegment(line: NormalizedLineSegment | null | undefined): line is NormalizedLineSegment {
  return (
    Boolean(line) &&
    isFiniteMappedNumber(line?.x1) &&
    isFiniteMappedNumber(line?.y1) &&
    isFiniteMappedNumber(line?.x2) &&
    isFiniteMappedNumber(line?.y2)
  );
}

function isFiniteUnitLineSegment(line: NormalizedLineSegment | null | undefined): line is NormalizedLineSegment {
  return Boolean(line) && isFiniteUnitNumber(line?.x1) && isFiniteUnitNumber(line?.y1) && isFiniteUnitNumber(line?.x2) && isFiniteUnitNumber(line?.y2);
}

function lineLengthNormalized(line: NormalizedLineSegment): number {
  return Math.hypot(line.x2 - line.x1, line.y2 - line.y1);
}

function lineAngleDeg(line: NormalizedLineSegment): number | null {
  const length = lineLengthNormalized(line);
  if (!isFiniteNumber(length) || length === 0) return null;

  return (Math.atan2(line.y2 - line.y1, line.x2 - line.x1) * 180) / Math.PI;
}

function lineOrientationKind(line: NormalizedLineSegment): LineSegmentOrientationKind {
  const angle = lineAngleDeg(line);
  if (angle === null) return 'unknown';

  const absoluteAngle = Math.abs(angle);
  const horizontalDistance = Math.min(absoluteAngle, Math.abs(180 - absoluteAngle));
  const verticalDistance = Math.abs(90 - absoluteAngle);
  if (horizontalDistance <= 15) return 'horizontal';
  if (verticalDistance <= 15) return 'vertical';

  return 'diagonal';
}

function snapshotFromEvidence(createdAtMs: number | null, raw: CameraEvidence[], mapped: CameraEvidence[]): CameraEvidenceSnapshot {
  const all = [...raw, ...mapped];

  return {
    createdAtMs,
    raw,
    mapped,
    scoring: all.filter((evidence) => evidence.purpose === 'scoring'),
    debugOnly: all.filter((evidence) => evidence.purpose === 'debug-only')
  };
}

function makeVisualMassPointEvidence(params: {
  point: NormalizedPoint;
  space: CameraEvidenceSpace;
  confidence: number | null;
  createdAtMs: number | null;
}): CameraPointEvidence {
  return {
    id: evidenceId('native-visual-mass-center', params.space, params.createdAtMs),
    source: 'native-visual-mass',
    kind: 'point',
    space: params.space,
    purpose: 'scoring',
    confidence: params.confidence,
    createdAtMs: params.createdAtMs,
    explanation: NATIVE_VISUAL_MASS_EXPLANATION,
    point: params.point
  };
}

function makeVisualMassRectEvidence(params: {
  rect: NormalizedRect;
  space: CameraEvidenceSpace;
  confidence: number | null;
  createdAtMs: number | null;
}): CameraRectEvidence {
  return {
    id: evidenceId('native-visual-mass-bounds', params.space, params.createdAtMs),
    source: 'native-visual-mass',
    kind: 'rect',
    space: params.space,
    purpose: 'debug-only',
    confidence: params.confidence,
    createdAtMs: params.createdAtMs,
    explanation: NATIVE_VISUAL_MASS_EXPLANATION,
    rect: params.rect
  };
}

function makeLineEvidence(params: {
  line: NativeLineCandidate;
  space: CameraEvidenceSpace;
  confidence: number | null;
  createdAtMs: number | null;
}): CameraLineSegmentEvidence {
  const line = {
    x1: params.line.x1,
    y1: params.line.y1,
    x2: params.line.x2,
    y2: params.line.y2
  };

  return {
    id: evidenceId('native-line-signal', params.space, params.createdAtMs),
    source: 'native-line-signal',
    kind: 'line-segment',
    space: params.space,
    purpose: 'scoring',
    confidence: params.confidence,
    createdAtMs: params.createdAtMs,
    explanation: NATIVE_LINE_SIGNAL_EXPLANATION,
    line,
    angleDeg: lineAngleDeg(line),
    lengthNormalized: lineLengthNormalized(line),
    orientationKind: lineOrientationKind(line),
    lineKind: params.line.kind
  };
}

function makeManualPointEvidence(point: NormalizedPoint, createdAtMs: number | null): CameraPointEvidence {
  return {
    id: evidenceId('manual-subject', 'preview', createdAtMs),
    source: 'manual',
    kind: 'point',
    space: 'preview',
    purpose: 'scoring',
    confidence: 1,
    createdAtMs,
    explanation: MANUAL_SUBJECT_EXPLANATION,
    point
  };
}

function heatmapConfidence(debug: NativeVisualMassDebug): number | null {
  return finiteConfidence(debug.stabilizedCandidate?.confidence ?? debug.selectedCandidate?.confidence ?? null);
}

function heatmapSummary(debug: NativeVisualMassDebug): CameraHeatmapSummary {
  return {
    gridWidth: debug.gridWidth,
    gridHeight: debug.gridHeight,
    heatmapWidth: debug.heatmapWidth,
    heatmapHeight: debug.heatmapHeight,
    cellCount: debug.cells.length,
    topCandidateCount: debug.topCandidates.length,
    selectedCenter: isFinitePoint(debug.selectedCandidate?.center) ? debug.selectedCandidate.center : null,
    stabilizedCenter: isFinitePoint(debug.stabilizedCandidate?.center) ? debug.stabilizedCandidate.center : null
  };
}

function makeHeatmapEvidence(params: {
  debug: NativeVisualMassDebug;
  space: CameraEvidenceSpace;
  createdAtMs: number | null;
}): CameraHeatmapEvidence {
  return {
    id: evidenceId('native-visual-mass-heatmap', params.space, params.createdAtMs),
    source: 'native-visual-mass',
    kind: 'heatmap',
    space: params.space,
    purpose: 'debug-only',
    confidence: heatmapConfidence(params.debug),
    createdAtMs: params.createdAtMs,
    explanation: params.debug.explanation || VISUAL_MASS_HEATMAP_EXPLANATION,
    heatmap: heatmapSummary(params.debug)
  };
}

export function cameraEvidenceFromManualSubject(input: CameraEvidenceFromManualSubjectInput): CameraEvidenceSnapshot {
  const createdAtMs = finiteCreatedAtMs(input.createdAtMs);
  if (!isFiniteUnitPoint(input.manualSubject)) {
    return snapshotFromEvidence(createdAtMs, [], []);
  }

  return snapshotFromEvidence(createdAtMs, [], [makeManualPointEvidence(input.manualSubject, createdAtMs)]);
}

export function cameraEvidenceFromNativeAnalysis(input: CameraEvidenceFromNativeAnalysisInput): CameraEvidenceSnapshot {
  const analysis = input.analysis ?? null;
  const createdAtMs = finiteCreatedAtMs(input.createdAtMs ?? analysis?.createdAtMs);
  if (!analysis || analysis.analysisSource !== 'live-frame') {
    return snapshotFromEvidence(createdAtMs, [], []);
  }

  const raw: CameraEvidence[] = [];
  const mapped: CameraEvidence[] = [];
  const subjectConfidence = finiteConfidence(analysis.subject?.confidence);

  if (isFiniteUnitPoint(analysis.subject?.center)) {
    raw.push(
      makeVisualMassPointEvidence({
        point: analysis.subject.center,
        space: 'raw-frame',
        confidence: subjectConfidence,
        createdAtMs
      })
    );
  }

  if (isFiniteUnitRect(analysis.subject?.bounds)) {
    raw.push(
      makeVisualMassRectEvidence({
        rect: analysis.subject.bounds,
        space: 'raw-frame',
        confidence: subjectConfidence,
        createdAtMs
      })
    );
  }

  if (isFiniteUnitLineSegment(analysis.lineCandidate)) {
    raw.push(
      makeLineEvidence({
        line: analysis.lineCandidate,
        space: 'raw-frame',
        confidence: finiteConfidence(analysis.lineCandidate.confidence),
        createdAtMs
      })
    );
  }

  const mapping = input.nativeEvidenceMapping ?? null;
  if (isFiniteMappedPoint(mapping?.mappedVisualMassCenter)) {
    mapped.push(
      makeVisualMassPointEvidence({
        point: mapping.mappedVisualMassCenter,
        space: 'preview',
        confidence: subjectConfidence,
        createdAtMs
      })
    );
  }

  if (isFiniteMappedRect(mapping?.mappedVisualMassBounds)) {
    mapped.push(
      makeVisualMassRectEvidence({
        rect: mapping.mappedVisualMassBounds,
        space: 'preview',
        confidence: subjectConfidence,
        createdAtMs
      })
    );
  }

  if (mapping?.mappedLineCandidate && isFiniteMappedLineSegment(mapping.mappedLineCandidate)) {
    mapped.push(
      makeLineEvidence({
        line: mapping.mappedLineCandidate,
        space: 'preview',
        confidence: finiteConfidence(mapping.mappedLineCandidate.confidence),
        createdAtMs
      })
    );
  }

  const debugOverlay = nativeVisualMassDebugOverlay(analysis, mapping ?? undefined);
  if (debugOverlay) {
    raw.push(makeHeatmapEvidence({ debug: debugOverlay.raw, space: 'raw-frame', createdAtMs }));
    if (mapping) {
      mapped.push(makeHeatmapEvidence({ debug: debugOverlay.mapped, space: 'preview', createdAtMs }));
    }
  }

  return snapshotFromEvidence(createdAtMs, raw, mapped);
}

export function buildCameraEvidenceSnapshot(input: BuildCameraEvidenceSnapshotInput): CameraEvidenceSnapshot {
  const createdAtMs = finiteCreatedAtMs(input.createdAtMs ?? input.nativeAnalysis?.createdAtMs ?? null);
  const nativeSnapshot = cameraEvidenceFromNativeAnalysis({
    analysis: input.nativeAnalysis,
    nativeEvidenceMapping: input.nativeEvidenceMapping,
    createdAtMs
  });
  const manualSnapshot = cameraEvidenceFromManualSubject({
    manualSubject: input.manualSubject,
    createdAtMs
  });

  return snapshotFromEvidence(createdAtMs, [...nativeSnapshot.raw, ...manualSnapshot.raw], [...manualSnapshot.mapped, ...nativeSnapshot.mapped]);
}
