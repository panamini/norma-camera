import type { NativeFrameAnalysisResult, NativeLineSegmentCandidate } from './nativeHeuristicTypes';

export type LineSegmentStabilityState = 'fresh' | 'stable' | 'retained';

export type StabilizedLineSegmentCandidate = NativeLineSegmentCandidate & {
  stabilityState: LineSegmentStabilityState;
  observations: number;
};

export type StabilizedLineSegment = {
  segment: NativeLineSegmentCandidate;
  stabilityState: LineSegmentStabilityState;
  firstSeenAtMs: number;
  lastSeenAtMs: number;
  observations: number;
};

export type LineSegmentRetentionOptions = {
  retentionMs: number;
  maxSegments: number;
  minConfidence: number;
  minLengthEuclidean: number;
  maxCenterDistance: number;
  maxAngleDeltaDeg: number;
  maxLengthDeltaRatio: number;
};

export type StabilizeRecentLineSegmentsInput = {
  previousStableSegments: StabilizedLineSegment[];
  latestSegments: NativeLineSegmentCandidate[] | null | undefined;
  nowMs: number;
  options?: Partial<LineSegmentRetentionOptions>;
};

export const LINE_SEGMENT_RETENTION_MS = 650;
export const LINE_SEGMENT_MAX_STABILIZED_SEGMENTS = 4;
export const LINE_SEGMENT_MIN_CONFIDENCE = 0.24;
export const LINE_SEGMENT_MIN_LENGTH_EUCLIDEAN = 0.08;
export const LINE_SEGMENT_MAX_CENTER_DISTANCE = 0.09;
export const LINE_SEGMENT_MAX_ANGLE_DELTA_DEG = 18;
export const LINE_SEGMENT_MAX_LENGTH_DELTA_RATIO = 0.35;

const DEFAULT_OPTIONS: LineSegmentRetentionOptions = {
  retentionMs: LINE_SEGMENT_RETENTION_MS,
  maxSegments: LINE_SEGMENT_MAX_STABILIZED_SEGMENTS,
  minConfidence: LINE_SEGMENT_MIN_CONFIDENCE,
  minLengthEuclidean: LINE_SEGMENT_MIN_LENGTH_EUCLIDEAN,
  maxCenterDistance: LINE_SEGMENT_MAX_CENTER_DISTANCE,
  maxAngleDeltaDeg: LINE_SEGMENT_MAX_ANGLE_DELTA_DEG,
  maxLengthDeltaRatio: LINE_SEGMENT_MAX_LENGTH_DELTA_RATIO
};

function resolvedOptions(options: Partial<LineSegmentRetentionOptions> | undefined): LineSegmentRetentionOptions {
  return { ...DEFAULT_OPTIONS, ...options };
}

function isFiniteNumber(value: number | null | undefined): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function isRenderableSegment(segment: NativeLineSegmentCandidate, options: LineSegmentRetentionOptions): boolean {
  return (
    segment.src === 'native-line-segment-spike' &&
    segment.orientationKind !== 'unknown' &&
    isFiniteNumber(segment.x1) &&
    isFiniteNumber(segment.y1) &&
    isFiniteNumber(segment.x2) &&
    isFiniteNumber(segment.y2) &&
    isFiniteNumber(segment.angleDeg) &&
    isFiniteNumber(segment.confidence) &&
    segment.confidence >= options.minConfidence &&
    isFiniteNumber(segment.lengthEuclidean) &&
    segment.lengthEuclidean >= options.minLengthEuclidean
  );
}

function segmentCenter(segment: NativeLineSegmentCandidate): { x: number; y: number } {
  return {
    x: (segment.x1 + segment.x2) / 2,
    y: (segment.y1 + segment.y2) / 2
  };
}

function centerDistance(a: NativeLineSegmentCandidate, b: NativeLineSegmentCandidate): number {
  const centerA = segmentCenter(a);
  const centerB = segmentCenter(b);
  return Math.hypot(centerA.x - centerB.x, centerA.y - centerB.y);
}

function normalizedAngleDeg(angleDeg: number): number {
  const normalized = ((angleDeg % 180) + 180) % 180;
  return normalized > 90 ? normalized - 180 : normalized;
}

function angleDeltaDeg(a: number, b: number): number {
  const delta = Math.abs(normalizedAngleDeg(a) - normalizedAngleDeg(b));
  return Math.min(delta, 180 - delta);
}

function lengthDeltaRatio(a: number, b: number): number {
  const maxLength = Math.max(a, b);
  if (maxLength <= 0) return 1;
  return Math.abs(a - b) / maxLength;
}

function matchCost(previous: NativeLineSegmentCandidate, latest: NativeLineSegmentCandidate, options: LineSegmentRetentionOptions): number | null {
  if (previous.orientationKind !== latest.orientationKind) return null;

  const distance = centerDistance(previous, latest);
  if (distance > options.maxCenterDistance) return null;

  const angleDelta = angleDeltaDeg(previous.angleDeg, latest.angleDeg);
  if (angleDelta > options.maxAngleDeltaDeg) return null;

  const lengthDelta = lengthDeltaRatio(previous.lengthEuclidean, latest.lengthEuclidean);
  if (lengthDelta > options.maxLengthDeltaRatio) return null;

  return distance + angleDelta / 180 + lengthDelta;
}

function sortBySignalStrength(segments: NativeLineSegmentCandidate[]): NativeLineSegmentCandidate[] {
  return [...segments].sort((a, b) => b.confidence - a.confidence || b.lengthEuclidean - a.lengthEuclidean);
}

function segmentWithState(entry: StabilizedLineSegment): StabilizedLineSegmentCandidate {
  return {
    ...entry.segment,
    stabilityState: entry.stabilityState,
    observations: entry.observations
  };
}

export function stabilizedLineSegmentCandidates(entries: StabilizedLineSegment[]): StabilizedLineSegmentCandidate[] {
  return entries.map(segmentWithState);
}

export function stabilizeRecentLineSegments(input: StabilizeRecentLineSegmentsInput): StabilizedLineSegment[] {
  const options = resolvedOptions(input.options);
  const previous = Array.isArray(input.previousStableSegments) ? input.previousStableSegments : [];
  const latest = sortBySignalStrength((input.latestSegments ?? []).filter((segment) => isRenderableSegment(segment, options))).slice(0, options.maxSegments);
  const next: StabilizedLineSegment[] = [];
  const usedPrevious = new Set<number>();

  for (const segment of latest) {
    let bestMatchIndex = -1;
    let bestMatchEntry: StabilizedLineSegment | null = null;
    let bestMatchCost = Number.POSITIVE_INFINITY;

    for (let index = 0; index < previous.length; index += 1) {
      if (usedPrevious.has(index)) continue;
      const entry = previous[index];
      const cost = matchCost(entry.segment, segment, options);
      if (cost === null) continue;
      if (cost < bestMatchCost) {
        bestMatchIndex = index;
        bestMatchEntry = entry;
        bestMatchCost = cost;
      }
    }

    if (bestMatchEntry) {
      usedPrevious.add(bestMatchIndex);
      next.push({
        segment,
        stabilityState: bestMatchEntry.observations + 1 >= 2 ? 'stable' : 'fresh',
        firstSeenAtMs: bestMatchEntry.firstSeenAtMs,
        lastSeenAtMs: input.nowMs,
        observations: bestMatchEntry.observations + 1
      });
      continue;
    }

    next.push({
      segment,
      stabilityState: 'fresh',
      firstSeenAtMs: input.nowMs,
      lastSeenAtMs: input.nowMs,
      observations: 1
    });
  }

  previous.forEach((entry, index) => {
    if (usedPrevious.has(index) || entry.observations < 2) return;
    const ageMs = Math.max(0, input.nowMs - entry.lastSeenAtMs);
    if (ageMs > options.retentionMs) return;

    next.push({
      ...entry,
      stabilityState: 'retained'
    });
  });

  return next
    .sort((a, b) => b.segment.confidence - a.segment.confidence || b.observations - a.observations || b.segment.lengthEuclidean - a.segment.lengthEuclidean)
    .slice(0, options.maxSegments);
}

export function stabilizeLineSegmentsInAnalysis(
  analysis: NativeFrameAnalysisResult,
  previousStableSegments: StabilizedLineSegment[]
): { analysis: NativeFrameAnalysisResult; stabilizedSegments: StabilizedLineSegment[] } {
  if (analysis.analysisSource !== 'live-frame' || analysis.status === 'unavailable' || analysis.status === 'error') {
    return { analysis, stabilizedSegments: [] };
  }

  const stabilizedSegments = stabilizeRecentLineSegments({
    previousStableSegments,
    latestSegments: analysis.lineSegments,
    nowMs: analysis.createdAtMs
  });

  return {
    analysis: {
      ...analysis,
      lineSegments: stabilizedLineSegmentCandidates(stabilizedSegments)
    },
    stabilizedSegments
  };
}
