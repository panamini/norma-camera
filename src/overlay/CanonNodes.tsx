import { Canvas, Circle, Group, Line, vec } from '@shopify/react-native-skia';
import { memo } from 'react';
import { StyleSheet, View } from 'react-native';
import { useDerivedValue, type SharedValue } from 'react-native-reanimated';
import { DEFAULT_AUTO_CAPTURE_CONFIG } from '../autocapture/decideAutoCapture';
import { DEFAULT_MAX_GUIDE_DISTANCE } from '../composition/scorePointAgainstGuides';
import type { CanonDefinition, CanonNode, NormalizedPoint } from '../composition/types';
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
const PULSE_START_RADIUS = 12;
const PULSE_GROWTH = 34;
const NUDGE_READY_THRESHOLD = DEFAULT_AUTO_CAPTURE_CONFIG.compositionThreshold;
const NUDGE_MIN_DISTANCE = 0.03;
const NUDGE_REACH = 0.55;

type NudgeProps = {
  width: number;
  height: number;
  nodes: NormalizedPoint[];
  subjectX: SharedValue<number>;
  subjectY: SharedValue<number>;
  hasSubject: SharedValue<number>;
  compositionScore: SharedValue<number>;
};

/**
 * The nudge comet: a short gold pull from the followed mass toward the
 * nearest power point — "move this way" without words. It fades as the
 * frame approaches ready and disappears once the subject sits close.
 */
function NudgeComet({ width, height, nodes, subjectX, subjectY, hasSubject, compositionScore }: NudgeProps) {
  const target = useDerivedValue(() => {
    const sx = subjectX.value;
    const sy = subjectY.value;
    let bestX = sx;
    let bestY = sy;
    let bestDistance = Number.POSITIVE_INFINITY;
    for (const node of nodes) {
      const dx = node.x - sx;
      const dy = node.y - sy;
      const distance = Math.sqrt(dx * dx + dy * dy);
      if (distance < bestDistance) {
        bestDistance = distance;
        bestX = node.x;
        bestY = node.y;
      }
    }
    return { x: bestX, y: bestY, distance: bestDistance };
  });

  const opacity = useDerivedValue(() => {
    if (hasSubject.value < 0.5) return 0;
    const readiness = Math.min(1, Math.max(0, (NUDGE_READY_THRESHOLD - compositionScore.value) / NUDGE_READY_THRESHOLD));
    const far = Math.min(1, Math.max(0, (target.value.distance - NUDGE_MIN_DISTANCE) / NUDGE_MIN_DISTANCE));
    return readiness * far * 0.85;
  });

  const start = useDerivedValue(() => vec(subjectX.value * width, subjectY.value * height));
  const tip = useDerivedValue(() => {
    const sx = subjectX.value;
    const sy = subjectY.value;
    const toX = sx + (target.value.x - sx) * NUDGE_REACH;
    const toY = sy + (target.value.y - sy) * NUDGE_REACH;
    return vec(toX * width, toY * height);
  });

  return (
    <Group opacity={opacity}>
      <Line p1={start} p2={tip} color={normaColors.accentFaint} strokeWidth={2} />
      <Circle c={tip} r={3.5} color={normaColors.accent} />
    </Group>
  );
}

type LockPulseProps = {
  width: number;
  height: number;
  lockPulse: SharedValue<number>;
  lockNodeX: SharedValue<number>;
  lockNodeY: SharedValue<number>;
};

/**
 * The lock ring: on a node lock, an expanding gold ring leaves the locked
 * node and dissolves (lockPulse eases 0 → 1; it rests at 1, invisible).
 */
function LockPulseRing({ width, height, lockPulse, lockNodeX, lockNodeY }: LockPulseProps) {
  const cx = useDerivedValue(() => lockNodeX.value * width);
  const cy = useDerivedValue(() => lockNodeY.value * height);
  const radius = useDerivedValue(() => PULSE_START_RADIUS + PULSE_GROWTH * lockPulse.value);
  const opacity = useDerivedValue(() => {
    if (lockNodeX.value < 0) return 0;
    return (1 - lockPulse.value) * 0.9;
  });

  return (
    <Group opacity={opacity}>
      <Circle cx={cx} cy={cy} r={radius} style="stroke" strokeWidth={2} color={normaColors.accent} />
    </Group>
  );
}

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
        color={normaColors.lineShadow}
        strokeWidth={2.5}
      />
      <Line
        p1={vec(cx, cy - TICK_HALF_LENGTH)}
        p2={vec(cx, cy + TICK_HALF_LENGTH)}
        color={normaColors.lineShadow}
        strokeWidth={2.5}
      />
      <Line
        p1={vec(cx - TICK_HALF_LENGTH, cy)}
        p2={vec(cx + TICK_HALF_LENGTH, cy)}
        color={normaColors.paperLine}
        strokeWidth={1}
      />
      <Line
        p1={vec(cx, cy - TICK_HALF_LENGTH)}
        p2={vec(cx, cy + TICK_HALF_LENGTH)}
        color={normaColors.paperLine}
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
        <NudgeComet
          width={width}
          height={height}
          nodes={canon.nodes.map((node) => node.point)}
          subjectX={sharedValues.subjectX}
          subjectY={sharedValues.subjectY}
          hasSubject={sharedValues.hasSubject}
          compositionScore={sharedValues.compositionScore}
        />
        <LockPulseRing
          width={width}
          height={height}
          lockPulse={sharedValues.lockPulse}
          lockNodeX={sharedValues.lockNodeX}
          lockNodeY={sharedValues.lockNodeY}
        />
      </Canvas>
    </View>
  );
}

export const CanonNodes = memo(CanonNodesComponent);
