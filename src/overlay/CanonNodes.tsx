import { Canvas, Circle, Group, Line, vec } from '@shopify/react-native-skia';
import { memo } from 'react';
import { StyleSheet, View } from 'react-native';
import { useDerivedValue, type SharedValue } from 'react-native-reanimated';
import { DEFAULT_MAX_GUIDE_DISTANCE } from '../composition/scorePointAgainstGuides';
import type { CanonDefinition, CanonNode } from '../composition/types';
import type { CompositionSharedValues } from '../composition/useCompositionSharedValues';
import { normaColors } from '../ui/theme';

type Props = {
  width: number;
  height: number;
  canon: CanonDefinition;
  sharedValues: CompositionSharedValues;
};

type NodeMarkProps = {
  node: CanonNode;
  width: number;
  height: number;
  subjectX: SharedValue<number>;
  subjectY: SharedValue<number>;
  hasSubject: SharedValue<number>;
};

const NODE_LIGHT_RADIUS = DEFAULT_MAX_GUIDE_DISTANCE;
const TICK_HALF_LENGTH = 6;
const GLOW_BASE_RADIUS = 9;
const GLOW_GROWTH = 5;
const CORE_DOT_RADIUS = 2.5;

/**
 * One canon power point: a static paper tick, plus a gold glow that lights
 * up as the subject's visual mass approaches. Activation is derived on the
 * UI thread from the subject shared values (no per-frame React renders).
 */
function CanonNodeMark({ node, width, height, subjectX, subjectY, hasSubject }: NodeMarkProps) {
  const cx = node.point.x * width;
  const cy = node.point.y * height;

  const activation = useDerivedValue(() => {
    if (hasSubject.value < 0.5) return 0;
    const dx = subjectX.value - node.point.x;
    const dy = subjectY.value - node.point.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    const closeness = 1 - Math.min(1, distance / NODE_LIGHT_RADIUS);
    return closeness * closeness;
  });

  const glowRadius = useDerivedValue(() => GLOW_BASE_RADIUS + GLOW_GROWTH * activation.value);

  return (
    <Group>
      <Line
        p1={vec(cx - TICK_HALF_LENGTH, cy)}
        p2={vec(cx + TICK_HALF_LENGTH, cy)}
        color={normaColors.paperDim}
        strokeWidth={1}
      />
      <Line
        p1={vec(cx, cy - TICK_HALF_LENGTH)}
        p2={vec(cx, cy + TICK_HALF_LENGTH)}
        color={normaColors.paperDim}
        strokeWidth={1}
      />
      <Group opacity={activation}>
        <Circle cx={cx} cy={cy} r={glowRadius} color={normaColors.accentSoft} />
        <Circle cx={cx} cy={cy} r={glowRadius} style="stroke" strokeWidth={1.5} color={normaColors.accent} />
        <Circle cx={cx} cy={cy} r={CORE_DOT_RADIUS} color={normaColors.accent} />
      </Group>
    </Group>
  );
}

function CanonNodesComponent({ width, height, canon, sharedValues }: Props) {
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <Canvas style={StyleSheet.absoluteFill}>
        {canon.nodes.map((node) => (
          <CanonNodeMark
            key={node.label}
            node={node}
            width={width}
            height={height}
            subjectX={sharedValues.subjectX}
            subjectY={sharedValues.subjectY}
            hasSubject={sharedValues.hasSubject}
          />
        ))}
      </Canvas>
    </View>
  );
}

export const CanonNodes = memo(CanonNodesComponent);
