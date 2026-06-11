import { describe, expect, it } from 'vitest';
import {
  mapNativeEvidenceToPreview,
  mapNormalizedFrameLineToPreviewLine,
  mapNormalizedFramePointToPreviewPoint,
  mapNormalizedFrameRectToPreviewRect,
  type NativeFrameGeometry,
  type PreviewGeometry
} from '../nativeEvidenceCoordinateMapping';
import type { NativeLineCandidate } from '../nativeHeuristicTypes';
import type { NativeFrameAnalysisResult } from '../nativeHeuristicTypes';
import type { NormalizedRect } from '../types';
import { normalizedHorizontalLineOverlayY, normalizedLineCandidateOverlaySegment } from '../nativeLineDiagnosticOverlay';

const matchedFrame: NativeFrameGeometry = {
  frameWidth: 400,
  frameHeight: 300,
  gridWidth: 32,
  gridHeight: 24,
  frameOrientation: 'up',
  isMirrored: false,
  createdAtMs: 1_000
};

const matchedPreview: PreviewGeometry = {
  width: 400,
  height: 300,
  resizeMode: 'cover'
};

function expectPointClose(actual: { x: number; y: number } | null, expected: { x: number; y: number }): void {
  expect(actual).not.toBeNull();
  expect(actual?.x).toBeCloseTo(expected.x, 6);
  expect(actual?.y).toBeCloseTo(expected.y, 6);
}

function expectRectClose(actual: NormalizedRect | null, expected: NormalizedRect): void {
  expect(actual).not.toBeNull();
  expect(actual?.x).toBeCloseTo(expected.x, 6);
  expect(actual?.y).toBeCloseTo(expected.y, 6);
  expect(actual?.width).toBeCloseTo(expected.width, 6);
  expect(actual?.height).toBeCloseTo(expected.height, 6);
}

function expectLineClose(actual: { x1: number; y1: number; x2: number; y2: number } | null, expected: { x1: number; y1: number; x2: number; y2: number }): void {
  expect(actual).not.toBeNull();
  expect(actual?.x1).toBeCloseTo(expected.x1, 6);
  expect(actual?.y1).toBeCloseTo(expected.y1, 6);
  expect(actual?.x2).toBeCloseTo(expected.x2, 6);
  expect(actual?.y2).toBeCloseTo(expected.y2, 6);
}

function makeLine(overrides: Partial<NativeLineCandidate> = {}): NativeLineCandidate {
  return {
    x1: 0.1,
    y1: 0.3,
    x2: 0.9,
    y2: 0.3,
    angleDeg: 0,
    confidence: 0.7,
    kind: 'horizontal-line',
    ...overrides
  };
}

describe('native evidence coordinate mapping', () => {
  it('maps identity orientation without changing point, rect, or line when aspect ratios match', () => {
    expectPointClose(mapNormalizedFramePointToPreviewPoint({ x: 0.25, y: 0.75 }, matchedFrame, matchedPreview), { x: 0.25, y: 0.75 });
    expectRectClose(mapNormalizedFrameRectToPreviewRect({ x: 0.1, y: 0.2, width: 0.3, height: 0.4 }, matchedFrame, matchedPreview), {
      x: 0.1,
      y: 0.2,
      width: 0.3,
      height: 0.4
    });
    expectLineClose(mapNormalizedFrameLineToPreviewLine(makeLine(), matchedFrame, matchedPreview), {
      x1: 0.1,
      y1: 0.3,
      x2: 0.9,
      y2: 0.3
    });
  });

  it('rotates points using installed VisionCamera orientation values', () => {
    const preview: PreviewGeometry = { width: 300, height: 400, resizeMode: 'cover' };

    expectPointClose(mapNormalizedFramePointToPreviewPoint({ x: 0.2, y: 0.25 }, { ...matchedFrame, frameOrientation: 'right' }, preview), {
      x: 0.25,
      y: 0.8
    });
    expectPointClose(mapNormalizedFramePointToPreviewPoint({ x: 0.2, y: 0.25 }, { ...matchedFrame, frameOrientation: 'left' }, preview), {
      x: 0.75,
      y: 0.2
    });
    expectPointClose(mapNormalizedFramePointToPreviewPoint({ x: 0.2, y: 0.25 }, { ...matchedFrame, frameOrientation: 'down' }, matchedPreview), {
      x: 0.8,
      y: 0.75
    });
  });

  it('rotates rects and line endpoints consistently with point mapping', () => {
    const preview: PreviewGeometry = { width: 300, height: 400, resizeMode: 'cover' };
    const frame = { ...matchedFrame, frameOrientation: 'right' as const };
    const rotatedLineCandidate = mapNativeEvidenceToPreview(
      {
        status: 'ready',
        createdAtMs: 1_000,
        frameWidth: 400,
        frameHeight: 300,
        gridWidth: 32,
        gridHeight: 24,
        frameOrientation: 'right',
        isMirrored: false,
        subject: null,
        lineCandidate: makeLine(),
        exposure: null,
        sharpness: null,
        explanation: 'test',
        analysisSource: 'live-frame'
      },
      preview
    ).mappedLineCandidate;

    expectRectClose(mapNormalizedFrameRectToPreviewRect({ x: 0.1, y: 0.2, width: 0.3, height: 0.4 }, frame, preview), {
      x: 0.2,
      y: 0.6,
      width: 0.4,
      height: 0.3
    });
    expectLineClose(mapNormalizedFrameLineToPreviewLine(makeLine(), frame, preview), {
      x1: 0.3,
      y1: 0.9,
      x2: 0.3,
      y2: 0.1
    });
    expect(rotatedLineCandidate?.kind).toBe('unknown-line');
    expectLineClose(normalizedLineCandidateOverlaySegment(rotatedLineCandidate), {
      x1: 0.3,
      y1: 0.9,
      x2: 0.3,
      y2: 0.1
    });
    expect(normalizedHorizontalLineOverlayY(rotatedLineCandidate)).toBeNull();
  });

  it('handles mirrored evidence without mutating raw input', () => {
    const point = { x: 0.2, y: 0.4 };
    const rect = { x: 0.1, y: 0.2, width: 0.2, height: 0.3 };
    const line = makeLine();
    const mirroredFrame = { ...matchedFrame, isMirrored: true };

    expectPointClose(mapNormalizedFramePointToPreviewPoint(point, mirroredFrame, matchedPreview), { x: 0.8, y: 0.4 });
    expectRectClose(mapNormalizedFrameRectToPreviewRect(rect, mirroredFrame, matchedPreview), { x: 0.7, y: 0.2, width: 0.2, height: 0.3 });
    expectLineClose(mapNormalizedFrameLineToPreviewLine(line, mirroredFrame, matchedPreview), { x1: 0.9, y1: 0.3, x2: 0.1, y2: 0.3 });
    expect(point).toEqual({ x: 0.2, y: 0.4 });
    expect(rect).toEqual({ x: 0.1, y: 0.2, width: 0.2, height: 0.3 });
    expect(line).toEqual(makeLine());
  });

  it('maps through aspect-fill cover crop offsets', () => {
    const squareFrame: NativeFrameGeometry = {
      frameWidth: 100,
      frameHeight: 100,
      gridWidth: 32,
      gridHeight: 24,
      frameOrientation: 'up',
      isMirrored: false,
      createdAtMs: 1_000
    };
    const widePreview: PreviewGeometry = { width: 100, height: 50, resizeMode: 'cover' };

    expectPointClose(mapNormalizedFramePointToPreviewPoint({ x: 0.5, y: 0 }, squareFrame, widePreview), { x: 0.5, y: -0.5 });
    expectPointClose(mapNormalizedFramePointToPreviewPoint({ x: 0.5, y: 0.5 }, squareFrame, widePreview), { x: 0.5, y: 0.5 });
    expectPointClose(mapNormalizedFramePointToPreviewPoint({ x: 0.5, y: 1 }, squareFrame, widePreview), { x: 0.5, y: 1.5 });
  });

  it('rejects invalid geometry or coordinates safely', () => {
    expect(mapNormalizedFramePointToPreviewPoint({ x: Number.NaN, y: 0.5 }, matchedFrame, matchedPreview)).toBeNull();
    expect(mapNormalizedFramePointToPreviewPoint({ x: 0.5, y: Number.POSITIVE_INFINITY }, matchedFrame, matchedPreview)).toBeNull();
    expect(mapNormalizedFramePointToPreviewPoint({ x: 0.5, y: 0.5 }, { ...matchedFrame, frameWidth: 0 }, matchedPreview)).toBeNull();
    expect(mapNormalizedFramePointToPreviewPoint({ x: 0.5, y: 0.5 }, matchedFrame, { ...matchedPreview, height: 0 })).toBeNull();
    expect(mapNormalizedFrameRectToPreviewRect({ x: 0.1, y: 0.2, width: Number.NaN, height: 0.4 }, matchedFrame, matchedPreview)).toBeNull();
    expect(mapNormalizedFrameLineToPreviewLine(makeLine({ y1: Number.NEGATIVE_INFINITY }), matchedFrame, matchedPreview)).toBeNull();
  });

  it('does not make a horizontal raw line vertical unless orientation mapping explicitly requires it', () => {
    const rawLine = makeLine({ x1: 0, y1: 0.4, x2: 1, y2: 0.4 });
    const unmovedLine = mapNormalizedFrameLineToPreviewLine(rawLine, matchedFrame, matchedPreview);
    const rotatedLine = mapNormalizedFrameLineToPreviewLine(rawLine, { ...matchedFrame, frameOrientation: 'right' }, { width: 300, height: 400 });

    expect(unmovedLine?.y1).toBeCloseTo(unmovedLine?.y2 ?? -1, 6);
    expect(unmovedLine?.x1).not.toBeCloseTo(unmovedLine?.x2 ?? -1, 6);
    expect(rotatedLine?.x1).toBeCloseTo(rotatedLine?.x2 ?? -1, 6);
    expect(rotatedLine?.y1).not.toBeCloseTo(rotatedLine?.y2 ?? -1, 6);
  });

  it('keeps raw and mapped native evidence side by side', () => {
    const analysis: NativeFrameAnalysisResult = {
      status: 'ready',
      createdAtMs: 1_000,
      frameWidth: 400,
      frameHeight: 300,
      gridWidth: 32,
      gridHeight: 24,
      frameOrientation: 'right',
      isMirrored: false,
      subject: {
        source: 'native-heuristic',
        center: { x: 0.2, y: 0.25 },
        bounds: { x: 0.1, y: 0.2, width: 0.3, height: 0.4 },
        confidence: 0.7
      },
      lineCandidate: makeLine(),
      exposure: null,
      sharpness: null,
      explanation: 'test',
      analysisSource: 'live-frame'
    };

    const evidence = mapNativeEvidenceToPreview(analysis, { width: 300, height: 400, resizeMode: 'cover' });

    expect(evidence.rawVisualMassCenter).toEqual({ x: 0.2, y: 0.25 });
    expectPointClose(evidence.mappedVisualMassCenter, { x: 0.25, y: 0.8 });
    expectRectClose(evidence.rawVisualMassBounds, { x: 0.1, y: 0.2, width: 0.3, height: 0.4 });
    expectRectClose(evidence.mappedVisualMassBounds, { x: 0.2, y: 0.6, width: 0.4, height: 0.3 });
    expect(evidence.rawLineCandidate).toEqual(makeLine());
    expectLineClose(evidence.mappedLineCandidate, { x1: 0.3, y1: 0.9, x2: 0.3, y2: 0.1 });
  });
});
