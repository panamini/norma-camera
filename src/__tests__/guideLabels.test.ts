import { describe, expect, it } from 'vitest';
import { CANONS } from '../composition/canons';
import { DIAGONAL_GUIDES, guidesForKinds, isAxisGuide } from '../composition/guides';
import { labelForBestHit } from '../composition/labels';
import { displayNameForGuide, formatGuideHit } from '../composition/scoreExplanation';
import { scoreHorizontalLineAgainstGuides } from '../detection/lineGuideScore';
import type { NativeLineCandidate } from '../detection/nativeHeuristicTypes';

function horizontalLineAt(y: number): NativeLineCandidate {
  return { x1: 0, y1: y, x2: 1, y2: y, angleDeg: 0, confidence: 0.9, kind: 'horizontal-line' };
}

describe('guide display names and best-hit labels', () => {
  it('formats segment guide hits without an axis value', () => {
    const hit = { guide: DIAGONAL_GUIDES[0]!, distance: 0.01, score: 92 };
    expect(formatGuideHit(hit)).toBe('falling diagonal · segment · Δ=0.010');
  });

  it('labels the new canon best hits', () => {
    const hitFor = (label: string) => {
      const guide = guidesForKinds(['phi', 'root2', 'diagonal']).find((candidate) => candidate.label === label);
      if (!guide) throw new Error(`missing guide ${label}`);
      return { guide, distance: 0, score: 100 };
    };

    expect(labelForBestHit(hitFor('PHI_LEFT'))).toBe('SUBJECT ON LEFT PHI');
    expect(labelForBestHit(hitFor('ROOT2_UPPER'))).toBe('SUBJECT NEAR UPPER ROOT-2');
    expect(labelForBestHit(hitFor('DIAGONAL_RISING'))).toBe('SUBJECT ON DIAGONAL');
    expect(labelForBestHit(null)).toBeNull();
  });

  it('gives every guide a readable display name', () => {
    for (const guide of guidesForKinds(['third', 'half', 'phi', 'root2', 'diagonal'])) {
      const name = displayNameForGuide(guide);
      expect(name.length).toBeGreaterThan(2);
      expect(name).not.toContain('_');
    }
  });
});

describe('horizontal line signal across canons', () => {
  it('aligns the line against every y-axis guide of every canon', () => {
    for (const canon of CANONS) {
      const yGuides = guidesForKinds(canon.guideKinds).filter(isAxisGuide).filter((guide) => guide.axis === 'y');

      for (const guide of yGuides) {
        const result = scoreHorizontalLineAgainstGuides(horizontalLineAt(guide.value), canon.guideKinds);
        expect(result.hasLine, `${canon.id} ${guide.label}`).toBe(true);
        expect(result.score, `${canon.id} ${guide.label}`).toBe(100);
        expect(result.nearestGuideLabel, `${canon.id} ${guide.label}`).not.toBeNull();
      }
    }
  });

  it('contributes nothing for the diagonals canon', () => {
    const result = scoreHorizontalLineAgainstGuides(horizontalLineAt(0.5), ['diagonal']);
    expect(result.hasLine).toBe(false);
    expect(result.score).toBeNull();
  });
});
