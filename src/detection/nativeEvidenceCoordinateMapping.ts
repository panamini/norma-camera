import type { NormalizedPoint } from '../composition/types';
import type { NativeFrameAnalysisResult, NativeFrameOrientation, NativeLineCandidate } from './nativeHeuristicTypes';
import type { NormalizedRect } from './types';

export type { NativeFrameOrientation };
export type PreviewResizeMode = 'cover' | 'contain';

export type NativeFrameGeometry = {
  frameWidth: number;
  frameHeight: number;
  gridWidth?: number;
  gridHeight?: number;
  frameOrientation?: NativeFrameOrientation | null;
  isMirrored?: boolean | null;
  createdAtMs?: number;
};

export type PreviewGeometry = {
  width: number;
  height: number;
  resizeMode?: PreviewResizeMode;
};

export type NormalizedLineSegment = {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
};

export type PreviewFrameTransform = {
  presentedFrameWidth: number;
  presentedFrameHeight: number;
  scale: number;
  offsetX: number;
  offsetY: number;
  renderedWidth: number;
  renderedHeight: number;
  resizeMode: PreviewResizeMode;
};

export type NativeEvidencePreviewMapping = {
  frameGeometry: NativeFrameGeometry | null;
  previewGeometry: PreviewGeometry;
  transform: PreviewFrameTransform | null;
  rawLineCandidate: NativeLineCandidate | null;
  mappedLineCandidate: NativeLineCandidate | null;
  rawVisualMassCenter: NormalizedPoint | null;
  mappedVisualMassCenter: NormalizedPoint | null;
  rawVisualMassBounds: NormalizedRect | null;
  mappedVisualMassBounds: NormalizedRect | null;
};

function isFiniteNumber(value: number | undefined | null): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function hasPositiveFiniteSize(width: number, height: number): boolean {
  return isFiniteNumber(width) && isFiniteNumber(height) && width > 0 && height > 0;
}

function isFinitePoint(point: NormalizedPoint | null | undefined): point is NormalizedPoint {
  return Boolean(point) && isFiniteNumber(point?.x) && isFiniteNumber(point?.y);
}

function isFiniteRect(rect: NormalizedRect | null | undefined): rect is NormalizedRect {
  return Boolean(rect) && isFiniteNumber(rect?.x) && isFiniteNumber(rect?.y) && isFiniteNumber(rect?.width) && isFiniteNumber(rect?.height);
}

function isFiniteLine(line: NormalizedLineSegment | null | undefined): line is NormalizedLineSegment {
  return Boolean(line) && isFiniteNumber(line?.x1) && isFiniteNumber(line?.y1) && isFiniteNumber(line?.x2) && isFiniteNumber(line?.y2);
}

export function isNativeFrameOrientation(value: unknown): value is NativeFrameOrientation {
  return value === 'up' || value === 'right' || value === 'down' || value === 'left';
}

function resolveFrameOrientation(orientation: NativeFrameGeometry['frameOrientation']): NativeFrameOrientation {
  return isNativeFrameOrientation(orientation) ? orientation : 'up';
}

function mapPointToPresentedFrame(point: NormalizedPoint, orientation: NativeFrameOrientation, isMirrored: boolean): NormalizedPoint {
  let presentedPoint: NormalizedPoint;

  switch (orientation) {
    case 'right':
      presentedPoint = { x: point.y, y: 1 - point.x };
      break;
    case 'left':
      presentedPoint = { x: 1 - point.y, y: point.x };
      break;
    case 'down':
      presentedPoint = { x: 1 - point.x, y: 1 - point.y };
      break;
    case 'up':
      presentedPoint = { x: point.x, y: point.y };
      break;
  }

  return isMirrored ? { x: 1 - presentedPoint.x, y: presentedPoint.y } : presentedPoint;
}

export function getPresentedFrameSize(frame: NativeFrameGeometry): { width: number; height: number } | null {
  if (!hasPositiveFiniteSize(frame.frameWidth, frame.frameHeight)) return null;

  const orientation = resolveFrameOrientation(frame.frameOrientation);
  if (orientation === 'left' || orientation === 'right') {
    return { width: frame.frameHeight, height: frame.frameWidth };
  }

  return { width: frame.frameWidth, height: frame.frameHeight };
}

export function getPreviewFrameTransform(frame: NativeFrameGeometry, preview: PreviewGeometry): PreviewFrameTransform | null {
  const presentedSize = getPresentedFrameSize(frame);
  if (!presentedSize || !hasPositiveFiniteSize(preview.width, preview.height)) return null;

  const resizeMode = preview.resizeMode ?? 'cover';
  const widthScale = preview.width / presentedSize.width;
  const heightScale = preview.height / presentedSize.height;
  const scale = resizeMode === 'contain' ? Math.min(widthScale, heightScale) : Math.max(widthScale, heightScale);
  const renderedWidth = presentedSize.width * scale;
  const renderedHeight = presentedSize.height * scale;

  return {
    presentedFrameWidth: presentedSize.width,
    presentedFrameHeight: presentedSize.height,
    scale,
    offsetX: (preview.width - renderedWidth) / 2,
    offsetY: (preview.height - renderedHeight) / 2,
    renderedWidth,
    renderedHeight,
    resizeMode
  };
}

export function nativeFrameGeometryFromAnalysis(analysis: NativeFrameAnalysisResult | null | undefined): NativeFrameGeometry | null {
  if (!analysis || !hasPositiveFiniteSize(analysis.frameWidth ?? 0, analysis.frameHeight ?? 0)) return null;

  return {
    frameWidth: analysis.frameWidth ?? 0,
    frameHeight: analysis.frameHeight ?? 0,
    gridWidth: isFiniteNumber(analysis.gridWidth) ? analysis.gridWidth : undefined,
    gridHeight: isFiniteNumber(analysis.gridHeight) ? analysis.gridHeight : undefined,
    frameOrientation: isNativeFrameOrientation(analysis.frameOrientation) ? analysis.frameOrientation : null,
    isMirrored: typeof analysis.isMirrored === 'boolean' ? analysis.isMirrored : null,
    createdAtMs: analysis.createdAtMs
  };
}

export function mapNormalizedFramePointToPreviewPoint(
  point: NormalizedPoint | null | undefined,
  frame: NativeFrameGeometry,
  preview: PreviewGeometry
): NormalizedPoint | null {
  if (!isFinitePoint(point)) return null;

  const transform = getPreviewFrameTransform(frame, preview);
  if (!transform) return null;

  const presentedPoint = mapPointToPresentedFrame(point, resolveFrameOrientation(frame.frameOrientation), frame.isMirrored === true);
  const previewX = (presentedPoint.x * transform.presentedFrameWidth * transform.scale + transform.offsetX) / preview.width;
  const previewY = (presentedPoint.y * transform.presentedFrameHeight * transform.scale + transform.offsetY) / preview.height;

  return { x: previewX, y: previewY };
}

export function mapNormalizedFrameRectToPreviewRect(
  rect: NormalizedRect | null | undefined,
  frame: NativeFrameGeometry,
  preview: PreviewGeometry
): NormalizedRect | null {
  if (!isFiniteRect(rect)) return null;

  const corners = [
    { x: rect.x, y: rect.y },
    { x: rect.x + rect.width, y: rect.y },
    { x: rect.x, y: rect.y + rect.height },
    { x: rect.x + rect.width, y: rect.y + rect.height }
  ].map((corner) => mapNormalizedFramePointToPreviewPoint(corner, frame, preview));

  if (corners.some((corner) => corner === null)) return null;

  const xs = corners.map((corner) => corner?.x ?? 0);
  const ys = corners.map((corner) => corner?.y ?? 0);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);

  return {
    x: minX,
    y: minY,
    width: maxX - minX,
    height: maxY - minY
  };
}

export function mapNormalizedFrameLineToPreviewLine(
  line: NormalizedLineSegment | null | undefined,
  frame: NativeFrameGeometry,
  preview: PreviewGeometry
): NormalizedLineSegment | null {
  if (!isFiniteLine(line)) return null;

  const p1 = mapNormalizedFramePointToPreviewPoint({ x: line.x1, y: line.y1 }, frame, preview);
  const p2 = mapNormalizedFramePointToPreviewPoint({ x: line.x2, y: line.y2 }, frame, preview);
  if (!p1 || !p2) return null;

  return {
    x1: p1.x,
    y1: p1.y,
    x2: p2.x,
    y2: p2.y
  };
}

function lineAngleDeg(line: NormalizedLineSegment): number {
  return (Math.atan2(line.y2 - line.y1, line.x2 - line.x1) * 180) / Math.PI;
}

export function mapNativeLineCandidateToPreviewLineCandidate(
  lineCandidate: NativeLineCandidate | null | undefined,
  frame: NativeFrameGeometry,
  preview: PreviewGeometry
): NativeLineCandidate | null {
  const mappedLine = mapNormalizedFrameLineToPreviewLine(lineCandidate, frame, preview);
  if (!lineCandidate || !mappedLine) return null;

  return {
    ...lineCandidate,
    ...mappedLine,
    angleDeg: lineAngleDeg(mappedLine)
  };
}

export function mapNativeEvidenceToPreview(
  analysis: NativeFrameAnalysisResult | null | undefined,
  previewGeometry: PreviewGeometry
): NativeEvidencePreviewMapping {
  const frameGeometry = nativeFrameGeometryFromAnalysis(analysis);
  const transform = frameGeometry ? getPreviewFrameTransform(frameGeometry, previewGeometry) : null;
  const rawLineCandidate = analysis?.lineCandidate ?? null;
  const rawVisualMassCenter = analysis?.subject?.center ?? null;
  const rawVisualMassBounds = analysis?.subject?.bounds ?? null;

  return {
    frameGeometry,
    previewGeometry,
    transform,
    rawLineCandidate,
    mappedLineCandidate: frameGeometry ? mapNativeLineCandidateToPreviewLineCandidate(rawLineCandidate, frameGeometry, previewGeometry) : null,
    rawVisualMassCenter,
    mappedVisualMassCenter:
      frameGeometry && rawVisualMassCenter ? mapNormalizedFramePointToPreviewPoint(rawVisualMassCenter, frameGeometry, previewGeometry) : null,
    rawVisualMassBounds,
    mappedVisualMassBounds: frameGeometry && rawVisualMassBounds ? mapNormalizedFrameRectToPreviewRect(rawVisualMassBounds, frameGeometry, previewGeometry) : null
  };
}
