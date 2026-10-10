export type NormalizedPoint = {
  x: number;
  y: number;
};

export type GuideKind = 'third' | 'half' | 'phi' | 'root2' | 'diagonal';
export type Axis = 'x' | 'y';

export type CanonId = 'thirds' | 'phi' | 'root2' | 'diagonals';

export type AxisGuide = {
  axis: Axis;
  kind: GuideKind;
  value: number;
  label: string;
};

export type SegmentGuide = {
  axis: 'segment';
  kind: GuideKind;
  start: NormalizedPoint;
  end: NormalizedPoint;
  label: string;
};

export type CompositionGuide = AxisGuide | SegmentGuide;

export type CanonNode = {
  point: NormalizedPoint;
  label: string;
};

export type CanonDefinition = {
  id: CanonId;
  name: string;
  glyph: string;
  guideKinds: GuideKind[];
  nodes: CanonNode[];
  description: string;
};

export type GuideHit = {
  guide: CompositionGuide;
  distance: number;
  score: number;
};

export type ScorePointOptions = {
  activeGuideKinds: GuideKind[];
  maxDistance?: number;
};

export type ScorePointResult = {
  score: number;
  bestHit: GuideHit | null;
  hits: GuideHit[];
};

export type CompositionScoreInput = {
  subjectCenter?: NormalizedPoint | null;
  activeGuideKinds: GuideKind[];
  lineAlignmentScore?: number | null;
};

export type CompositionScoreResult = {
  score: number;
  baseGuideScore: number;
  lineAlignmentScore: number | null;
  lineContribution: number;
  bestHit: GuideHit | null;
  label: string;
  isInteresting: boolean;
};
