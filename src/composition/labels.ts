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
    case 'PHI_LEFT':
      return 'SUBJECT ON LEFT PHI';
    case 'PHI_RIGHT':
      return 'SUBJECT ON RIGHT PHI';
    case 'PHI_UPPER':
      return 'SUBJECT NEAR UPPER PHI';
    case 'PHI_LOWER':
      return 'SUBJECT NEAR LOWER PHI';
    case 'ROOT2_LEFT':
      return 'SUBJECT ON LEFT ROOT-2';
    case 'ROOT2_RIGHT':
      return 'SUBJECT ON RIGHT ROOT-2';
    case 'ROOT2_UPPER':
      return 'SUBJECT NEAR UPPER ROOT-2';
    case 'ROOT2_LOWER':
      return 'SUBJECT NEAR LOWER ROOT-2';
    case 'DIAGONAL_FALLING':
    case 'DIAGONAL_RISING':
      return 'SUBJECT ON DIAGONAL';
    case 'CENTER_X':
    case 'CENTER_Y':
      return null;
    default:
      return null;
  }
}
