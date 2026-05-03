import type { GuideHit } from './types';

export const NO_SUBJECT_LABEL = 'TAP SUBJECT';
export const CENTERED_LABEL = 'CENTERED SUBJECT';
export const READY_LABEL = 'COMPOSITION READY';
export const ADJUST_LABEL = 'ADJUST COMPOSITION';

export function labelForBestHit(bestHit: GuideHit | null): string | null {
  switch (bestHit?.guide.label) {
    case 'LEFT_THIRD':
      return 'SUBJECT ON LEFT THIRD';
    case 'RIGHT_THIRD':
      return 'SUBJECT ON RIGHT THIRD';
    case 'UPPER_THIRD':
      return 'SUBJECT NEAR UPPER THIRD';
    case 'LOWER_THIRD':
      return 'SUBJECT NEAR LOWER THIRD';
    case 'CENTER_X':
    case 'CENTER_Y':
      return null;
    default:
      return null;
  }
}
