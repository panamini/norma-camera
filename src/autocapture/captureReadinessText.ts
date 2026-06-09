import type { DetectionMode } from '../detection/types';

export function captureReadinessNoCandidateLine(params: { detectionMode: DetectionMode; modeLabel?: string | null }): string {
  if (params.detectionMode !== 'native-heuristic') {
    return 'ARMED · no subject';
  }

  const modeLabel = params.modeLabel ?? '';

  if (modeLabel.includes('stale live frame')) {
    return 'ARMED · no subject · stale live frame';
  }
  if (modeLabel.includes('error')) {
    return 'ARMED · no subject · native error';
  }
  if (modeLabel.includes('unavailable')) {
    return 'ARMED · no subject · native analyzer unavailable';
  }
  return 'ARMED · no subject · no strong native candidate';
}
