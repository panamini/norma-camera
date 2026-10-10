import { describe, expect, it } from 'vitest';
import { CANONS, CANON_ORDER, DEFAULT_CANON_ID, canonById, guideKindsForCanon } from '../composition/canons';
import {
  ALL_GUIDES,
  DIAGONAL_GUIDES,
  PHI_GUIDES,
  PHI_INV,
  PHI_INV_SQ,
  ROOT2_GUIDES,
  ROOT2_INV,
  ROOT2_INV_COMPLEMENT,
  guidesForKinds,
  isAxisGuide,
  isSegmentGuide
} from '../composition/guides';
import { distancePointToSegment, scorePointAgainstGuides } from '../composition/scorePointAgainstGuides';
import { useCameraUiStore } from '../state/cameraUiStore';

describe('canon catalogue', () => {
  it('exposes the v1 canon set in order', () => {
    expect(CANON_ORDER).toEqual(['thirds', 'phi', 'root2', 'diagonals']);
    expect(DEFAULT_CANON_ID).toBe('thirds');
  });

  it('resolves canons by id and rejects unknown ids', () => {
    for (const canon of CANONS) {
      expect(canonById(canon.id)).toBe(canon);
    }
    expect(() => canonById('golden-spiral' as never)).toThrow(/Unknown canon id/);
  });

  it('maps each canon to a single dedicated guide kind', () => {
    expect(guideKindsForCanon('thirds')).toEqual(['third']);
    expect(guideKindsForCanon('phi')).toEqual(['phi']);
    expect(guideKindsForCanon('root2')).toEqual(['root2']);
    expect(guideKindsForCanon('diagonals')).toEqual(['diagonal']);
  });

  it('keeps an editorial description on every canon', () => {
    for (const canon of CANONS) {
      expect(canon.description.length).toBeGreaterThan(20);
      expect(canon.name.length).toBeGreaterThan(0);
      expect(canon.glyph.length).toBeGreaterThan(0);
    }
  });
});

describe('canon guide geometry', () => {
  it('derives phi guides from exact golden-section identities', () => {
    expect(PHI_INV).toBeCloseTo(0.6180339887498949, 12);
    expect(PHI_INV_SQ).toBeCloseTo(0.3819660112501051, 12);
    expect(PHI_INV + PHI_INV_SQ).toBeCloseTo(1, 12);
    expect(PHI_INV * PHI_INV).toBeCloseTo(PHI_INV_SQ, 12);

    const values = PHI_GUIDES.map((guide) => guide.value).sort((a, b) => a - b);
    expect(values).toEqual([PHI_INV_SQ, PHI_INV_SQ, PHI_INV, PHI_INV]);
    expect(PHI_GUIDES.filter((guide) => guide.axis === 'x')).toHaveLength(2);
    expect(PHI_GUIDES.filter((guide) => guide.axis === 'y')).toHaveLength(2);
  });

  it('derives root-2 guides from the 1/√2 division', () => {
    expect(ROOT2_INV).toBeCloseTo(0.7071067811865476, 12);
    expect(ROOT2_INV_COMPLEMENT + ROOT2_INV).toBeCloseTo(1, 12);

    const values = ROOT2_GUIDES.map((guide) => guide.value).sort((a, b) => a - b);
    expect(values).toEqual([ROOT2_INV_COMPLEMENT, ROOT2_INV_COMPLEMENT, ROOT2_INV, ROOT2_INV]);
  });

  it('defines both full-frame diagonals as segment guides', () => {
    expect(DIAGONAL_GUIDES).toHaveLength(2);
    const falling = DIAGONAL_GUIDES.find((guide) => guide.label === 'DIAGONAL_FALLING');
    const rising = DIAGONAL_GUIDES.find((guide) => guide.label === 'DIAGONAL_RISING');
    expect(falling).toMatchObject({ axis: 'segment', start: { x: 0, y: 0 }, end: { x: 1, y: 1 } });
    expect(rising).toMatchObject({ axis: 'segment', start: { x: 0, y: 1 }, end: { x: 1, y: 0 } });
    expect(DIAGONAL_GUIDES.every(isSegmentGuide)).toBe(true);
  });

  it('keeps legacy kinds returning only axis guides', () => {
    expect(guidesForKinds(['third', 'half']).every(isAxisGuide)).toBe(true);
    expect(guidesForKinds(['third', 'half'])).toHaveLength(6);
  });

  it('keeps guide labels unique across the full catalogue', () => {
    const labels = ALL_GUIDES.map((guide) => guide.label);
    expect(new Set(labels).size).toBe(labels.length);
  });
});

describe('canon nodes', () => {
  it('places every node on its canon guides (score 100 at zero distance)', () => {
    for (const canon of CANONS) {
      for (const node of canon.nodes) {
        const result = scorePointAgainstGuides(node.point, { activeGuideKinds: canon.guideKinds });
        expect(result.score, `${canon.id} ${node.label}`).toBe(100);
        expect(result.bestHit?.distance ?? 1).toBeLessThan(1e-9);
      }
    }
  });

  it('gives grid canons four intersection nodes', () => {
    expect(canonById('thirds').nodes).toHaveLength(4);
    expect(canonById('phi').nodes).toHaveLength(4);
    expect(canonById('root2').nodes).toHaveLength(4);
  });

  it('places diagonal nodes at the center and the thirds crossings', () => {
    const nodePoints = canonById('diagonals').nodes.map((node) => node.point);
    expect(nodePoints).toContainEqual({ x: 0.5, y: 0.5 });
    expect(nodePoints).toContainEqual({ x: 1 / 3, y: 1 / 3 });
    expect(nodePoints).toContainEqual({ x: 2 / 3, y: 2 / 3 });
    expect(nodePoints).toContainEqual({ x: 2 / 3, y: 1 / 3 });
    expect(nodePoints).toContainEqual({ x: 1 / 3, y: 2 / 3 });
    expect(nodePoints).toHaveLength(5);
  });

  it('keeps node labels unique within each canon', () => {
    for (const canon of CANONS) {
      const labels = canon.nodes.map((node) => node.label);
      expect(new Set(labels).size).toBe(labels.length);
    }
  });
});

describe('segment guide scoring', () => {
  it('computes perpendicular distance to a diagonal', () => {
    expect(distancePointToSegment({ x: 0.5, y: 0.5 }, { x: 0, y: 0 }, { x: 1, y: 1 })).toBeCloseTo(0, 12);
    expect(distancePointToSegment({ x: 0.55, y: 0.45 }, { x: 0, y: 0 }, { x: 1, y: 1 })).toBeCloseTo(0.1 / Math.sqrt(2), 12);
  });

  it('clamps to segment endpoints', () => {
    expect(distancePointToSegment({ x: -0.3, y: 0 }, { x: 0, y: 0 }, { x: 1, y: 1 })).toBeCloseTo(0.3, 12);
    expect(distancePointToSegment({ x: 0.2, y: 0.2 }, { x: 0.5, y: 0.5 }, { x: 0.5, y: 0.5 })).toBeCloseTo(Math.hypot(0.3, 0.3), 12);
  });

  it('scores a point on a diagonal at 100 with the unchanged falloff formula', () => {
    const onDiagonal = scorePointAgainstGuides({ x: 0.25, y: 0.25 }, { activeGuideKinds: ['diagonal'] });
    expect(onDiagonal.score).toBe(100);
    expect(onDiagonal.bestHit?.guide.label).toBe('DIAGONAL_FALLING');

    const nearFallingDiagonal = scorePointAgainstGuides({ x: 0.3, y: 0.2 }, { activeGuideKinds: ['diagonal'] });
    expect(nearFallingDiagonal.bestHit?.guide.label).toBe('DIAGONAL_FALLING');
    expect(nearFallingDiagonal.score).toBe(Math.round((1 - 0.1 / Math.sqrt(2) / 0.12) * 100));

    const farFromDiagonals = scorePointAgainstGuides({ x: 0.9, y: 0.5 }, { activeGuideKinds: ['diagonal'] });
    expect(farFromDiagonals.score).toBe(0);
  });

  it('returns hits for both diagonals sorted by score', () => {
    const result = scorePointAgainstGuides({ x: 0.5, y: 0.5 }, { activeGuideKinds: ['diagonal'] });
    expect(result.hits).toHaveLength(2);
    expect(result.hits[0]?.score).toBe(100);
    expect(result.hits[1]?.score).toBe(100);
  });
});

describe('camera ui store canon state', () => {
  it('defaults to the thirds canon and updates via setCanonId', () => {
    expect(useCameraUiStore.getState().canonId).toBe('thirds');
    useCameraUiStore.getState().setCanonId('phi');
    expect(useCameraUiStore.getState().canonId).toBe('phi');
    useCameraUiStore.getState().setCanonId(DEFAULT_CANON_ID);
    expect(useCameraUiStore.getState().canonId).toBe(DEFAULT_CANON_ID);
  });
});
