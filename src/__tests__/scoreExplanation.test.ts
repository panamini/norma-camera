import { describe, expect, it } from 'vitest';
import { explainCompositionScore, formatGuideHit, formatNormalizedPoint } from '../composition/scoreExplanation';
import { scoreFrameComposition } from '../composition/scoreFrameComposition';

describe('scoreExplanation', () => {
  it('explains that no-subject mode is manual and does not detect objects', () => {
    const result = scoreFrameComposition({ subjectCenter: null, activeGuideKinds: ['third'] });

    expect(explainCompositionScore(result, null, 82)).toContain('Manual V0 does not detect objects yet');
  });

  it('formats normalized subject coordinates', () => {
    expect(formatNormalizedPoint({ x: 0.25, y: 0.75 })).toBe('x=0.250 · y=0.750');
  });

  it('explains a medium score using the nearest guide and distance', () => {
    const point = { x: 0.39, y: 0.1 };
    const result = scoreFrameComposition({ subjectCenter: point, activeGuideKinds: ['third'] });

    expect(result.score).toBe(53);
    expect(formatGuideHit(result.bestHit)).toContain('left third');
    expect(explainCompositionScore(result, point, 82)).toContain('Medium');
  });
});
