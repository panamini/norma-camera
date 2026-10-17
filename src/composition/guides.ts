import type { AxisGuide, CompositionGuide, GuideKind, SegmentGuide } from './types';

export const PHI = (1 + Math.sqrt(5)) / 2;
export const PHI_INV = 1 / PHI;
export const PHI_INV_SQ = 1 - PHI_INV;
export const ROOT2_INV = 1 / Math.SQRT2;
export const ROOT2_INV_COMPLEMENT = 1 - ROOT2_INV;

export const THIRD_GUIDES: AxisGuide[] = [
  { axis: 'x', kind: 'third', value: 1 / 3, label: 'LEFT_THIRD' },
  { axis: 'x', kind: 'third', value: 2 / 3, label: 'RIGHT_THIRD' },
  { axis: 'y', kind: 'third', value: 1 / 3, label: 'UPPER_THIRD' },
  { axis: 'y', kind: 'third', value: 2 / 3, label: 'LOWER_THIRD' }
];

export const HALF_GUIDES: AxisGuide[] = [
  { axis: 'x', kind: 'half', value: 1 / 2, label: 'CENTER_X' },
  { axis: 'y', kind: 'half', value: 1 / 2, label: 'CENTER_Y' }
];

export const PHI_GUIDES: AxisGuide[] = [
  { axis: 'x', kind: 'phi', value: PHI_INV_SQ, label: 'PHI_LEFT' },
  { axis: 'x', kind: 'phi', value: PHI_INV, label: 'PHI_RIGHT' },
  { axis: 'y', kind: 'phi', value: PHI_INV_SQ, label: 'PHI_UPPER' },
  { axis: 'y', kind: 'phi', value: PHI_INV, label: 'PHI_LOWER' }
];

export const ROOT2_GUIDES: AxisGuide[] = [
  { axis: 'x', kind: 'root2', value: ROOT2_INV_COMPLEMENT, label: 'ROOT2_LEFT' },
  { axis: 'x', kind: 'root2', value: ROOT2_INV, label: 'ROOT2_RIGHT' },
  { axis: 'y', kind: 'root2', value: ROOT2_INV_COMPLEMENT, label: 'ROOT2_UPPER' },
  { axis: 'y', kind: 'root2', value: ROOT2_INV, label: 'ROOT2_LOWER' }
];

export const DIAGONAL_GUIDES: SegmentGuide[] = [
  { axis: 'segment', kind: 'diagonal', start: { x: 0, y: 0 }, end: { x: 1, y: 1 }, label: 'DIAGONAL_FALLING' },
  { axis: 'segment', kind: 'diagonal', start: { x: 0, y: 1 }, end: { x: 1, y: 0 }, label: 'DIAGONAL_RISING' }
];

export const ALL_GUIDES: CompositionGuide[] = [...THIRD_GUIDES, ...HALF_GUIDES, ...PHI_GUIDES, ...ROOT2_GUIDES, ...DIAGONAL_GUIDES];

export function isAxisGuide(guide: CompositionGuide): guide is AxisGuide {
  return guide.axis !== 'segment';
}

export function isSegmentGuide(guide: CompositionGuide): guide is SegmentGuide {
  return guide.axis === 'segment';
}

export function guidesForKinds(kinds: GuideKind[]): CompositionGuide[] {
  const activeKinds = new Set(kinds);
  return ALL_GUIDES.filter((guide) => activeKinds.has(guide.kind));
}
