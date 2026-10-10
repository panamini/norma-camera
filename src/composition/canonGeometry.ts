import { guidesForKinds } from './guides';
import type { CanonDefinition } from './types';

export type CanonPixelSegment = {
  key: string;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
};

export type CanonPixelPoint = {
  key: string;
  x: number;
  y: number;
};

/**
 * Pure pixel-space geometry for a canon in a width×height frame.
 * Shared by the live overlay and the capture burn-in renderer so both
 * always draw exactly the same construction.
 */
export function canonLineSegments(canon: CanonDefinition, width: number, height: number): CanonPixelSegment[] {
  return guidesForKinds(canon.guideKinds).map((guide) => {
    if (guide.axis === 'segment') {
      return {
        key: guide.label,
        x1: width * guide.start.x,
        y1: height * guide.start.y,
        x2: width * guide.end.x,
        y2: height * guide.end.y
      };
    }

    if (guide.axis === 'x') {
      const x = width * guide.value;
      return { key: guide.label, x1: x, y1: 0, x2: x, y2: height };
    }

    const y = height * guide.value;
    return { key: guide.label, x1: 0, y1: y, x2: width, y2: y };
  });
}

export function canonNodePoints(canon: CanonDefinition, width: number, height: number): CanonPixelPoint[] {
  return canon.nodes.map((node) => ({
    key: node.label,
    x: width * node.point.x,
    y: height * node.point.y
  }));
}
