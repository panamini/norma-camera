import type { CompositionScoreResult, GuideKind, NormalizedPoint } from '../composition/types';
import type { NativeFrameAnalysisResult } from './nativeHeuristicTypes';

export type { NormalizedPoint };

export type NormalizedRect = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export type DetectionSource = 'manual' | 'heuristic-placeholder' | 'simulated-detector' | 'native-heuristic' | 'none';

export type DetectionMode = 'manual' | 'auto-placeholder' | 'simulated-detector' | 'native-heuristic';

export type CompositionCandidate = {
  id: string;
  source: DetectionSource;
  label: string;
  center: NormalizedPoint;
  bounds?: NormalizedRect;
  confidence: number;
  createdAtMs: number;
};

export type CandidateSelectionInput = {
  nowMs: number;
  manualSubject?: NormalizedPoint | null;
  autoMode: DetectionMode;
  simulatedStep?: number;
  nativeFrameAnalysis?: NativeFrameAnalysisResult | null;
};

export type CandidateSelectionResult = {
  candidate: CompositionCandidate | null;
  modeLabel: string;
  explanation: string;
};

export type DetectedCompositionScoreInput = {
  candidate: CompositionCandidate | null;
  activeGuideKinds: GuideKind[];
  explanation?: string;
};

export type DetectedCompositionScore = {
  candidate: CompositionCandidate | null;
  composition: CompositionScoreResult;
  scoreResult: CompositionScoreResult;
  source: DetectionSource;
  confidence: number;
  explanation: string;
};

export type DetectedCompositionScoreResult = DetectedCompositionScore;
