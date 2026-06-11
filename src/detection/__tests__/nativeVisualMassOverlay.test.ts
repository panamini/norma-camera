import { describe, expect, it } from 'vitest';
import { nativeVisualMassOverlayCandidate, NATIVE_VISUAL_MASS_OVERLAY_CONFIDENCE_MIN } from '../nativeVisualMassOverlay';
import type { NativeFrameAnalysisResult } from '../nativeHeuristicTypes';

function makeAnalysis(overrides: Partial<NativeFrameAnalysisResult> = {}): NativeFrameAnalysisResult {
  return {
    status: 'low-confidence',
    createdAtMs: 10_000,
    subject: {
      source: 'native-heuristic',
      center: { x: 0.4, y: 0.5 },
      bounds: { x: 0.3, y: 0.4, width: 0.2, height: 0.2 },
      confidence: NATIVE_VISUAL_MASS_OVERLAY_CONFIDENCE_MIN
    },
    lineCandidate: null,
    exposure: { exposureScore: 70, meanLuma: 0.48, clippedHighlightsRatio: 0, crushedShadowsRatio: 0 },
    sharpness: { sharpnessScore: 60, edgeEnergy: 0.12 },
    explanation: 'Real luminance analysis ran conservatively. No recognition is used.',
    analysisSource: 'live-frame',
    ...overrides
  };
}

describe('native visual mass overlay candidate', () => {
  it('keeps a live held visual mass available for readout-only overlay', () => {
    const overlay = nativeVisualMassOverlayCandidate(makeAnalysis());

    expect(overlay).toEqual({
      center: { x: 0.4, y: 0.5 },
      bounds: { x: 0.3, y: 0.4, width: 0.2, height: 0.2 },
      confidence: NATIVE_VISUAL_MASS_OVERLAY_CONFIDENCE_MIN
    });
  });

  it('rejects unavailable, stale, missing, weak, or malformed subjects', () => {
    expect(nativeVisualMassOverlayCandidate(null)).toBeNull();
    expect(nativeVisualMassOverlayCandidate(makeAnalysis({ analysisSource: 'stale-live-frame' }))).toBeNull();
    expect(nativeVisualMassOverlayCandidate(makeAnalysis({ analysisSource: 'analyzer-unavailable' }))).toBeNull();
    expect(nativeVisualMassOverlayCandidate(makeAnalysis({ subject: null }))).toBeNull();
    expect(
      nativeVisualMassOverlayCandidate(
        makeAnalysis({
          subject: {
            source: 'native-heuristic',
            center: { x: 0.4, y: 0.5 },
            bounds: { x: 0.3, y: 0.4, width: 0.2, height: 0.2 },
            confidence: NATIVE_VISUAL_MASS_OVERLAY_CONFIDENCE_MIN - 0.01
          }
        })
      )
    ).toBeNull();
    expect(
      nativeVisualMassOverlayCandidate(
        makeAnalysis({
          subject: {
            source: 'native-heuristic',
            center: { x: Number.NaN, y: 0.5 },
            bounds: { x: 0.3, y: 0.4, width: 0.2, height: 0.2 },
            confidence: 0.2
          }
        })
      )
    ).toBeNull();
  });
});
