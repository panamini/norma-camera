import { describe, expect, it } from 'vitest';
import { scorePointAgainstGuides } from '../composition/scorePointAgainstGuides';

describe('scorePointAgainstGuides', () => {
  it('subject at x=1/3 scores high for left third', () => {
    const result = scorePointAgainstGuides({ x: 1 / 3, y: 0.2 }, { activeGuideKinds: ['third'] });

    expect(result.score).toBeGreaterThanOrEqual(99);
    expect(result.bestHit?.guide.label).toBe('LEFT_THIRD');
  });

  it('subject at x=2/3 scores high for right third', () => {
    const result = scorePointAgainstGuides({ x: 2 / 3, y: 0.2 }, { activeGuideKinds: ['third'] });

    expect(result.score).toBeGreaterThanOrEqual(99);
    expect(result.bestHit?.guide.label).toBe('RIGHT_THIRD');
  });
});
