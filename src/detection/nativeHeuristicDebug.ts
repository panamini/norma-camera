import type { NativeFrameAnalysisResult } from './nativeHeuristicTypes';
import { nowMs } from '../shared/time';

export const STALE_NATIVE_ANALYSIS_MS = 1_500;

function formatFixedMetric(value: number | undefined, digits: number): string {
  return typeof value === 'number' && Number.isFinite(value) ? value.toFixed(digits) : 'n/a';
}

function analysisAgeMs(analysis: Pick<NativeFrameAnalysisResult, 'createdAtMs'>, currentNowMs: number): number {
  return Math.max(0, Math.round(currentNowMs - analysis.createdAtMs));
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
    exposure: null,
    sharpness: null,
    analysisSource: 'stale-live-frame',
    explanation: `Stale live frame analysis (${ageMs} ms old). Waiting for fresh VisionCamera frames.`
  };
}

export function makeNativeAnalysisDebugLine(analysis: NativeFrameAnalysisResult | null, showNativeDebug: boolean, currentNowMs: number = nowMs()): string | null {
  const freshAnalysis = normalizeNativeAnalysisFreshness(analysis, currentNowMs);

  if (freshAnalysis?.analysisSource === 'live-frame') {
    const ageMs = analysisAgeMs(freshAnalysis, currentNowMs);
    const updateText = typeof freshAnalysis.updateCount === 'number' ? `updates ${Math.round(freshAnalysis.updateCount)}` : `fps ${formatFixedMetric(freshAnalysis.analysisFps, 1)}`;
    return `analysis source: live frame · status ${freshAnalysis.status} · age ${ageMs} ms · ${updateText} · meanLuma ${formatFixedMetric(freshAnalysis.exposure?.meanLuma, 3)} · edgeEnergy ${formatFixedMetric(freshAnalysis.sharpness?.edgeEnergy, 4)}`;
  }

  if (freshAnalysis?.analysisSource === 'stale-live-frame') {
    const ageMs = analysisAgeMs(freshAnalysis, currentNowMs);
    return `analysis source: stale live frame · status unavailable · age ${ageMs} ms · updates n/a · meanLuma n/a · edgeEnergy n/a`;
  }

  if (!showNativeDebug) return null;
  return 'analysis source: bridge inactive · status unavailable · age n/a · updates n/a · meanLuma n/a · edgeEnergy n/a';
}
