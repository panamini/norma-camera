import { Platform } from 'react-native';

/**
 * Norma design language: paper/graphite with a single gold accent,
 * mono micro-labels. Reference: norma.science / norma-square brand.
 */
export const normaColors = {
  paper: '#f4f1ea',
  paperDim: 'rgba(244,241,234,0.72)',
  paperFaint: 'rgba(244,241,234,0.38)',
  paperGhost: 'rgba(244,241,234,0.16)',
  // Guide strokes: a dark underlay keeps hairlines legible on bright scenes.
  paperLine: 'rgba(244,241,234,0.85)',
  lineShadow: 'rgba(23,23,21,0.45)',
  graphite: '#171715',
  graphiteScrim: 'rgba(23,23,21,0.68)',
  graphiteScrimHeavy: 'rgba(23,23,21,0.86)',
  accent: '#f2b84b',
  accentSoft: 'rgba(242,184,75,0.18)',
  accentFaint: 'rgba(242,184,75,0.45)',
  nativeEvidence: '#84f28f'
} as const;

export const normaFonts = {
  mono: Platform.select({ ios: 'Menlo', default: 'monospace' })
} as const;
