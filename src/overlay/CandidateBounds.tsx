import { memo } from 'react';
import { StyleSheet } from 'react-native';
import Animated, { useAnimatedStyle } from 'react-native-reanimated';
import type { CompositionSharedValues } from '../composition/useCompositionSharedValues';
import type { DetectionSource } from '../detection/types';

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
      style={[styles.bounds, source === 'heuristic-placeholder' ? styles.placeholderBounds : styles.simulatedBounds, animatedStyle]}
    />
  );
}

export const CandidateBounds = memo(CandidateBoundsComponent);

const styles = StyleSheet.create({
  bounds: {
    position: 'absolute',
    left: 0,
    top: 0,
    borderWidth: 2,
    borderRadius: 8,
    backgroundColor: 'rgba(0,0,0,0.05)'
  },
  placeholderBounds: {
    borderColor: 'rgba(255,255,255,0.88)',
    borderStyle: 'dashed'
  },
  simulatedBounds: {
    borderColor: '#f2b84b'
  }
});
