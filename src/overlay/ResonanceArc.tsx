import { Canvas, Circle, Group, Path, Skia, vec } from '@shopify/react-native-skia';
import { memo, useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { useDerivedValue, type SharedValue } from 'react-native-reanimated';
import { normaColors } from '../ui/theme';

type Props = {
  size: number;
  readyThreshold: number;
  score: SharedValue<number>;
};

const STROKE_WIDTH = 3;
const READY_RING_INSET = 4.5;

/**
 * The resonance arc: the composition score as a ring that fills clockwise
 * from 12 o'clock. A thin inner ring fades in as the frame approaches the
 * ready threshold. Driven by the score shared value on the UI thread.
 */
function ResonanceArcComponent({ size, readyThreshold, score }: Props) {
  const center = size / 2;
  const trackRadius = (size - STROKE_WIDTH) / 2;

  // A circle path starts at 3 o'clock; the group rotation moves the trim
  // start to 12 o'clock. (SkPath.addArc is deprecated in Skia 2.6.)
  const ringPath = useMemo(() => {
    const path = Skia.Path.Make();
    path.addCircle(center, center, trackRadius);
    return path;
  }, [center, trackRadius]);

  const progress = useDerivedValue(() => Math.min(100, Math.max(0, score.value)) / 100);

  const readyGlow = useDerivedValue(() => {
    const rampStart = readyThreshold - 8;
    return Math.min(1, Math.max(0, (score.value - rampStart) / (readyThreshold - rampStart)));
  });

  return (
    <View pointerEvents="none" style={[styles.root, { width: size, height: size }]}>
      <Canvas style={StyleSheet.absoluteFill}>
        <Circle cx={center} cy={center} r={trackRadius} style="stroke" strokeWidth={1.5} color={normaColors.paperGhost} />
        <Group origin={vec(center, center)} transform={[{ rotate: -Math.PI / 2 }]}>
          <Path
            path={ringPath}
            style="stroke"
            strokeWidth={STROKE_WIDTH}
            strokeCap="round"
            color={normaColors.accent}
            start={0}
            end={progress}
          />
        </Group>
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
