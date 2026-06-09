import { nativeVisualMassStateForAnalysis, normalizeNativeAnalysisFreshness } from './nativeHeuristicDebug';
import type { NativeFrameAnalysisResult, NativeSubjectCandidate } from './nativeHeuristicTypes';
import type { CompositionCandidate, NormalizedPoint } from './types';

export const NATIVE_CANDIDATE_CONFIDENCE_MIN = 0.14;
export const NATIVE_ACTIVE_CANDIDATE_CONFIDENCE_MIN = 0.2;

export type NativeCandidateAdapterResult = {
  candidate: CompositionCandidate | null;
  modeLabel: string;
  explanation: string;
  qualityIsReal: boolean;
};

function makeNativeVisualMassCandidate(subject: NativeSubjectCandidate, analysis: NativeFrameAnalysisResult, nowMs: number): CompositionCandidate {
  return {
    id: `native-visual-mass-${analysis.createdAtMs || nowMs}`,
    source: 'native-heuristic',
    label: 'native visual mass',
    center: subject.center,
    bounds: subject.bounds,
    confidence: subject.confidence,
    createdAtMs: analysis.createdAtMs || nowMs
  };
}

export function nativeFrameAnalysisHasRealQuality(analysis: NativeFrameAnalysisResult | null | undefined): boolean {
  return Boolean(
    analysis &&
      analysis.status !== 'unavailable' &&
      analysis.status !== 'error' &&
      typeof analysis.exposure?.exposureScore === 'number' &&
      typeof analysis.sharpness?.sharpnessScore === 'number'
  );
}

export function explainNativeFrameAnalysis(analysis: NativeFrameAnalysisResult | null | undefined): string {
  if (!analysis) {
    return 'Native visual-mass analyzer unavailable. Manual fallback active. No recognition is used.';
  }

  if (analysis.analysisSource === 'stale-live-frame') {
    return analysis.explanation || 'Stale live frame analysis. Waiting for fresh VisionCamera frames.';
  }

  if (analysis.status === 'unavailable') {
    return analysis.explanation || 'Native visual-mass analyzer unavailable. Manual fallback active. No recognition is used.';
  }

  if (analysis.status === 'error') {
    return analysis.explanation || 'Native visual-mass analyzer returned an error. Manual fallback active.';
  }

  if (analysis.status === 'low-confidence') {
    return analysis.explanation || 'Real luminance analysis ran conservatively. No recognition is used.';
  }

  return analysis.explanation || 'Real luminance analysis. Real contrast candidate. No recognition is used.';
}

export function adaptNativeFrameAnalysisToCandidate(params: {
  analysis: NativeFrameAnalysisResult | null | undefined;
  nowMs: number;
}): NativeCandidateAdapterResult {
  const analysis = normalizeNativeAnalysisFreshness(params.analysis ?? null, params.nowMs);

  if (!analysis || analysis.status === 'unavailable') {
    return {
      candidate: null,
      modeLabel: `NATIVE VISUAL MASS · ${nativeVisualMassStateForAnalysis(analysis)}`,
      explanation: explainNativeFrameAnalysis(analysis),
      qualityIsReal: false
    };
  }

  if (analysis.status === 'error') {
    return {
      candidate: null,
      modeLabel: 'NATIVE VISUAL MASS · error',
      explanation: explainNativeFrameAnalysis(analysis),
      qualityIsReal: false
    };
  }

  const qualityIsReal = nativeFrameAnalysisHasRealQuality(analysis);
  const subject = analysis.subject;

  if (!subject || subject.confidence < NATIVE_CANDIDATE_CONFIDENCE_MIN) {
    return {
      candidate: null,
      modeLabel: 'NATIVE VISUAL MASS · no strong native candidate',
      explanation: explainNativeFrameAnalysis(analysis),
      qualityIsReal
    };
  }

  if (subject.confidence < NATIVE_ACTIVE_CANDIDATE_CONFIDENCE_MIN) {
    return {
      candidate: null,
      modeLabel: `NATIVE VISUAL MASS · ${nativeVisualMassStateForAnalysis(analysis)}`,
      explanation: explainNativeFrameAnalysis(analysis),
      qualityIsReal
    };
  }

  return {
    candidate: makeNativeVisualMassCandidate(subject, analysis, params.nowMs),
    modeLabel: `NATIVE VISUAL MASS · ${nativeVisualMassStateForAnalysis(analysis)}`,
    explanation: explainNativeFrameAnalysis(analysis),
    qualityIsReal
  };
}

export function makeManualFallbackNativeResult(point: NormalizedPoint, nowMs: number): NativeCandidateAdapterResult {
  return {
    candidate: {
      id: 'manual-subject',
      source: 'manual',
      label: 'manual subject',
      center: point,
      confidence: 1,
      createdAtMs: nowMs
    },
    modeLabel: 'NATIVE VISUAL MASS · manual fallback',
    explanation: 'Manual fallback is overriding native visual-mass mode. No recognition is used.',
    qualityIsReal: false
  };
}
