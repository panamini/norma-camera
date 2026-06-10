import type { NativeFrameAnalysisResult } from './nativeHeuristicTypes';

export const LINE_DIAGNOSTIC_RETENTION_MS = 900;

export function hasRenderableHorizontalLine(analysis: NativeFrameAnalysisResult | null): boolean {
  const line = analysis?.lineCandidate;
  return Boolean(
    analysis?.analysisSource === 'live-frame' &&
      line &&
      line.kind === 'horizontal-line' &&
      typeof line.y1 === 'number' &&
      Number.isFinite(line.y1) &&
      typeof line.y2 === 'number' &&
      Number.isFinite(line.y2) &&
      typeof line.confidence === 'number' &&
      Number.isFinite(line.confidence)
  );
}

export function retainRecentHorizontalLine(
  analysis: NativeFrameAnalysisResult,
  previousAnalysisWithLine: NativeFrameAnalysisResult | null
): NativeFrameAnalysisResult {
  if (analysis.analysisSource !== 'live-frame' || analysis.status === 'unavailable' || analysis.status === 'error') return analysis;
  if (analysis.lineCandidate) return analysis;
  if (!previousAnalysisWithLine || !hasRenderableHorizontalLine(previousAnalysisWithLine)) return analysis;

  const retainedAgeMs = Math.max(0, analysis.createdAtMs - previousAnalysisWithLine.createdAtMs);
  if (retainedAgeMs > LINE_DIAGNOSTIC_RETENTION_MS) return analysis;

  return {
    ...analysis,
    lineCandidate: previousAnalysisWithLine.lineCandidate
  };
}
