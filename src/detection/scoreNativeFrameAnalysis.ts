import type { GuideKind } from '../composition/types';
import { scoreDetectedComposition } from './scoreDetectedComposition';
import { selectNativeVisualMassCandidate } from './nativeVisualMassCandidate';
import type { DetectedCompositionScore } from './types';
import type { NativeFrameAnalysisResult } from './nativeHeuristicTypes';

export function scoreNativeFrameAnalysis(
  analysis: NativeFrameAnalysisResult | null,
  activeGuideKinds: GuideKind[],
  nowMs: number
): DetectedCompositionScore {
  const selection = selectNativeVisualMassCandidate({
    analysis,
    nowMs
  });

  return scoreDetectedComposition(selection.candidate, activeGuideKinds, selection.explanation);
}
