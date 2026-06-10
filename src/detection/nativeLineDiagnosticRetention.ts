import type { NativeFrameAnalysisResult } from './nativeHeuristicTypes';
import { normalizedHorizontalLineOverlayY } from './nativeLineDiagnosticOverlay';

export const LINE_DIAGNOSTIC_RETENTION_MS = 900;
export const LINE_STABILITY_OBSERVATION_WINDOW_MS = 700;
export const LINE_STABILITY_MAX_Y_DELTA = 0.06;

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

function recentLineAgeMs(analysis: NativeFrameAnalysisResult, previousAnalysisWithLine: NativeFrameAnalysisResult): number {
  return Math.max(0, analysis.createdAtMs - previousAnalysisWithLine.createdAtMs);
}

function hasCoherentRecentLine(analysis: NativeFrameAnalysisResult, previousAnalysisWithLine: NativeFrameAnalysisResult | null): boolean {
  if (!previousAnalysisWithLine || !hasRenderableHorizontalLine(previousAnalysisWithLine)) return false;
  if (recentLineAgeMs(analysis, previousAnalysisWithLine) > LINE_STABILITY_OBSERVATION_WINDOW_MS) return false;

  const currentY = normalizedHorizontalLineOverlayY(analysis.lineCandidate);
  const previousY = normalizedHorizontalLineOverlayY(previousAnalysisWithLine.lineCandidate);
  if (currentY === null || previousY === null) return false;

  return Math.abs(currentY - previousY) <= LINE_STABILITY_MAX_Y_DELTA;
}

export function stabilizeRecentHorizontalLine(
  analysis: NativeFrameAnalysisResult,
  previousObservedAnalysisWithLine: NativeFrameAnalysisResult | null,
  previousStableAnalysisWithLine: NativeFrameAnalysisResult | null
): NativeFrameAnalysisResult {
  if (analysis.analysisSource !== 'live-frame' || analysis.status === 'unavailable' || analysis.status === 'error') return analysis;

  if (analysis.lineCandidate) {
    if (hasCoherentRecentLine(analysis, previousObservedAnalysisWithLine) || hasCoherentRecentLine(analysis, previousStableAnalysisWithLine)) {
      return analysis;
    }

    return {
      ...analysis,
      lineCandidate: null
    };
  }

  return retainRecentHorizontalLine(analysis, previousStableAnalysisWithLine);
}
