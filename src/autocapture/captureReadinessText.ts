import type { DetectionMode } from '../detection/types';
import type { CaptureReadinessCalibrationInput } from './types';

const NATIVE_ANALYSIS_STALE_AFTER_MS = 1_500;
const MIN_RECOMMENDED_CONFIDENCE = 0.3;

function hasStaleNativeAnalysis(params: CaptureReadinessCalibrationInput): boolean {
  if (params.detectionMode !== 'native-heuristic') return false;
  if (params.nativeAnalysis?.analysisSource === 'stale-live-frame') return true;
  if (params.nativeAnalysis?.analysisSource !== 'live-frame') return false;
  return params.nowMs - params.nativeAnalysis.createdAtMs > NATIVE_ANALYSIS_STALE_AFTER_MS;
}

function lineSignalSuffix(lineContribution: number | undefined): string {
  return lineContribution && lineContribution > 0 ? ` · line signal +${Math.round(lineContribution)}` : '';
}

export function captureReadinessNoCandidateLine(params: { detectionMode: DetectionMode; modeLabel?: string | null }): string {
  if (params.detectionMode !== 'native-heuristic') {
    return 'ARMED · no subject';
  }

  const modeLabel = params.modeLabel ?? '';

  if (modeLabel.includes('stale live frame')) {
    return 'ARMED · no subject · stale live frame';
  }
  if (modeLabel.includes(' · error')) {
    return 'ARMED · no subject · native error';
  }
  if (modeLabel.includes('unavailable')) {
    return 'ARMED · no subject · native analyzer unavailable';
  }
  if (modeLabel.includes('held briefly')) {
    return 'ARMED · held briefly · wait for active native visual mass';
  }
  return 'ARMED · no subject · no strong native candidate';
}

export function captureReadinessLine(params: CaptureReadinessCalibrationInput): string {
  if (!params.armed) {
    return 'ARM OFF · auto-capture disabled';
  }

  if (!params.hasCandidate) {
    return captureReadinessNoCandidateLine({ detectionMode: params.detectionMode, modeLabel: params.modeLabel });
  }

  if (hasStaleNativeAnalysis(params)) {
    return 'ARMED · waiting for fresh analysis';
  }

  if (params.quality.exposureScore < params.exposureThreshold) {
    return 'ARMED · too dark · exposure blocked';
  }

  if (params.quality.sharpnessScore < params.sharpnessThreshold) {
    return 'ARMED · too blurry · sharpness blocked';
  }

  if (params.detectionMode === 'native-heuristic' && typeof params.candidateConfidence === 'number' && params.candidateConfidence < MIN_RECOMMENDED_CONFIDENCE) {
    return 'ARMED · need stronger visual mass confidence';
  }

  if (Math.round(params.compositionScore) < params.compositionThreshold) {
    return `ARMED · adjust composition · score ${Math.round(params.compositionScore)} / ${params.compositionThreshold}`;
  }

  if (params.decision.kind === 'candidate') {
    return `ARMED · hold steady${lineSignalSuffix(params.lineContribution)}`;
  }

  if (params.decision.kind === 'capture') {
    return `ARMED · ready${lineSignalSuffix(params.lineContribution)}`;
  }

  switch (params.decision.reason) {
    case 'sharpness below threshold':
      return 'ARMED · too blurry · sharpness blocked';
    case 'exposure below threshold':
      return 'ARMED · too dark · exposure blocked';
    case 'motion too high':
      return 'ARMED · hold steady · motion high';
    case 'cooldown active':
      return 'ARMED · cooldown active';
    case 'scene unchanged':
      return 'ARMED · hold steady · scene unchanged';
    default:
      return 'ARMED · hold steady';
  }
}
