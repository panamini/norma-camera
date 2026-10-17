import { PHI_INV, PHI_INV_SQ, ROOT2_INV, ROOT2_INV_COMPLEMENT } from './guides';
import type { CanonDefinition, CanonId, CanonNode, GuideKind } from './types';

export const CANON_EDITORIAL_NOTE = "Norma's canons are editorial choices — classical opinions, openly held. Not objective truth.";

function gridNodes(low: number, high: number, prefix: string): CanonNode[] {
  return [
    { point: { x: low, y: low }, label: `${prefix}_UPPER_LEFT` },
    { point: { x: high, y: low }, label: `${prefix}_UPPER_RIGHT` },
    { point: { x: low, y: high }, label: `${prefix}_LOWER_LEFT` },
    { point: { x: high, y: high }, label: `${prefix}_LOWER_RIGHT` }
  ];
}

const THIRDS_CANON: CanonDefinition = {
  id: 'thirds',
  name: 'Thirds',
  glyph: '⅓',
  guideKinds: ['third'],
  nodes: gridNodes(1 / 3, 2 / 3, 'THIRDS'),
  description:
    'Divide the frame in three; rest the subject where the lines cross. The photographic workhorse — an editorial simplification of older armatures, and it works.'
};

const PHI_CANON: CanonDefinition = {
  id: 'phi',
  name: 'Phi',
  glyph: 'φ',
  guideKinds: ['phi'],
  nodes: gridNodes(PHI_INV_SQ, PHI_INV, 'PHI'),
  description:
    'The golden section: divisions at φ⁻² ≈ 0.382 and φ⁻¹ ≈ 0.618. The classical proportion of painting and architecture — tighter toward the center than thirds.'
};

const ROOT2_CANON: CanonDefinition = {
  id: 'root2',
  name: 'Root 2',
  glyph: '√2',
  guideKinds: ['root2'],
  nodes: gridNodes(ROOT2_INV_COMPLEMENT, ROOT2_INV, 'ROOT2'),
  description:
    'The √2 division at 1/√2 ≈ 0.707 — the proportion of ISO paper, prized by dynamic-symmetry painters. Wider, calmer, more architectural than thirds.'
};

const DIAGONALS_CANON: CanonDefinition = {
  id: 'diagonals',
  name: 'Diagonals',
  glyph: '╳',
  guideKinds: ['diagonal'],
  nodes: [
    { point: { x: 1 / 2, y: 1 / 2 }, label: 'DIAGONALS_CENTER' },
    { point: { x: 1 / 3, y: 1 / 3 }, label: 'DIAGONALS_UPPER_LEFT' },
    { point: { x: 2 / 3, y: 1 / 3 }, label: 'DIAGONALS_UPPER_RIGHT' },
    { point: { x: 1 / 3, y: 2 / 3 }, label: 'DIAGONALS_LOWER_LEFT' },
    { point: { x: 2 / 3, y: 2 / 3 }, label: 'DIAGONALS_LOWER_RIGHT' }
  ],
  description:
    'Both diagonals of the frame. Energy lives along them; the strong points sit where they cross the thirds. The oldest armature there is.'
};

export const CANONS: CanonDefinition[] = [THIRDS_CANON, PHI_CANON, ROOT2_CANON, DIAGONALS_CANON];

export const CANON_ORDER: CanonId[] = CANONS.map((canon) => canon.id);

export const DEFAULT_CANON_ID: CanonId = 'thirds';

export function canonById(id: CanonId): CanonDefinition {
  const canon = CANONS.find((candidate) => candidate.id === id);
  if (!canon) throw new Error(`Unknown canon id: ${id}`);
  return canon;
}

export function guideKindsForCanon(id: CanonId): GuideKind[] {
  return canonById(id).guideKinds;
}
