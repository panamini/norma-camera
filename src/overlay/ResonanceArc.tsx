import { Canvas, Circle, Path, Skia } from '@shopify/react-native-skia';
import { memo, useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { useDerivedValue } from 'react-native-reanimated';
import type { CompositionSharedValues } from '../composition/useCompositionSharedValues';
import { normaColors } from '../ui/theme';

type Props = {
  size: number;
  readyThreshold: number;
  sharedValues: CompositionSharedValues;
};

const STROKE_WIDTH = 3;
const READY_RING_INSET = -3;

/**
 * The resonance arc: the composition score as a ring that fills clockwise
 * from 12 o'clock. A thin outer ring fades in as the frame approaches the
 * ready threshold. Driven by the score shared value on the UI thread.
 */
function ResonanceArcComponent({ size, readyThreshold, sharedValues }: Props) {
  const ringPath = useMemo(() => {
    const path = Skia.Path.Make();
    path.addArc(
      { x: STROKE_WIDTH / 2, y: STROKE_WIDTH / 2, width: size - STROKE_WIDTH, height: size - STROKE_WIDTH },
      -90,
      360
    );
    return path;
  }, [size]);

  const progress = useDerivedValue(() => Math.min(100, Math.max(0, sharedValues.compositionScore.value)) / 100);

  const readyGlow = useDerivedValue(() => {
    const rampStart = readyThreshold - 8;
    return Math.min(1, Math.max(0, (sharedValues.compositionScore.value - rampStart) / (readyThreshold - rampStart)));
  });

  const center = size / 2;
  const trackRadius = (size - STROKE_WIDTH) / 2;

  return (
    <View pointerEvents="none" style={[styles.root, { width: size, height: size }]}>
      <Canvas style={StyleSheet.absoluteFill}>
        <Circle cx={center} cy={center} r={trackRadius} style="stroke" strokeWidth={1.5} color={normaColors.paperGhost} />
        <Path
          path={ringPath}
          style="stroke"
          strokeWidth={STROKE_WIDTH}
          strokeCap="round"
          color={normaColors.accent}
          start={0}
          end={progress}
        />
        <Circle
          cx={center}
          cy={center}
          r={trackRadius - READY_RING_INSET}
          style="stroke"
          strokeWidth={1}
          color={normaColors.accentFaint}
          opacity={readyGlow}
        />
      </Canvas>
    </View>
  );
}

export const ResonanceArc = memo(ResonanceArcComponent);

const styles = StyleSheet.create({
  root: {
    position: 'absolute'
  }
});
