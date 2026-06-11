import { describe, expect, it } from 'vitest';
import { decideAutoCapture } from '../../autocapture/decideAutoCapture';
import type { NativeLineSegmentCandidate } from '../nativeHeuristicTypes';
import { stabilizeRecentLineSegments, type StabilizedLineSegment } from '../nativeLineSegmentRetention';
import { scoreDetectedComposition } from '../scoreDetectedComposition';
import { selectCompositionCandidate } from '../selectCompositionCandidate';

function makeSegment(overrides: Partial<NativeLineSegmentCandidate> = {}): NativeLineSegmentCandidate {
  return {
    x1: 0.1,
    y1: 0.3,
    x2: 0.9,
    y2: 0.3,
    angleDeg: 0,
    lengthEuclidean: 0.8,
    confidence: 0.62,
    orientationKind: 'horizontal',
    src: 'native-line-segment-spike',
    ...overrides
  };
}

function stabilize(
  previousStableSegments: StabilizedLineSegment[],
  latestSegments: NativeLineSegmentCandidate[],
  nowMs: number
): StabilizedLineSegment[] {
  return stabilizeRecentLineSegments({
    previousStableSegments,
    latestSegments,
    nowMs
  });
}

describe('stabilizeRecentLineSegments', () => {
  it('marks the same segment as stable after repeated observations', () => {
    const first = stabilize([], [makeSegment()], 1_000);
    const second = stabilize(first, [makeSegment({ y1: 0.315, y2: 0.315 })], 1_250);

    expect(first).toHaveLength(1);
    expect(first[0].stabilityState).toBe('fresh');
    expect(second).toHaveLength(1);
    expect(second[0].stabilityState).toBe('stable');
    expect(second[0].observations).toBe(2);
    expect(second[0].firstSeenAtMs).toBe(1_000);
    expect(second[0].lastSeenAtMs).toBe(1_250);
  });

  it('retains a stable segment briefly when it disappears', () => {
    const first = stabilize([], [makeSegment()], 1_000);
    const stable = stabilize(first, [makeSegment()], 1_250);
    const retained = stabilize(stable, [], 1_450);

    expect(retained).toHaveLength(1);
    expect(retained[0].stabilityState).toBe('retained');
    expect(retained[0].observations).toBe(2);
    expect(retained[0].lastSeenAtMs).toBe(1_250);
  });

  it('drops a missing segment after the retention window', () => {
    const first = stabilize([], [makeSegment()], 1_000);
    const stable = stabilize(first, [makeSegment()], 1_250);

    expect(stabilize(stable, [], 2_400)).toEqual([]);
  });

  it('rejects a large angle change instead of extending the previous track', () => {
    const first = stabilize([], [makeSegment()], 1_000);
    const changed = stabilize(first, [makeSegment({ x2: 0.6, y2: 0.7, angleDeg: 53, orientationKind: 'diagonal' })], 1_250);

    expect(changed).toHaveLength(1);
    expect(changed[0].stabilityState).toBe('fresh');
    expect(changed[0].observations).toBe(1);
    expect(changed[0].firstSeenAtMs).toBe(1_250);
  });

  it('rejects large position drift instead of treating it as the same segment', () => {
    const first = stabilize([], [makeSegment()], 1_000);
    const drifted = stabilize(first, [makeSegment({ y1: 0.7, y2: 0.7 })], 1_250);

    expect(drifted).toHaveLength(1);
    expect(drifted[0].stabilityState).toBe('fresh');
    expect(drifted[0].observations).toBe(1);
    expect(drifted[0].segment.y1).toBe(0.7);
  });

  it('caps stabilized output to the strongest top segments', () => {
    const latest = [
      makeSegment({ y1: 0.1, y2: 0.1, confidence: 0.38, lengthEuclidean: 0.4 }),
      makeSegment({ y1: 0.2, y2: 0.2, confidence: 0.92, lengthEuclidean: 0.7 }),
      makeSegment({ y1: 0.3, y2: 0.3, confidence: 0.75, lengthEuclidean: 0.9 }),
      makeSegment({ y1: 0.4, y2: 0.4, confidence: 0.7, lengthEuclidean: 0.6 }),
      makeSegment({ y1: 0.5, y2: 0.5, confidence: 0.68, lengthEuclidean: 0.8 })
    ];

    const result = stabilize([], latest, 1_000);

    expect(result).toHaveLength(4);
    expect(result.map((entry) => entry.segment.confidence)).toEqual([0.92, 0.75, 0.7, 0.68]);
  });

  it('rejects invalid values and low-confidence segments', () => {
    const result = stabilize(
      [],
      [
        makeSegment({ x1: Number.NaN }),
        makeSegment({ confidence: 0.1 }),
        makeSegment({ lengthEuclidean: 0.01 }),
        makeSegment({ orientationKind: 'unknown' }),
        makeSegment()
      ],
      1_000
    );

    expect(result).toHaveLength(1);
    expect(result[0].segment.orientationKind).toBe('horizontal');
  });
});

describe('line segment retention guardrails', () => {
  it('does not create a scoring candidate or auto-capture path from line segments alone', () => {
    const selection = selectCompositionCandidate({
      nowMs: 1_000,
      autoMode: 'native-heuristic',
      manualSubject: null,
      nativeFrameAnalysis: {
        status: 'low-confidence',
        createdAtMs: 1_000,
        subject: null,
        lineCandidate: null,
        lineSegments: [makeSegment()],
        exposure: null,
        sharpness: null,
        analysisSource: 'live-frame',
        explanation: 'Debug-only line segment spike candidates are available.'
      }
    });
    const scored = scoreDetectedComposition(selection.candidate, ['third'], selection.explanation, null);
    const decision = decideAutoCapture({
      nowMs: 1_000,
      armed: true,
      compositionScore: scored.composition.score,
      quality: { sharpnessScore: 80, exposureScore: 75, motionScore: 10, sceneChangedScore: 100 },
      lastCaptureAtMs: null,
      stableSinceMs: null
    });

    expect(selection.candidate).toBeNull();
    expect(scored.composition.score).toBe(0);
    expect(decision.kind).toBe('idle');
  });
});
