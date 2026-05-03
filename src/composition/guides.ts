import type { CompositionGuide, GuideKind, OverlayMode } from './types';

export const THIRD_GUIDES: CompositionGuide[] = [
  { axis: 'x', kind: 'third', value: 1 / 3, label: 'LEFT_THIRD' },
  { axis: 'x', kind: 'third', value: 2 / 3, label: 'RIGHT_THIRD' },
  { axis: 'y', kind: 'third', value: 1 / 3, label: 'UPPER_THIRD' },
  { axis: 'y', kind: 'third', value: 2 / 3, label: 'LOWER_THIRD' }
];

export const HALF_GUIDES: CompositionGuide[] = [
  { axis: 'x', kind: 'half', value: 1 / 2, label: 'CENTER_X' },
  { axis: 'y', kind: 'half', value: 1 / 2, label: 'CENTER_Y' }
];

export const ALL_GUIDES: CompositionGuide[] = [...THIRD_GUIDES, ...HALF_GUIDES];

export function guideKindsForOverlayMode(mode: OverlayMode): GuideKind[] {
  switch (mode) {
    case 'thirds':
      return ['third'];
    case 'halves':
      return ['half'];
    case 'both':
      return ['third', 'half'];
  }
}

export function guidesForKinds(kinds: GuideKind[]): CompositionGuide[] {
  const activeKinds = new Set(kinds);
  return ALL_GUIDES.filter((guide) => activeKinds.has(guide.kind));
}
