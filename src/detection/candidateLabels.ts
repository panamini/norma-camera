import type { DetectionMode, DetectionSource } from './types';

export function modeLabelForDetectionMode(mode: DetectionMode): string {
  switch (mode) {
    case 'manual':
      return 'MANUAL V0';
    case 'auto-placeholder':
      return 'AUTO V0.2 · PLACEHOLDER';
    case 'simulated-detector':
      return 'SIMULATED DETECTOR';
  }
}

export function instructionForDetectionMode(mode: DetectionMode, hasCandidate: boolean): string {
  switch (mode) {
    case 'manual':
      return hasCandidate ? 'Manual fallback point is being scored.' : 'Tap subject point.';
    case 'auto-placeholder':
      return hasCandidate ? 'No real object detection yet.' : 'Tap subject or switch Auto.';
    case 'simulated-detector':
      return 'Testing auto-capture flow.';
  }
}

export function displayNameForDetectionSource(source: DetectionSource): string {
  switch (source) {
    case 'manual':
      return 'manual subject';
    case 'heuristic-placeholder':
      return 'placeholder subject';
    case 'simulated-detector':
      return 'simulated subject';
    case 'none':
      return 'no subject';
  }
}

export function labelForCandidateSource(source: DetectionSource): string {
  return displayNameForDetectionSource(source);
}

export function shortLabelForCandidateSource(source: DetectionSource): string {
  switch (source) {
    case 'manual':
      return 'MANUAL';
    case 'heuristic-placeholder':
      return 'PLACEHOLDER';
    case 'simulated-detector':
      return 'SIMULATED';
    case 'none':
      return 'NONE';
  }
}

export function formatCandidateConfidence(confidence: number): string {
  return `${Math.round(Math.max(0, Math.min(1, confidence)) * 100)}%`;
}
