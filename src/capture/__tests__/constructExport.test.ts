import { describe, expect, it } from 'vitest';
import { canonById } from '../../composition/canons';
import { canonLineSegments, canonNodePoints } from '../../composition/canonGeometry';
import { PHI_INV, PHI_INV_SQ } from '../../composition/guides';
import type { CapturedPhoto } from '../../state/cameraUiStore';
import { CONSTRUCT_IMPORT_BASE_URL, burnInFileName, constructExportUrl } from '../constructExport';

const photo: CapturedPhoto = {
  uri: 'file:///cache/norma-test.jpg',
  createdAtMs: 1760083200000,
  label: 'SUBJECT ON LEFT PHI',
  score: 86.4,
  canonId: 'phi'
};

describe('constructExportUrl', () => {
  it('builds the Construct import URL with canon metadata only', () => {
    const url = constructExportUrl(photo);
    expect(url.startsWith(`${CONSTRUCT_IMPORT_BASE_URL}?`)).toBe(true);

    const params = new URL(url).searchParams;
    expect(params.get('construct_import')).toBe('1');
    expect(params.get('canon')).toBe('phi');
    expect(params.get('score')).toBe('86');
    expect(params.get('label')).toBe('SUBJECT ON LEFT PHI');
    expect(params.get('captured_at_ms')).toBe('1760083200000');
  });

  it('never embeds the photo uri or file path', () => {
    const url = constructExportUrl(photo);
    expect(url).not.toContain('file://');
    expect(url).not.toContain('norma-test.jpg');
  });
});

describe('burnInFileName', () => {
  it('encodes canon, rounded score, and timestamp', () => {
    expect(burnInFileName(photo)).toBe('norma-phi-86-1760083200000.jpg');
  });
});

describe('canon pixel geometry', () => {
  it('maps thirds lines into pixel space', () => {
    const segments = canonLineSegments(canonById('thirds'), 300, 600);
    const left = segments.find((segment) => segment.key === 'LEFT_THIRD');
    const lower = segments.find((segment) => segment.key === 'LOWER_THIRD');
    expect(left).toMatchObject({ x1: 100, y1: 0, x2: 100, y2: 600 });
    expect(lower).toMatchObject({ x1: 0, y1: 400, x2: 300, y2: 400 });
    expect(segments).toHaveLength(4);
  });

  it('maps diagonal segments corner to corner', () => {
    const segments = canonLineSegments(canonById('diagonals'), 300, 600);
    const falling = segments.find((segment) => segment.key === 'DIAGONAL_FALLING');
    expect(falling).toMatchObject({ x1: 0, y1: 0, x2: 300, y2: 600 });
    expect(segments).toHaveLength(2);
  });

  it('maps phi nodes into pixel space', () => {
    const nodes = canonNodePoints(canonById('phi'), 1000, 1000);
    const upperLeft = nodes.find((node) => node.key === 'PHI_UPPER_LEFT');
    expect(upperLeft?.x).toBeCloseTo(PHI_INV_SQ * 1000, 9);
    expect(upperLeft?.y).toBeCloseTo(PHI_INV_SQ * 1000, 9);
    const lowerRight = nodes.find((node) => node.key === 'PHI_LOWER_RIGHT');
    expect(lowerRight?.x).toBeCloseTo(PHI_INV * 1000, 9);
    expect(nodes).toHaveLength(4);
  });
});
