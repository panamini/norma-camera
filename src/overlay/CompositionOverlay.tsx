import { memo } from 'react';
import { StyleSheet, View } from 'react-native';
import { guideKindsForOverlayMode } from '../composition/guides';
import type { OverlayMode } from '../composition/types';
import type { CompositionSharedValues } from '../composition/useCompositionSharedValues';
import type { NativeLineCandidate, NativeLineSegmentCandidate, NativeVisualMassDebug } from '../detection/nativeHeuristicTypes';
import type { DetectionSource, NormalizedRect } from '../detection/types';
import { CandidateBounds } from './CandidateBounds';
import { GuideLines } from './GuideLines';
import { HorizontalLineDiagnostic } from './HorizontalLineDiagnostic';
import { SubjectMarker } from './SubjectMarker';
import { VisualMassHeatmap } from './VisualMassHeatmap';

type Props = {
  width: number;
  height: number;
  overlayMode: OverlayMode;
  sharedValues: CompositionSharedValues;
  candidateSource: DetectionSource;
  candidateBounds?: NormalizedRect;
  lineCandidate?: NativeLineCandidate | null;
  mappedLineCandidate?: NativeLineCandidate | null;
  lineSegments?: NativeLineSegmentCandidate[] | null;
  showLineSignal?: boolean;
  showLineSegmentSpike?: boolean;
  visualMassDebug?: NativeVisualMassDebug | null;
  showVisualMassDebug?: boolean;
};

function CompositionOverlayComponent({
  width,
  height,
  overlayMode,
  sharedValues,
  candidateSource,
  lineCandidate,
  mappedLineCandidate,
  lineSegments,
  showLineSignal = false,
  showLineSegmentSpike = false,
  visualMassDebug,
  showVisualMassDebug = false
}: Props) {
  if (width <= 0 || height <= 0) {
    return null;
  }

  const activeGuideKinds = guideKindsForOverlayMode(overlayMode);

  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <GuideLines width={width} height={height} activeGuideKinds={activeGuideKinds} sharedValues={sharedValues} />
      <HorizontalLineDiagnostic
        width={width}
        height={height}
        lineCandidate={lineCandidate}
        mappedLineCandidate={mappedLineCandidate}
        lineSegments={lineSegments}
        showLineSignal={showLineSignal}
        showLineSegmentSpike={showLineSegmentSpike}
      />
      {showVisualMassDebug ? <VisualMassHeatmap width={width} height={height} debug={visualMassDebug ?? null} /> : null}
      <CandidateBounds width={width} height={height} source={candidateSource} sharedValues={sharedValues} />
      <SubjectMarker width={width} height={height} sharedValues={sharedValues} source={candidateSource} />
    </View>
  );
}

export const CompositionOverlay = memo(CompositionOverlayComponent);
