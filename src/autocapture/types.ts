import type { DetectionMode } from '../detection/types';
import type { NativeFrameAnalysisResult } from '../detection/nativeHeuristicTypes';

export type FrameQuality = {
  sharpnessScore: number;
  exposureScore: number;
  motionScore: number;
  sceneChangedScore: number;
};

export type AutoCaptureConfig = {
  compositionThreshold: number;
  sharpnessThreshold: number;
  exposureThreshold: number;
  motionMax: number;
  sceneChangedThreshold: number;
  stableDurationMs: number;
  cooldownMs: number;
};

export type AutoCaptureInput = {
  nowMs: number;
  armed: boolean;
  compositionScore: number;
  quality: FrameQuality;
  lastCaptureAtMs: number | null;
  stableSinceMs: number | null;
};

export type AutoCaptureDecision =
  | {
      kind: 'idle';
      reason: string;
      nextStableSinceMs: number | null;
    }
  | {
      kind: 'candidate';
      reason: string;
      stableForMs: number;
      nextStableSinceMs: number;
    }
  | {
      kind: 'capture';
      reason: string;
      nextStableSinceMs: number | null;
    };

export type CaptureReadinessCalibrationInput = {
  nowMs: number;
  armed: boolean;
  detectionMode: DetectionMode;
  modeLabel?: string | null;
  hasCandidate: boolean;
  compositionScore: number;
  compositionThreshold: number;
  quality: FrameQuality;
  sharpnessThreshold: number;
  exposureThreshold: number;
  candidateConfidence?: number | null;
  lineContribution?: number;
  decision: AutoCaptureDecision;
  nativeAnalysis?: NativeFrameAnalysisResult | null;
};
