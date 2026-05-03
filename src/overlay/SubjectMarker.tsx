import { memo } from 'react';
import { StyleSheet } from 'react-native';
import Animated, { useAnimatedStyle } from 'react-native-reanimated';
import type { CompositionSharedValues } from '../composition/useCompositionSharedValues';

type Props = {
  width: number;
  height: number;
  sharedValues: CompositionSharedValues;
};

const MARKER_SIZE = 30;

function SubjectMarkerComponent({ width, height, sharedValues }: Props) {
  const markerStyle = useAnimatedStyle(() => ({
    opacity: sharedValues.hasSubject.value,
    transform: [
      { translateX: sharedValues.subjectX.value * width - MARKER_SIZE / 2 },
      { translateY: sharedValues.subjectY.value * height - MARKER_SIZE / 2 },
      { scale: 0.9 + sharedValues.highlightIntensity.value * 0.1 }
    ]
  }));

  return <Animated.View pointerEvents="none" style={[styles.marker, markerStyle]} />;
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
    borderWidth: 2,
    borderColor: '#f2b84b',
    backgroundColor: 'rgba(242,184,75,0.14)'
  }
});
