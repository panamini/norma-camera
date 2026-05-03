export type NormalizedPoint = {
  x: number;
  y: number;
};

export type GuideKind = 'third' | 'half';
export type Axis = 'x' | 'y';
export type OverlayMode = 'thirds' | 'halves' | 'both';

export type CompositionGuide = {
  axis: Axis;
  kind: GuideKind;
  value: number;
  label: string;
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
};

export type CompositionScoreResult = {
  score: number;
  bestHit: GuideHit | null;
  label: string;
  isInteresting: boolean;
};
