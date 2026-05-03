import type { NormalizedPoint, NormalizedRect } from './types';

export type NativeHeuristicStatus = 'unavailable' | 'ready' | 'low-confidence' | 'error';

export type NativeSubjectCandidate = {
  center: NormalizedPoint;
  bounds: NormalizedRect;
  confidence: number;
  source: 'native-heuristic';
};

export type NativeLineCandidate = {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  angleDeg: number;
  confidence: number;
  kind: 'horizontal-line' | 'unknown-line';
};

export type NativeExposureMetrics = {
  exposureScore: number;
  meanLuma: number;
  clippedHighlightsRatio: number;
  crushedShadowsRatio: number;
};

export type NativeSharpnessMetrics = {
  sharpnessScore: number;
  edgeEnergy: number;
};

export type NativeFrameAnalysisResult = {
  status: NativeHeuristicStatus;
  createdAtMs: number;
  subject: NativeSubjectCandidate | null;
  lineCandidate?: NativeLineCandidate | null;
  exposure: NativeExposureMetrics | null;
  sharpness: NativeSharpnessMetrics | null;
  explanation: string;
  analysisFps?: number;
};

export type NativeFrameAnalysisModule = {
  getLatestAnalysis?: () => Promise<NativeFrameAnalysisResult | null>;
};
