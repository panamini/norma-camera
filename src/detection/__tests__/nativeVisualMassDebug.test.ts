import { describe, expect, it } from 'vitest';
import { mapNativeEvidenceToPreview } from '../nativeEvidenceCoordinateMapping';
import {
  nativeVisualMassDebugOverlay,
  type NativeVisualMassDebugOverlay
} from '../nativeVisualMassOverlay';
import { makeNativeAnalysisDebugLine } from '../nativeHeuristicDebug';
import { scoreDetectedComposition } from '../scoreDetectedComposition';
import type { NativeFrameAnalysisResult, NativeVisualMassDebug } from '../nativeHeuristicTypes';
import type { CompositionCandidate } from '../types';

function makeVisualMassDebug(overrides: Partial<NativeVisualMassDebug> = {}): NativeVisualMassDebug {
  return {
    gridWidth: 32,
    gridHeight: 24,
    heatmapWidth: 8,
    heatmapHeight: 6,
    cells: [
      { x: 0.125, y: 0.167, width: 0.125, height: 0.167, energy: 0.86 },
      { x: 0.25, y: 0.167, width: 0.125, height: 0.167, energy: 0.64 }
    ],
    topCandidates: [
      {
        center: { x: 0.188, y: 0.25 },
        bounds: { x: 0.125, y: 0.167, width: 0.125, height: 0.167 },
        confidence: 0.42,
        energy: 0.86,
        reason: 'coarse luma/contrast energy'
      },
      {
        center: { x: 0.313, y: 0.25 },
        bounds: { x: 0.25, y: 0.167, width: 0.125, height: 0.167 },
        confidence: 0.32,
        energy: 0.64,
        reason: 'coarse luma/contrast energy'
      },
      {
        center: { x: 0.438, y: 0.25 },
        bounds: { x: 0.375, y: 0.167, width: 0.125, height: 0.167 },
        confidence: 0.21,
        energy: 0.51,
        reason: 'coarse luma/contrast energy'
      },
      {
        center: { x: 0.563, y: 0.25 },
        bounds: { x: 0.5, y: 0.167, width: 0.125, height: 0.167 },
        confidence: 0.18,
        energy: 0.44,
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
    lineCandidate: null,
    exposure: { exposureScore: 72, meanLuma: 0.48, clippedHighlightsRatio: 0.01, crushedShadowsRatio: 0.02 },
    sharpness: { sharpnessScore: 68, edgeEnergy: 0.12 },
    explanation: 'Real luminance analysis. No recognition is used.',
    analysisSource: 'live-frame',
    visualMassDebug: makeVisualMassDebug(),
    ...overrides
  };
}

function expectMappedDebug(debug: NativeVisualMassDebugOverlay | null): asserts debug is NativeVisualMassDebugOverlay {
  expect(debug).not.toBeNull();
  expect(debug?.raw.cells).toHaveLength(2);
  expect(debug?.mapped.cells).toHaveLength(2);
}

describe('native visual mass debug overlay', () => {
  it('validates compact native visual mass debug payloads and bounds top candidates', () => {
    const debug = nativeVisualMassDebugOverlay(makeAnalysis(), mapNativeEvidenceToPreview(makeAnalysis(), { width: 300, height: 400, resizeMode: 'cover' }));

    expectMappedDebug(debug);
    expect(debug.raw.topCandidates).toHaveLength(3);
    expect(debug.raw.selectedCandidate?.reason).toContain('luma/contrast');
    expect(debug.raw.stabilizedCandidate?.reason).toContain('stabilized');
  });

  it('rejects NaN, Infinity, invalid bounds, invalid energy, and non-live debug payloads', () => {
    expect(
      nativeVisualMassDebugOverlay(
        makeAnalysis({
          visualMassDebug: makeVisualMassDebug({
            cells: [{ x: Number.NaN, y: 0.1, width: 0.1, height: 0.1, energy: 0.5 }]
          })
        })
      )
    ).toBeNull();
    expect(
      nativeVisualMassDebugOverlay(
        makeAnalysis({
          visualMassDebug: makeVisualMassDebug({
            cells: [{ x: 0.1, y: 0.1, width: Number.POSITIVE_INFINITY, height: 0.1, energy: 0.5 }]
          })
        })
      )
    ).toBeNull();
    expect(
      nativeVisualMassDebugOverlay(
        makeAnalysis({
          visualMassDebug: makeVisualMassDebug({
            cells: [{ x: 0.95, y: 0.1, width: 0.1, height: 0.1, energy: 0.5 }]
          })
        })
      )
    ).toBeNull();
    expect(
      nativeVisualMassDebugOverlay(
        makeAnalysis({
          visualMassDebug: makeVisualMassDebug({
            cells: [{ x: 0.1, y: 0.1, width: 0.1, height: 0.1, energy: 1.2 }]
          })
        })
      )
    ).toBeNull();
    expect(nativeVisualMassDebugOverlay(makeAnalysis({ analysisSource: 'stale-live-frame' }))).toBeNull();
  });

  it('keeps raw and mapped visual mass debug side by side through PR4.1 preview mapping', () => {
    const analysis = makeAnalysis();
    const debug = nativeVisualMassDebugOverlay(analysis, mapNativeEvidenceToPreview(analysis, { width: 300, height: 400, resizeMode: 'cover' }));

    expectMappedDebug(debug);
    expect(debug.raw.cells[0]).toMatchObject({ x: 0.125, y: 0.167, width: 0.125, height: 0.167 });
    expect(debug.mapped.cells[0].x).toBeCloseTo(0.167, 3);
    expect(debug.mapped.cells[0].y).toBeCloseTo(0.75, 3);
    expect(debug.mapped.cells[0].width).toBeCloseTo(0.167, 3);
    expect(debug.mapped.cells[0].height).toBeCloseTo(0.125, 3);
    expect(debug.raw.selectedCandidate?.center).toEqual({ x: 0.188, y: 0.25 });
    expect(debug.mapped.selectedCandidate?.center.x).toBeCloseTo(0.25, 3);
    expect(debug.mapped.selectedCandidate?.center.y).toBeCloseTo(0.812, 3);
  });

  it('formats visual mass debug as contrast/luminance evidence, not object detection', () => {
    const analysis = makeAnalysis();
    const line = makeNativeAnalysisDebugLine(
      analysis,
      true,
      10_120,
      61,
      undefined,
      undefined,
      mapNativeEvidenceToPreview(analysis, { width: 300, height: 400, resizeMode: 'cover' })
    );

    expect(line).toContain('visual mass debug: contrast/luminance evidence, not object detection');
    expect(line).toContain('raw heat cells 2 · top candidates 3');
    expect(line).toContain('mapped heat cells 2 · selected x=0.250 y=0.812');
    expect(line).not.toMatch(/object detected|subject detected|person detected|face detected/i);
  });

  it('does not change composition scoring when debug payload is present', () => {
    const candidate: CompositionCandidate = {
      id: 'native-candidate',
      source: 'native-heuristic',
      label: 'native visual mass',
      center: { x: 0.39, y: 0.1 },
      bounds: { x: 0.3, y: 0.05, width: 0.2, height: 0.2 },
      confidence: 0.7,
      createdAtMs: 1_000
    };

    const withoutDebug = scoreDetectedComposition(candidate, ['third'], 'native visual mass');
    const withDebug = scoreDetectedComposition(candidate, ['third'], makeAnalysis().visualMassDebug?.explanation);

    expect(withDebug.composition).toEqual(withoutDebug.composition);
  });
});
