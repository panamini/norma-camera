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

  it('adds horizontal line alignment as a small secondary contribution', () => {
    const result = scoreFrameComposition({ subjectCenter: { x: 0.39, y: 0.1 }, activeGuideKinds: ['third'], lineAlignmentScore: 100 });

    expect(result.baseGuideScore).toBe(53);
    expect(result.lineAlignmentScore).toBe(100);
    expect(result.lineContribution).toBe(8);
    expect(result.score).toBe(61);
    expect(result.label).toBe('ADJUST COMPOSITION');
  });

  it('does not let line alignment make a not-ready subject score ready by itself', () => {
    const result = scoreFrameComposition({ subjectCenter: { x: 1 / 3 + 0.024, y: 0.1 }, activeGuideKinds: ['third'], lineAlignmentScore: 100 });

    expect(result.baseGuideScore).toBe(80);
    expect(result.lineContribution).toBe(1);
    expect(result.score).toBe(81);
    expect(result.isInteresting).toBe(false);
  });

  it('ignores line alignment when there is no subject candidate', () => {
    const result = scoreFrameComposition({ subjectCenter: null, activeGuideKinds: ['third'], lineAlignmentScore: 100 });

    expect(result.score).toBe(0);
    expect(result.lineAlignmentScore).toBeNull();
    expect(result.lineContribution).toBe(0);
  });

  it('no subject returns score 0 and TAP SUBJECT', () => {
    const result = scoreFrameComposition({ subjectCenter: null, activeGuideKinds: ['third', 'half'] });

    expect(result.score).toBe(0);
    expect(result.label).toBe('TAP SUBJECT');
    expect(result.isInteresting).toBe(false);
  });
});
