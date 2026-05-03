import { describe, expect, it } from 'vitest';
import { scoreFrameComposition } from '../composition/scoreFrameComposition';

describe('scoreFrameComposition', () => {
  it('subject at x=1/3 scores high and labels left third', () => {
    const result = scoreFrameComposition({ subjectCenter: { x: 1 / 3, y: 0.12 }, activeGuideKinds: ['third'] });

    expect(result.score).toBeGreaterThanOrEqual(99);
    expect(result.label).toBe('SUBJECT ON LEFT THIRD');
  });

  it('subject at x=2/3 scores high and labels right third', () => {
    const result = scoreFrameComposition({ subjectCenter: { x: 2 / 3, y: 0.12 }, activeGuideKinds: ['third'] });

    expect(result.score).toBeGreaterThanOrEqual(99);
    expect(result.label).toBe('SUBJECT ON RIGHT THIRD');
  });

  it('subject at x=1/2 and y=1/2 scores high for centered subject', () => {
    const result = scoreFrameComposition({ subjectCenter: { x: 1 / 2, y: 1 / 2 }, activeGuideKinds: ['half'] });

    expect(result.score).toBeGreaterThanOrEqual(99);
    expect(result.label).toBe('CENTERED SUBJECT');
  });

  it('no subject returns score 0 and TAP SUBJECT', () => {
    const result = scoreFrameComposition({ subjectCenter: null, activeGuideKinds: ['third', 'half'] });

    expect(result.score).toBe(0);
    expect(result.label).toBe('TAP SUBJECT');
    expect(result.isInteresting).toBe(false);
  });
});
