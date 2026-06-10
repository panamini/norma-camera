import { describe, expect, it } from 'vitest';
import {
  hasRenderableHorizontalLine,
  LINE_DIAGNOSTIC_RETENTION_MS,
  LINE_STABILITY_OBSERVATION_WINDOW_MS,
  retainRecentHorizontalLine,
  stabilizeRecentHorizontalLine
} from '../nativeLineDiagnosticRetention';
import type { NativeFrameAnalysisResult } from '../nativeHeuristicTypes';

function makeAnalysis(overrides: Partial<NativeFrameAnalysisResult> = {}): NativeFrameAnalysisResult {
  return {
    status: 'low-confidence',
    createdAtMs: 10_000,
    subject: null,
    lineCandidate: null,
    exposure: {
      exposureScore: 82,
      meanLuma: 0.55,
      clippedHighlightsRatio: 0,
      crushedShadowsRatio: 0
    },
    sharpness: {
      sharpnessScore: 44,
      edgeEnergy: 0.08
    },
    explanation: 'Real live Android luminance metrics are available.',
    analysisSource: 'live-frame',
    ...overrides
  };
}

const horizontalLine = {
  x1: 0,
  y1: 0.34,
  x2: 1,
  y2: 0.34,
  angleDeg: 0,
  confidence: 0.51,
  kind: 'horizontal-line' as const
};

describe('native horizontal-line diagnostic retention', () => {
  it('recognizes renderable horizontal-line diagnostics', () => {
    expect(hasRenderableHorizontalLine(makeAnalysis({ lineCandidate: horizontalLine }))).toBe(true);
    expect(hasRenderableHorizontalLine(makeAnalysis())).toBe(false);
    expect(hasRenderableHorizontalLine(makeAnalysis({ lineCandidate: { ...horizontalLine, kind: 'unknown-line' } }))).toBe(false);
  });

  it('briefly retains the last renderable line when the next live frame has no line', () => {
    const previous = makeAnalysis({ createdAtMs: 10_000, lineCandidate: horizontalLine });
    const next = makeAnalysis({ createdAtMs: 10_000 + LINE_DIAGNOSTIC_RETENTION_MS, lineCandidate: null });

    const retained = retainRecentHorizontalLine(next, previous);

    expect(retained.lineCandidate).toEqual(horizontalLine);
  });

  it('does not retain line diagnostics after the retention window', () => {
    const previous = makeAnalysis({ createdAtMs: 10_000, lineCandidate: horizontalLine });
    const next = makeAnalysis({ createdAtMs: 10_000 + LINE_DIAGNOSTIC_RETENTION_MS + 1, lineCandidate: null });

    const retained = retainRecentHorizontalLine(next, previous);

    expect(retained.lineCandidate).toBeNull();
  });

  it('does not retain line diagnostics for unavailable or non-live frames', () => {
    const previous = makeAnalysis({ createdAtMs: 10_000, lineCandidate: horizontalLine });
    const unavailable = makeAnalysis({ status: 'unavailable', createdAtMs: 10_100, lineCandidate: null });
    const debugGrid = makeAnalysis({ createdAtMs: 10_100, analysisSource: 'debug-grid', lineCandidate: null });

    expect(retainRecentHorizontalLine(unavailable, previous).lineCandidate).toBeNull();
    expect(retainRecentHorizontalLine(debugGrid, previous).lineCandidate).toBeNull();
  });

  it('requires two recent coherent observations before exposing a line as stable', () => {
    const first = makeAnalysis({ createdAtMs: 10_000, lineCandidate: horizontalLine });
    const second = makeAnalysis({ createdAtMs: 10_250, lineCandidate: { ...horizontalLine, y1: 0.35, y2: 0.35 } });

    expect(stabilizeRecentHorizontalLine(first, null, null).lineCandidate).toBeNull();
    expect(stabilizeRecentHorizontalLine(second, first, null).lineCandidate).toEqual(second.lineCandidate);
  });

  it('rejects abrupt y jumps until the new line is observed consistently', () => {
    const stable = makeAnalysis({ createdAtMs: 10_000, lineCandidate: horizontalLine });
    const jumped = makeAnalysis({ createdAtMs: 10_250, lineCandidate: { ...horizontalLine, y1: 0.62, y2: 0.62 } });
    const repeatedJump = makeAnalysis({ createdAtMs: 10_500, lineCandidate: { ...horizontalLine, y1: 0.63, y2: 0.63 } });

    expect(stabilizeRecentHorizontalLine(jumped, stable, stable).lineCandidate).toBeNull();
    expect(stabilizeRecentHorizontalLine(repeatedJump, jumped, stable).lineCandidate).toEqual(repeatedJump.lineCandidate);
  });

  it('does not stabilize observations that are too far apart in time', () => {
    const first = makeAnalysis({ createdAtMs: 10_000, lineCandidate: horizontalLine });
    const late = makeAnalysis({
      createdAtMs: 10_000 + LINE_STABILITY_OBSERVATION_WINDOW_MS + 1,
      lineCandidate: { ...horizontalLine, y1: 0.35, y2: 0.35 }
    });

    expect(stabilizeRecentHorizontalLine(late, first, null).lineCandidate).toBeNull();
  });

  it('retains only a previously stable line during a short disappearance', () => {
    const observedOnly = makeAnalysis({ createdAtMs: 10_000, lineCandidate: horizontalLine });
    const stable = makeAnalysis({ createdAtMs: 10_000, lineCandidate: horizontalLine });
    const missing = makeAnalysis({ createdAtMs: 10_100, lineCandidate: null });

    expect(stabilizeRecentHorizontalLine(missing, observedOnly, null).lineCandidate).toBeNull();
    expect(stabilizeRecentHorizontalLine(missing, observedOnly, stable).lineCandidate).toEqual(stable.lineCandidate);
  });
});
