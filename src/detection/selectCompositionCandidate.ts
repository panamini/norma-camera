import { clamp } from '../shared/clamp';
import { modeLabelForDetectionMode } from './candidateLabels';
import { adaptNativeFrameAnalysisToCandidate, makeManualFallbackNativeResult } from './nativeHeuristicAdapter';
import type { CandidateSelectionInput, CandidateSelectionResult, CompositionCandidate, NormalizedPoint, NormalizedRect } from './types';

const PLACEHOLDER_CENTER: NormalizedPoint = { x: 1 / 3, y: 1 / 2 };
const PLACEHOLDER_BOUNDS: NormalizedRect = { x: 0.25, y: 0.38, width: 0.18, height: 0.24 };
const SIMULATED_BUCKET_MS = 3000;
const SIMULATED_BOUNDS_WIDTH = 0.22;
const SIMULATED_BOUNDS_HEIGHT = 0.28;

const SIMULATED_CENTERS = [
  { x: 1 / 3, y: 1 / 2, name: 'left-third' },
  { x: 1 / 2, y: 1 / 2, name: 'center' },
  { x: 2 / 3, y: 1 / 2, name: 'right-third' }
] as const;

function makeManualCandidate(point: NormalizedPoint, nowMs: number): CompositionCandidate {
  return {
    id: 'manual-subject',
    source: 'manual',
    label: 'manual subject',
    center: point,
    confidence: 1,
    createdAtMs: nowMs
  };
}

function boundsAround(center: NormalizedPoint, width: number, height: number): NormalizedRect {
  return {
    x: clamp(center.x - width / 2, 0, 1 - width),
    y: clamp(center.y - height / 2, 0, 1 - height),
    width,
    height
  };
}

function simulatedIndex(input: CandidateSelectionInput): number {
  const rawStep = input.simulatedStep ?? Math.floor(input.nowMs / SIMULATED_BUCKET_MS);
  return ((rawStep % SIMULATED_CENTERS.length) + SIMULATED_CENTERS.length) % SIMULATED_CENTERS.length;
}

function selectNativeCandidate(input: CandidateSelectionInput, manualSubject: NormalizedPoint | null): CandidateSelectionResult {
  if (manualSubject) {
    const fallback = makeManualFallbackNativeResult(manualSubject, input.nowMs);
    return {
      candidate: fallback.candidate,
      modeLabel: fallback.modeLabel,
      explanation: fallback.explanation
    };
  }

  const adapted = adaptNativeFrameAnalysisToCandidate({
    analysis: input.nativeFrameAnalysis,
    nowMs: input.nowMs
  });

  return {
    candidate: adapted.candidate,
    modeLabel: adapted.modeLabel,
    explanation: adapted.explanation
  };
}

export function selectCompositionCandidate(input: CandidateSelectionInput): CandidateSelectionResult {
  const manualSubject = input.manualSubject ?? null;

  if (input.autoMode === 'manual') {
    return {
      candidate: manualSubject ? makeManualCandidate(manualSubject, input.nowMs) : null,
      modeLabel: modeLabelForDetectionMode(input.autoMode),
      explanation: manualSubject ? 'Manual mode: scoring the point you tapped.' : 'Manual mode: tap subject point.'
    };
  }

  if (input.autoMode === 'native-heuristic') {
    return selectNativeCandidate(input, manualSubject);
  }

  if (input.autoMode === 'auto-placeholder') {
    if (manualSubject) {
      return {
        candidate: makeManualCandidate(manualSubject, input.nowMs),
        modeLabel: modeLabelForDetectionMode(input.autoMode),
        explanation: 'Manual fallback is overriding the placeholder. No real object detection yet.'
      };
    }

    return {
      candidate: {
        id: 'auto-placeholder-left-third',
        source: 'heuristic-placeholder',
        label: 'placeholder subject',
        center: PLACEHOLDER_CENTER,
        bounds: PLACEHOLDER_BOUNDS,
        confidence: 0.55,
        createdAtMs: input.nowMs
      },
      modeLabel: modeLabelForDetectionMode(input.autoMode),
      explanation: 'No real object detection yet. Placeholder subject is placed on the left third.'
    };
  }

  const simulated = SIMULATED_CENTERS[simulatedIndex(input)];
  const center: NormalizedPoint = { x: simulated.x, y: simulated.y };

  return {
    candidate: {
      id: `simulated-${simulated.name}`,
      source: 'simulated-detector',
      label: 'simulated subject',
      center,
      bounds: boundsAround(center, SIMULATED_BOUNDS_WIDTH, SIMULATED_BOUNDS_HEIGHT),
      confidence: 0.7,
      createdAtMs: input.nowMs
    },
    modeLabel: modeLabelForDetectionMode(input.autoMode),
    explanation: 'Testing auto-capture flow. This is a simulated subject, not real object detection.'
  };
}
