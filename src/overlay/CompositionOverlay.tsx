import { memo } from 'react';
import { StyleSheet, View } from 'react-native';
import type { CanonDefinition } from '../composition/types';
import type { CompositionSharedValues } from '../composition/useCompositionSharedValues';
import type { LineHarmonyMatch } from '../detection/lineHarmony';
import type { NativeLineCandidate, NativeLineSegmentCandidate, NativeVisualMassDebug } from '../detection/nativeHeuristicTypes';
import type { DetectionSource, NormalizedRect } from '../detection/types';
import { CandidateBounds } from './CandidateBounds';
import { CanonLines } from './CanonLines';
import { CanonNodes } from './CanonNodes';
import { HorizontalLineDiagnostic } from './HorizontalLineDiagnostic';
import { LineHarmonyOverlay } from './LineHarmonyOverlay';
import { SubjectMarker } from './SubjectMarker';
import { VisualMassHeatmap } from './VisualMassHeatmap';

type Props = {
  width: number;
  height: number;
  canon: CanonDefinition;
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
  lineHarmonyMatches?: LineHarmonyMatch[];
  showLineHarmony?: boolean;
};

function CompositionOverlayComponent({
  width,
  height,
  canon,
  sharedValues,
  candidateSource,
  lineCandidate,
  mappedLineCandidate,
  lineSegments,
  showLineSignal = false,
  showLineSegmentSpike = false,
  visualMassDebug,
  showVisualMassDebug = false,
  lineHarmonyMatches,
  showLineHarmony = false
}: Props) {
  if (width <= 0 || height <= 0) {
    return null;
  }

  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <CanonLines width={width} height={height} canon={canon} />
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
      {showLineHarmony && lineHarmonyMatches ? <LineHarmonyOverlay width={width} height={height} matches={lineHarmonyMatches} /> : null}
      <CandidateBounds width={width} height={height} source={candidateSource} sharedValues={sharedValues} />
      <CanonNodes width={width} height={height} canon={canon} sharedValues={sharedValues} />
      <SubjectMarker width={width} height={height} sharedValues={sharedValues} source={candidateSource} />
    </View>
  );
}

export const CompositionOverlay = memo(CompositionOverlayComponent);
