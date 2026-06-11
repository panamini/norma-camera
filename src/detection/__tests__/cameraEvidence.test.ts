import { describe, expect, it } from 'vitest';
import {
  buildCameraEvidenceSnapshot,
  cameraEvidenceFromManualSubject,
  cameraEvidenceFromNativeAnalysis,
  type CameraEvidence,
  type CameraLineSegmentEvidence,
  type CameraPointEvidence
} from '../cameraEvidence';
import { mapNativeEvidenceToPreview } from '../nativeEvidenceCoordinateMapping';
import type { NativeEvidencePreviewMapping } from '../nativeEvidenceCoordinateMapping';
import type { NativeFrameAnalysisResult, NativeLineCandidate, NativeVisualMassDebug } from '../nativeHeuristicTypes';
import { scoreDetectedComposition } from '../scoreDetectedComposition';
import type { CompositionCandidate } from '../types';

function makeLine(overrides: Partial<NativeLineCandidate> = {}): NativeLineCandidate {
  return {
    x1: 0.1,
    y1: 0.3,
    x2: 0.9,
    y2: 0.3,
    angleDeg: 0,
    confidence: 0.72,
    kind: 'horizontal-line',
    ...overrides
  };
}

function makeVisualMassDebug(overrides: Partial<NativeVisualMassDebug> = {}): NativeVisualMassDebug {
  return {
    gridWidth: 32,
    gridHeight: 24,
    heatmapWidth: 8,
    heatmapHeight: 6,
    cells: [{ x: 0.125, y: 0.167, width: 0.125, height: 0.167, energy: 0.86 }],
    topCandidates: [
      {
        center: { x: 0.188, y: 0.25 },
        bounds: { x: 0.125, y: 0.167, width: 0.125, height: 0.167 },
        confidence: 0.42,
        energy: 0.86,
        reason: 'coarse luma/contrast energy'
      }
    ],
    selectedCandidate: {
      center: { x: 0.188, y: 0.25 },
      bounds: { x: 0.125, y: 0.167, width: 0.125, height: 0.167 },
      confidence: 0.42,
      energy: 0.86,
      reason: 'highest coarse luma/contrast energy'
    },
    stabilizedCandidate: {
      center: { x: 0.2, y: 0.3 },
      bounds: { x: 0.12, y: 0.2, width: 0.16, height: 0.22 },
      confidence: 0.38,
      energy: 0.86,
      reason: 'stabilized visual mass'
    },
    explanation: 'Visual mass is contrast/luminance evidence, not object detection.',
    ...overrides
  };
}

function makeAnalysis(overrides: Partial<NativeFrameAnalysisResult> = {}): NativeFrameAnalysisResult {
  return {
    status: 'ready',
    createdAtMs: 10_000,
    frameWidth: 400,
    frameHeight: 300,
    gridWidth: 32,
    gridHeight: 24,
    frameOrientation: 'right',
    isMirrored: false,
    subject: {
      source: 'native-heuristic',
      center: { x: 0.2, y: 0.3 },
      bounds: { x: 0.12, y: 0.2, width: 0.16, height: 0.22 },
      confidence: 0.38
    },
    lineCandidate: makeLine(),
    exposure: { exposureScore: 72, meanLuma: 0.48, clippedHighlightsRatio: 0.01, crushedShadowsRatio: 0.02 },
    sharpness: { sharpnessScore: 68, edgeEnergy: 0.12 },
    explanation: 'Real luminance analysis. No recognition is used.',
    analysisSource: 'live-frame',
    visualMassDebug: makeVisualMassDebug(),
    ...overrides
  };
}

function findEvidence(snapshotEvidence: CameraEvidence[], kind: CameraEvidence['kind'], source: CameraEvidence['source']): CameraEvidence {
  const evidence = snapshotEvidence.find((item) => item.kind === kind && item.source === source);
  expect(evidence).toBeDefined();
  return evidence as CameraEvidence;
}

function evidenceText(evidence: CameraEvidence[]): string {
  return evidence.map((item) => item.explanation ?? '').join('\n');
}

describe('camera evidence model', () => {
  it('converts native visual mass subject into raw point and rect evidence', () => {
    const snapshot = cameraEvidenceFromNativeAnalysis({ analysis: makeAnalysis({ visualMassDebug: null }) });

    const point = findEvidence(snapshot.raw, 'point', 'native-visual-mass');
    const rect = findEvidence(snapshot.raw, 'rect', 'native-visual-mass');

    expect(point).toMatchObject({
      source: 'native-visual-mass',
      kind: 'point',
      space: 'raw-frame',
      purpose: 'scoring',
      confidence: 0.38,
      createdAtMs: 10_000
    });
    expect((point as CameraPointEvidence).point).toEqual({ x: 0.2, y: 0.3 });
    expect(rect).toMatchObject({
      source: 'native-visual-mass',
      kind: 'rect',
      space: 'raw-frame',
      purpose: 'debug-only',
      confidence: 0.38
    });
  });

  it('keeps mapped visual mass evidence separate from raw frame evidence', () => {
    const analysis = makeAnalysis({ visualMassDebug: null });
    const snapshot = cameraEvidenceFromNativeAnalysis({
      analysis,
      nativeEvidenceMapping: mapNativeEvidenceToPreview(analysis, { width: 300, height: 400, resizeMode: 'cover' })
    });

    const rawPoint = findEvidence(snapshot.raw, 'point', 'native-visual-mass') as CameraPointEvidence;
    const mappedPoint = findEvidence(snapshot.mapped, 'point', 'native-visual-mass') as CameraPointEvidence;

    expect(rawPoint.space).toBe('raw-frame');
    expect(rawPoint.point).toEqual({ x: 0.2, y: 0.3 });
    expect(mappedPoint.space).toBe('preview');
    expect(mappedPoint.point.x).toBeCloseTo(0.3, 6);
    expect(mappedPoint.point.y).toBeCloseTo(0.8, 6);
  });

  it('converts native line candidate into line-segment evidence', () => {
    const snapshot = cameraEvidenceFromNativeAnalysis({
      analysis: makeAnalysis({ lineCandidate: makeLine({ angleDeg: 42 }), visualMassDebug: null })
    });
    const line = findEvidence(snapshot.raw, 'line-segment', 'native-line-signal') as CameraLineSegmentEvidence;

    expect(line).toMatchObject({
      source: 'native-line-signal',
      kind: 'line-segment',
      space: 'raw-frame',
      purpose: 'scoring',
      confidence: 0.72,
      lineKind: 'horizontal-line',
      angleDeg: 0,
      lengthNormalized: 0.8,
      orientationKind: 'horizontal',
      line: { x1: 0.1, y1: 0.3, x2: 0.9, y2: 0.3 }
    });
  });

  it('keeps mapped preview line segment orientation separate from raw native kind', () => {
    const analysis = makeAnalysis({ visualMassDebug: null });
    const snapshot = cameraEvidenceFromNativeAnalysis({
      analysis,
      nativeEvidenceMapping: mapNativeEvidenceToPreview(analysis, { width: 300, height: 400, resizeMode: 'cover' })
    });

    const rawLine = findEvidence(snapshot.raw, 'line-segment', 'native-line-signal') as CameraLineSegmentEvidence;
    const mappedLine = findEvidence(snapshot.mapped, 'line-segment', 'native-line-signal') as CameraLineSegmentEvidence;

    expect(rawLine).toMatchObject({
      space: 'raw-frame',
      lineKind: 'horizontal-line',
      orientationKind: 'horizontal',
      angleDeg: 0,
      lengthNormalized: 0.8
    });
    expect(mappedLine).toMatchObject({
      space: 'preview',
      lineKind: 'unknown-line',
      orientationKind: 'vertical'
    });
    expect(mappedLine.angleDeg).toBeCloseTo(-90, 6);
    expect(mappedLine.lengthNormalized).toBeCloseTo(0.8, 6);
    expect(mappedLine.line).toEqual({ x1: 0.3, y1: 0.9, x2: 0.3, y2: 0.09999999999999998 });
  });

  it('derives diagonal and unknown orientation from line segment endpoints', () => {
    const diagonalSnapshot = cameraEvidenceFromNativeAnalysis({
      analysis: makeAnalysis({
        lineCandidate: makeLine({ x1: 0.2, y1: 0.2, x2: 0.6, y2: 0.6, angleDeg: 0 }),
        visualMassDebug: null
      })
    });
    const zeroLengthSnapshot = cameraEvidenceFromNativeAnalysis({
      analysis: makeAnalysis({
        lineCandidate: makeLine({ x1: 0.4, y1: 0.4, x2: 0.4, y2: 0.4, angleDeg: 90 }),
        visualMassDebug: null
      })
    });

    const diagonalLine = findEvidence(diagonalSnapshot.raw, 'line-segment', 'native-line-signal') as CameraLineSegmentEvidence;
    const zeroLengthLine = findEvidence(zeroLengthSnapshot.raw, 'line-segment', 'native-line-signal') as CameraLineSegmentEvidence;

    expect(diagonalLine.orientationKind).toBe('diagonal');
    expect(diagonalLine.angleDeg).toBeCloseTo(45, 6);
    expect(diagonalLine.lengthNormalized).toBeCloseTo(Math.hypot(0.4, 0.4), 6);
    expect(zeroLengthLine.orientationKind).toBe('unknown');
    expect(zeroLengthLine.angleDeg).toBeNull();
    expect(zeroLengthLine.lengthNormalized).toBe(0);
  });

  it('converts manual subject into preview scoring point evidence', () => {
    const snapshot = cameraEvidenceFromManualSubject({
      manualSubject: { x: 0.4, y: 0.6 },
      createdAtMs: 5_000
    });

    expect(snapshot.raw).toHaveLength(0);
    expect(snapshot.mapped).toHaveLength(1);
    expect(snapshot.mapped[0]).toMatchObject({
      id: 'manual-subject-preview-5000',
      source: 'manual',
      kind: 'point',
      space: 'preview',
      purpose: 'scoring',
      confidence: 1,
      point: { x: 0.4, y: 0.6 }
    });
  });

  it('keeps visual mass heatmap evidence debug-only', () => {
    const analysis = makeAnalysis();
    const snapshot = cameraEvidenceFromNativeAnalysis({
      analysis,
      nativeEvidenceMapping: mapNativeEvidenceToPreview(analysis, { width: 300, height: 400, resizeMode: 'cover' })
    });

    const rawHeatmap = findEvidence(snapshot.raw, 'heatmap', 'native-visual-mass');
    const mappedHeatmap = findEvidence(snapshot.mapped, 'heatmap', 'native-visual-mass');

    expect(rawHeatmap).toMatchObject({
      kind: 'heatmap',
      space: 'raw-frame',
      purpose: 'debug-only',
      confidence: 0.38,
      heatmap: {
        gridWidth: 32,
        gridHeight: 24,
        heatmapWidth: 8,
        heatmapHeight: 6,
        cellCount: 1,
        topCandidateCount: 1
      }
    });
    expect(mappedHeatmap.space).toBe('preview');
    expect(snapshot.scoring.some((item) => item.kind === 'heatmap')).toBe(false);
    expect(snapshot.debugOnly.filter((item) => item.kind === 'heatmap')).toHaveLength(2);
  });

  it('rejects invalid native values safely', () => {
    const snapshot = cameraEvidenceFromNativeAnalysis({
      analysis: makeAnalysis({
        subject: {
          source: 'native-heuristic',
          center: { x: Number.NaN, y: 0.3 },
          bounds: { x: 0.12, y: 0.2, width: Number.POSITIVE_INFINITY, height: 0.22 },
          confidence: 0.38
        },
        lineCandidate: makeLine({ x1: Number.NEGATIVE_INFINITY }),
        visualMassDebug: makeVisualMassDebug({
          cells: [{ x: 0.125, y: 0.167, width: 0.125, height: 0.167, energy: Number.NaN }]
        })
      })
    });

    expect(snapshot.raw).toHaveLength(0);
    expect(snapshot.mapped).toHaveLength(0);
    expect(snapshot.scoring).toHaveLength(0);
    expect(snapshot.debugOnly).toHaveLength(0);
  });

  it('rejects pathological mapped native values safely', () => {
    const pathologicalMapping: NativeEvidencePreviewMapping = {
      frameGeometry: null,
      previewGeometry: { width: 300, height: 400 },
      transform: null,
      rawLineCandidate: null,
      mappedLineCandidate: {
        x1: 99,
        y1: -99,
        x2: 128,
        y2: -128,
        angleDeg: 0,
        confidence: 0.72,
        kind: 'horizontal-line'
      },
      rawVisualMassCenter: null,
      mappedVisualMassCenter: { x: 99, y: -99 },
      rawVisualMassBounds: null,
      mappedVisualMassBounds: { x: 99, y: -99, width: 100, height: 120 }
    };

    const snapshot = cameraEvidenceFromNativeAnalysis({
      analysis: makeAnalysis({ visualMassDebug: null }),
      nativeEvidenceMapping: pathologicalMapping
    });

    expect(snapshot.raw).toHaveLength(3);
    expect(snapshot.mapped).toHaveLength(0);
    expect(snapshot.debugOnly).toHaveLength(1);
  });

  it('preserves evidence source and confidence in combined snapshots', () => {
    const snapshot = buildCameraEvidenceSnapshot({
      nativeAnalysis: makeAnalysis({ visualMassDebug: null }),
      manualSubject: { x: 0.45, y: 0.55 },
      createdAtMs: 11_000
    });

    expect(snapshot.raw.map((item) => [item.source, item.confidence])).toEqual([
      ['native-visual-mass', 0.38],
      ['native-visual-mass', 0.38],
      ['native-line-signal', 0.72]
    ]);
    expect(snapshot.raw.map((item) => item.createdAtMs)).toEqual([11_000, 11_000, 11_000]);
    expect(snapshot.mapped[0]).toMatchObject({ source: 'manual', confidence: 1, createdAtMs: 11_000 });
  });

  it('does not change composition scoring or auto-capture inputs', () => {
    const candidate: CompositionCandidate = {
      id: 'native-candidate',
      source: 'native-heuristic',
      label: 'native visual mass',
      center: { x: 0.39, y: 0.1 },
      bounds: { x: 0.3, y: 0.05, width: 0.2, height: 0.2 },
      confidence: 0.7,
      createdAtMs: 1_000
    };

    const before = scoreDetectedComposition(candidate, ['third'], 'native visual mass', makeLine());
    buildCameraEvidenceSnapshot({ nativeAnalysis: makeAnalysis(), manualSubject: { x: 0.4, y: 0.6 } });
    const after = scoreDetectedComposition(candidate, ['third'], 'native visual mass', makeLine());

    expect(after).toEqual(before);
  });

  it('does not imply object detection', () => {
    const snapshot = buildCameraEvidenceSnapshot({
      nativeAnalysis: makeAnalysis(),
      manualSubject: { x: 0.45, y: 0.55 }
    });
    const explanations = evidenceText([...snapshot.raw, ...snapshot.mapped]);

    expect(explanations).toContain('contrast/luminance');
    expect(explanations).toContain('not object detection');
    expect(explanations).not.toMatch(/object detected|person detected|face detected|semantic label/i);
  });
});
