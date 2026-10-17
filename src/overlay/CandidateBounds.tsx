import { memo } from 'react';
import { StyleSheet } from 'react-native';
import Animated, { useAnimatedStyle } from 'react-native-reanimated';
import type { CompositionSharedValues } from '../composition/useCompositionSharedValues';
import type { DetectionSource } from '../detection/types';
import { normaColors } from '../ui/theme';

type Props = {
  width: number;
  height: number;
  source: DetectionSource;
  sharedValues: CompositionSharedValues;
};

function CandidateBoundsComponent({ width, height, source, sharedValues }: Props) {
  const animatedStyle = useAnimatedStyle(() => ({
    opacity: sharedValues.hasSubject.value * sharedValues.hasCandidateBounds.value,
    width: sharedValues.candidateBoundsWidth.value * width,
    height: sharedValues.candidateBoundsHeight.value * height,
    transform: [
      { translateX: sharedValues.candidateBoundsX.value * width },
      { translateY: sharedValues.candidateBoundsY.value * height }
    ]
  }));

  if (source === 'manual' || source === 'none') {
    return null;
  }

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.bounds,
        source === 'heuristic-placeholder'
          ? styles.placeholderBounds
          : source === 'native-heuristic'
            ? styles.nativeBounds
            : source === 'simulated-detector'
              ? styles.simulatedBounds
              : styles.simulatedBounds,
        animatedStyle
      ]}
    />
  );
}

export const CandidateBounds = memo(CandidateBoundsComponent);

const styles = StyleSheet.create({
  bounds: {
    position: 'absolute',
    left: 0,
    top: 0,
    borderWidth: 1,
    borderRadius: 3
  },
  placeholderBounds: {
    borderColor: normaColors.paperFaint,
    borderStyle: 'dashed'
  },
  simulatedBounds: {
    borderColor: normaColors.accentFaint
  },
  nativeBounds: {
    borderColor: normaColors.paperDim
  }
});
