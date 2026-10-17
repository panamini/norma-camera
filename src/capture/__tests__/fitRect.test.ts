import { describe, expect, it } from 'vitest';
import { fitContainRect } from '../fitRect';

describe('fitContainRect', () => {
  it('letterboxes a wide image in a tall box', () => {
    const rect = fitContainRect(4000, 3000, 400, 800);
    expect(rect).toEqual({ x: 0, y: 250, width: 400, height: 300 });
  });

  it('pillarboxes a tall image in a wide box', () => {
    const rect = fitContainRect(3000, 4000, 800, 400);
    expect(rect).toEqual({ x: 250, y: 0, width: 300, height: 400 });
  });

  it('fills exactly on matching aspect ratios', () => {
    const rect = fitContainRect(3000, 4000, 300, 400);
    expect(rect).toEqual({ x: 0, y: 0, width: 300, height: 400 });
  });

  it('returns an empty rect on degenerate input', () => {
    expect(fitContainRect(0, 100, 300, 400)).toEqual({ x: 0, y: 0, width: 0, height: 0 });
    expect(fitContainRect(100, 100, 0, 400)).toEqual({ x: 0, y: 0, width: 0, height: 0 });
  });
});
