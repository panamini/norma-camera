import type { NativeFrameAnalysisResult } from './nativeHeuristicTypes';
import { adaptNativeFrameAnalysisToCandidate, type NativeCandidateAdapterResult } from './nativeHeuristicAdapter';

export function selectNativeVisualMassCandidate(params: {
  analysis: NativeFrameAnalysisResult | null | undefined;
  nowMs: number;
}): NativeCandidateAdapterResult {
  return adaptNativeFrameAnalysisToCandidate(params);
}
