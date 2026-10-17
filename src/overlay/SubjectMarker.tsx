import { memo } from 'react';
import { StyleSheet } from 'react-native';
import Animated, { useAnimatedStyle } from 'react-native-reanimated';
import type { CompositionSharedValues } from '../composition/useCompositionSharedValues';
import type { DetectionSource } from '../detection/types';
import { normaColors } from '../ui/theme';

type Props = {
  width: number;
  height: number;
  sharedValues: CompositionSharedValues;
  source: DetectionSource;
};

const MARKER_SIZE = 30;

function SubjectMarkerComponent({ width, height, sharedValues, source }: Props) {
  const markerStyle = useAnimatedStyle(() => ({
    opacity: sharedValues.hasSubject.value,
    transform: [
      { translateX: sharedValues.subjectX.value * width - MARKER_SIZE / 2 },
      { translateY: sharedValues.subjectY.value * height - MARKER_SIZE / 2 },
      { scale: 0.9 + sharedValues.highlightIntensity.value * 0.1 }
    ]
  }));

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.marker,
        source === 'manual'
          ? styles.manualMarker
          : source === 'heuristic-placeholder'
            ? styles.placeholderMarker
            : source === 'native-heuristic'
              ? styles.nativeMarker
              : styles.simulatedMarker,
        markerStyle
      ]}
    />
  );
}

export const SubjectMarker = memo(SubjectMarkerComponent);

const styles = StyleSheet.create({
  marker: {
    position: 'absolute',
    left: 0,
    top: 0,
    width: MARKER_SIZE,
    height: MARKER_SIZE,
    borderRadius: MARKER_SIZE / 2,
    borderWidth: 1.5
  },
  // Gold ring = the user's own mark; paper ring = Norma's evidence.
  manualMarker: {
    borderColor: normaColors.accent,
    backgroundColor: normaColors.accentSoft
  },
  placeholderMarker: {
    borderColor: normaColors.paperFaint,
    backgroundColor: normaColors.paperGhost
  },
  simulatedMarker: {
    borderColor: normaColors.accentFaint,
    backgroundColor: normaColors.accentSoft
  },
  nativeMarker: {
    borderColor: normaColors.paperDim,
    backgroundColor: normaColors.paperGhost
  }
});
