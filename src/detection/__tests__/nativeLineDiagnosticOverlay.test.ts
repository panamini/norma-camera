import { describe, expect, it } from 'vitest';
import {
  MAX_LINE_SEGMENT_SPIKE_OVERLAY_SEGMENTS,
  MIN_HORIZONTAL_LINE_OVERLAY_CONFIDENCE,
  MIN_LINE_SEGMENT_SPIKE_OVERLAY_CONFIDENCE,
  MIN_LINE_SEGMENT_SPIKE_OVERLAY_LENGTH,
  normalizedHorizontalLineOverlayY,
  normalizedLineSegmentSpikeOverlaySegments
} from '../nativeLineDiagnosticOverlay';
import type { NativeLineCandidate, NativeLineSegmentCandidate } from '../nativeHeuristicTypes';

const renderableLine: NativeLineCandidate = {
  x1: 0,
  y1: 0.3,
  x2: 1,
  y2: 0.5,
  angleDeg: 0,
  confidence: MIN_HORIZONTAL_LINE_OVERLAY_CONFIDENCE,
  kind: 'horizontal-line'
};

function makeSegment(overrides: Partial<NativeLineSegmentCandidate> = {}): NativeLineSegmentCandidate {
  return {
    x1: 0.1,
    y1: 0.3,
    x2: 0.9,
    y2: 0.3,
    angleDeg: 0,
    lengthEuclidean: 0.8,
    confidence: MIN_LINE_SEGMENT_SPIKE_OVERLAY_CONFIDENCE,
    orientationKind: 'horizontal',
    src: 'native-line-segment-spike',
    ...overrides
  };
}

describe('native horizontal-line signal overlay guard', () => {
  it('returns a clamped normalized y value for renderable horizontal-line candidates', () => {
    expect(normalizedHorizontalLineOverlayY(renderableLine)).toBe(0.4);
    expect(normalizedHorizontalLineOverlayY({ ...renderableLine, y1: -1, y2: 3 })).toBe(1);
  });

  it('rejects absent, unknown, malformed, or weak line candidates', () => {
    expect(normalizedHorizontalLineOverlayY(null)).toBeNull();
    expect(normalizedHorizontalLineOverlayY({ ...renderableLine, kind: 'unknown-line' })).toBeNull();
    expect(normalizedHorizontalLineOverlayY({ ...renderableLine, y1: Number.NaN })).toBeNull();
    expect(normalizedHorizontalLineOverlayY({ ...renderableLine, y2: Number.POSITIVE_INFINITY })).toBeNull();
    expect(normalizedHorizontalLineOverlayY({ ...renderableLine, confidence: MIN_HORIZONTAL_LINE_OVERLAY_CONFIDENCE - 0.01 })).toBeNull();
  });

  it('keeps overlay terminology signal-only and non-semantic', () => {
    const overlayTerms = 'horizontal line signal secondary composition signal no strong line candidate';

    expect(overlayTerms).not.toMatch(/horizon detected|object detected|person detected|face detected|AI detected|scene understood|semantic detection/i);
  });

  it('returns deterministic line segment spike descriptors that are not index-only keyed', () => {
    const horizontal = makeSegment();
    const vertical = makeSegment({ x1: 0.4, y1: 0.1, x2: 0.4, y2: 0.9, angleDeg: 90, orientationKind: 'vertical' });

    const first = normalizedLineSegmentSpikeOverlaySegments([horizontal, vertical]);
    const reversed = normalizedLineSegmentSpikeOverlaySegments([vertical, horizontal]);

    expect(first).toHaveLength(2);
    expect(first[1].key).toBe(reversed[0].key);
    expect(first[1].key).toContain('vertical');
    expect(first[1].key).not.toMatch(/^1-vertical$/);
  });

  it('filters invalid, weak, and short spike segments while keeping the overlay capped', () => {
    const visibleSegments = Array.from({ length: MAX_LINE_SEGMENT_SPIKE_OVERLAY_SEGMENTS + 2 }, (_, index) =>
      makeSegment({ y1: 0.1 + index * 0.05, y2: 0.1 + index * 0.05 })
    );

    const descriptors = normalizedLineSegmentSpikeOverlaySegments([
      makeSegment({ confidence: MIN_LINE_SEGMENT_SPIKE_OVERLAY_CONFIDENCE - 0.01 }),
      makeSegment({ lengthEuclidean: MIN_LINE_SEGMENT_SPIKE_OVERLAY_LENGTH - 0.01 }),
      makeSegment({ x1: Number.NaN }),
      ...visibleSegments
    ]);

    expect(descriptors).toHaveLength(MAX_LINE_SEGMENT_SPIKE_OVERLAY_SEGMENTS);
    expect(descriptors.every((segment) => segment.key.includes('native-line-segment-spike'))).toBe(true);
  });
});
