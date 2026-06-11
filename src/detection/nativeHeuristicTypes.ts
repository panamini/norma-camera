import type { NormalizedPoint, NormalizedRect } from './types';

export type NativeHeuristicStatus = 'unavailable' | 'ready' | 'low-confidence' | 'error';
export type NativeLumaValueRange = 'auto' | 'unit' | 'byte';
export type NativeFrameOrientation = 'up' | 'right' | 'down' | 'left';

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

export type NativeLineSegmentCandidate = {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  angleDeg: number;
  lengthEuclidean: number;
  confidence: number;
  orientationKind: 'horizontal' | 'vertical' | 'diagonal' | 'unknown';
  src: 'native-line-segment-spike';
};

export type NativeVisualMassDebugCell = {
  x: number;
  y: number;
  width: number;
  height: number;
  energy: number;
};

export type NativeVisualMassDebugCandidate = {
  center: NormalizedPoint;
  bounds: NormalizedRect;
  confidence: number;
  energy?: number;
  reason?: string;
};

export type NativeVisualMassDebug = {
  gridWidth: number;
  gridHeight: number;
  heatmapWidth: number;
  heatmapHeight: number;
  cells: NativeVisualMassDebugCell[];
  topCandidates: NativeVisualMassDebugCandidate[];
  selectedCandidate: NativeVisualMassDebugCandidate | null;
  stabilizedCandidate: NativeVisualMassDebugCandidate | null;
  explanation: string;
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
  frameWidth?: number;
  frameHeight?: number;
  gridWidth?: number;
  gridHeight?: number;
  frameOrientation?: NativeFrameOrientation;
  isMirrored?: boolean;
  subject: NativeSubjectCandidate | null;
  lineCandidate?: NativeLineCandidate | null;
  lineSegments?: NativeLineSegmentCandidate[];
  exposure: NativeExposureMetrics | null;
  sharpness: NativeSharpnessMetrics | null;
  visualMassDebug?: NativeVisualMassDebug | null;
  explanation: string;
  analysisSource?: 'live-frame' | 'debug-grid' | string;
  updateCount?: number;
  analysisFps?: number;
};

export type NativeFrameAnalysisModule = {
  getLatestAnalysis?: () => Promise<NativeFrameAnalysisResult | null>;
  analyzeDownsampledLumaGrid?: (
    values: number[],
    width: number,
    height: number,
    createdAtMs?: number,
    valueRange?: NativeLumaValueRange
  ) => Promise<NativeFrameAnalysisResult>;
  reset?: () => void | Promise<void>;
};
