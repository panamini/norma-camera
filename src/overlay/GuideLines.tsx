import { Canvas, Line, vec } from '@shopify/react-native-skia';
import { memo } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle } from 'react-native-reanimated';
import { guidesForKinds } from '../composition/guides';
import type { GuideKind } from '../composition/types';
import type { CompositionSharedValues } from '../composition/useCompositionSharedValues';

type Props = {
  width: number;
  height: number;
  activeGuideKinds: GuideKind[];
  sharedValues: CompositionSharedValues;
};

type HighlightLineProps = {
  axis: 'x' | 'y';
  value: number;
  width: number;
  height: number;
  sharedValues: CompositionSharedValues;
};

function HighlightLine({ axis, value, width, height, sharedValues }: HighlightLineProps) {
  const animatedStyle = useAnimatedStyle(() => {
    const selectedValue = axis === 'x' ? sharedValues.bestGuideX.value : sharedValues.bestGuideY.value;
    const selected = Math.abs(selectedValue - value) < 0.001 ? 1 : 0;

    return {
      opacity: selected * sharedValues.highlightIntensity.value
    };
  });

  const staticStyle =
    axis === 'x'
      ? [styles.highlightBase, styles.vertical, { left: width * value - 1 }]
      : [styles.highlightBase, styles.horizontal, { top: height * value - 1 }];

  return <Animated.View pointerEvents="none" style={[staticStyle, animatedStyle]} />;
}

function GuideLinesComponent({ width, height, activeGuideKinds, sharedValues }: Props) {
  const guides = guidesForKinds(activeGuideKinds);

  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <Canvas style={StyleSheet.absoluteFill}>
        {guides.map((guide) => {
          const key = `${guide.axis}-${guide.kind}-${guide.value}`;
          const p1 = guide.axis === 'x' ? vec(width * guide.value, 0) : vec(0, height * guide.value);
          const p2 = guide.axis === 'x' ? vec(width * guide.value, height) : vec(width, height * guide.value);

          return <Line key={key} p1={p1} p2={p2} color="rgba(255,255,255,0.46)" strokeWidth={1} />;
        })}
      </Canvas>
      {guides.map((guide) => (
        <HighlightLine
          key={`${guide.axis}-${guide.value}-highlight`}
          axis={guide.axis}
          value={guide.value}
          width={width}
          height={height}
          sharedValues={sharedValues}
        />
      ))}
    </View>
  );
}

export const GuideLines = memo(GuideLinesComponent);

const styles = StyleSheet.create({
  highlightBase: {
    position: 'absolute',
    backgroundColor: '#f2b84b'
  },
  vertical: {
    top: 0,
    bottom: 0,
    width: 2
  },
  horizontal: {
    left: 0,
    right: 0,
    height: 2
  }
});
