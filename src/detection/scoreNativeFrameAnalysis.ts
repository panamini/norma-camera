import type { GuideKind } from '../composition/types';
import { scoreDetectedComposition } from './scoreDetectedComposition';
import { selectCompositionCandidate } from './selectCompositionCandidate';
import type { DetectedCompositionScore } from './types';
import type { NativeFrameAnalysisResult } from './nativeHeuristicTypes';

export function scoreNativeFrameAnalysis(
  analysis: NativeFrameAnalysisResult | null,
  activeGuideKinds: GuideKind[],
  nowMs: number
): DetectedCompositionScore {
  const selection = selectCompositionCandidate({
    nowMs,
    autoMode: 'native-heuristic',
    nativeFrameAnalysis: analysis
  });

  return scoreDetectedComposition(selection.candidate, activeGuideKinds, selection.explanation);
}
