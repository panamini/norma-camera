import type { GuideKind } from '../composition/types';
import { nowMs } from '../shared/time';
import { scoreHorizontalLineAgainstGuides, type LineGuideScoreResult } from './lineGuideScore';
import type { NativeFrameAnalysisResult, NativeLineCandidate } from './nativeHeuristicTypes';

export const STALE_NATIVE_ANALYSIS_MS = 1_500;
export const NATIVE_VISUAL_MASS_ACTIVE_CONFIDENCE_MIN = 0.2;
// Held confidence is readout-only: the adapter reports the held state but does not admit it as an active candidate.
export const NATIVE_VISUAL_MASS_HELD_CONFIDENCE_MIN = 0.14;

type NativeVisualMassState = 'active' | 'held briefly' | 'no strong native candidate' | 'stale live frame' | 'unavailable' | 'error';

function formatFixedMetric(value: number | undefined, digits: number): string {
  return typeof value === 'number' && Number.isFinite(value) ? value.toFixed(digits) : 'n/a';
}

function analysisAgeMs(analysis: Pick<NativeFrameAnalysisResult, 'createdAtMs'>, currentNowMs: number): number {
  return Math.max(0, Math.round(currentNowMs - analysis.createdAtMs));
}

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}

function formatVisualConfidence(analysis: NativeFrameAnalysisResult): string {
  const confidence = analysis.subject?.confidence;
  return typeof confidence === 'number' && Number.isFinite(confidence) ? `${Math.round(clamp01(confidence) * 100)}%` : 'n/a';
}

function formatGuideScore(guideScore: number | null | undefined): string {
  return typeof guideScore === 'number' && Number.isFinite(guideScore) ? `${Math.round(Math.max(0, Math.min(100, guideScore)))} / 100` : 'n/a';
}

function formatUpdateText(analysis: NativeFrameAnalysisResult): string {
  if (typeof analysis.updateCount === 'number') return `updates ${Math.round(analysis.updateCount)}`;
  return `fps ${formatFixedMetric(analysis.analysisFps, 1)}`;
}

function formatHorizontalLineDiagnostic(lineCandidate: NativeLineCandidate | null | undefined, lineGuideScore: LineGuideScoreResult): string {
  if (!lineCandidate || !lineGuideScore.hasLine || lineGuideScore.lineY === null) return 'horizontal line: no strong line candidate';

  const confidence = Math.round(clamp01(lineCandidate.confidence) * 100);
  return `horizontal line: y ${lineGuideScore.lineY.toFixed(2)} · confidence ${confidence}% · diagnostic only`;
}

function formatLineGuideScore(lineGuideScore: LineGuideScoreResult): string {
  if (!lineGuideScore.hasLine || lineGuideScore.score === null || lineGuideScore.nearestGuideLabel === null || lineGuideScore.distance === null) return 'line guide score n/a';
  return `line guide score ${formatGuideScore(lineGuideScore.score)} · nearest ${lineGuideScore.nearestGuideLabel} · distance ${lineGuideScore.distance.toFixed(3)} · diagnostic only`;
}

export function nativeVisualMassStateForAnalysis(analysis: NativeFrameAnalysisResult | null): NativeVisualMassState {
  if (!analysis) return 'unavailable';
  if (analysis.analysisSource === 'stale-live-frame') return 'stale live frame';
  if (analysis.status === 'error') return 'error';
  if (analysis.status === 'unavailable' || analysis.analysisSource === 'analyzer-unavailable') return 'unavailable';

  const confidence = analysis.subject?.confidence;
  if (typeof confidence !== 'number' || !Number.isFinite(confidence)) return 'no strong native candidate';
  if (confidence >= NATIVE_VISUAL_MASS_ACTIVE_CONFIDENCE_MIN) return 'active';
  if (confidence >= NATIVE_VISUAL_MASS_HELD_CONFIDENCE_MIN) return 'held briefly';
  return 'no strong native candidate';
}

function formatNativeReadout(params: {
  sourceText: string;
  ageText: string;
  updateText: string;
  meanLumaText: string;
  edgeEnergyText: string;
  visualMassState: NativeVisualMassState;
  visualConfidenceText: string;
  guideScore: number | null | undefined;
  lineCandidate?: NativeLineCandidate | null;
  activeGuideKinds?: GuideKind[];
}): string {
  const lineGuideScore = scoreHorizontalLineAgainstGuides(params.lineCandidate, params.activeGuideKinds);
  return [
    `source ${params.sourceText} · live frame age ${params.ageText} · ${params.updateText}`,
    `meanLuma ${params.meanLumaText} · edgeEnergy ${params.edgeEnergyText}`,
    `native visual mass: ${params.visualMassState} · visual confidence ${params.visualConfidenceText}`,
    `guide score ${formatGuideScore(params.guideScore)}`,
    formatHorizontalLineDiagnostic(params.lineCandidate, lineGuideScore),
    formatLineGuideScore(lineGuideScore)
  ].join('\n');
}

export function normalizeNativeAnalysisFreshness(
  analysis: NativeFrameAnalysisResult | null,
  currentNowMs: number = nowMs(),
  staleAfterMs: number = STALE_NATIVE_ANALYSIS_MS
): NativeFrameAnalysisResult | null {
  if (!analysis || analysis.analysisSource !== 'live-frame') return analysis;

  const ageMs = analysisAgeMs(analysis, currentNowMs);
  if (ageMs <= staleAfterMs) return analysis;

  return {
    ...analysis,
    status: 'unavailable',
    subject: null,
    lineCandidate: null,
    exposure: null,
    sharpness: null,
    analysisSource: 'stale-live-frame',
    explanation: `Stale live frame analysis (${ageMs} ms old). Waiting for fresh VisionCamera frames.`
  };
}

export function makeNativeAnalysisDebugLine(
  analysis: NativeFrameAnalysisResult | null,
  showNativeDebug: boolean,
  currentNowMs: number = nowMs(),
  guideScore?: number | null,
  activeGuideKinds?: GuideKind[]
): string | null {
  const freshAnalysis = normalizeNativeAnalysisFreshness(analysis, currentNowMs);

  if (freshAnalysis?.analysisSource === 'live-frame') {
    const ageMs = analysisAgeMs(freshAnalysis, currentNowMs);
    return formatNativeReadout({
      sourceText: 'live frame',
      ageText: `${ageMs} ms`,
      updateText: formatUpdateText(freshAnalysis),
      meanLumaText: formatFixedMetric(freshAnalysis.exposure?.meanLuma, 3),
      edgeEnergyText: formatFixedMetric(freshAnalysis.sharpness?.edgeEnergy, 4),
      visualMassState: nativeVisualMassStateForAnalysis(freshAnalysis),
      visualConfidenceText: formatVisualConfidence(freshAnalysis),
      guideScore,
      lineCandidate: freshAnalysis.lineCandidate,
      activeGuideKinds
    });
  }

  if (freshAnalysis?.analysisSource === 'stale-live-frame') {
    const ageMs = analysisAgeMs(freshAnalysis, currentNowMs);
    return formatNativeReadout({
      sourceText: 'stale live frame',
      ageText: `${ageMs} ms`,
      updateText: 'updates n/a',
      meanLumaText: 'n/a',
      edgeEnergyText: 'n/a',
      visualMassState: 'stale live frame',
      visualConfidenceText: 'n/a',
      guideScore: null,
      lineCandidate: null,
      activeGuideKinds
    });
  }

  if (freshAnalysis?.analysisSource === 'analyzer-unavailable') {
    const ageMs = analysisAgeMs(freshAnalysis, currentNowMs);
    return formatNativeReadout({
      sourceText: 'analyzer unavailable',
      ageText: `${ageMs} ms`,
      updateText: 'updates n/a',
      meanLumaText: 'n/a',
      edgeEnergyText: 'n/a',
      visualMassState: 'unavailable',
      visualConfidenceText: 'n/a',
      guideScore: null,
      lineCandidate: null,
      activeGuideKinds
    });
  }

  if (!showNativeDebug) return null;
  return formatNativeReadout({
    sourceText: 'bridge inactive',
    ageText: 'n/a',
    updateText: 'updates n/a',
    meanLumaText: 'n/a',
    edgeEnergyText: 'n/a',
    visualMassState: 'unavailable',
    visualConfidenceText: 'n/a',
    guideScore: null,
    lineCandidate: null,
    activeGuideKinds
  });
}
