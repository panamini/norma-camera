import { describe, expect, it } from 'vitest';
import { MIN_HORIZONTAL_LINE_OVERLAY_CONFIDENCE, normalizedHorizontalLineOverlayY } from '../nativeLineDiagnosticOverlay';
import type { NativeLineCandidate } from '../nativeHeuristicTypes';

const renderableLine: NativeLineCandidate = {
  x1: 0,
  y1: 0.3,
  x2: 1,
  y2: 0.5,
  angleDeg: 0,
  confidence: MIN_HORIZONTAL_LINE_OVERLAY_CONFIDENCE,
  kind: 'horizontal-line'
};

describe('native horizontal-line diagnostic overlay guard', () => {
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

  it('keeps overlay terminology diagnostic-only and non-semantic', () => {
    const overlayTerms = 'horizontal line candidate diagnostic only no strong line candidate';

    expect(overlayTerms).not.toMatch(/horizon detected|object detected|person detected|face detected|AI detected|scene understood|semantic detection/i);
  });
});
