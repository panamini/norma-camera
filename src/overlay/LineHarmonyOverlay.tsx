import { Canvas, Line, vec } from '@shopify/react-native-skia';
import { memo } from 'react';
import { StyleSheet, View } from 'react-native';
import type { LineHarmonyMatch } from '../detection/lineHarmony';
import { normaColors } from '../ui/theme';

type Props = {
  width: number;
  height: number;
  matches: LineHarmonyMatch[];
};

/**
 * Stable line segments that agree with the active canon, drawn in gold
 * with opacity following their agreement. Readout only; segments that
 * disagree stay invisible here (the debug presets still show everything).
 */
function LineHarmonyOverlayComponent({ width, height, matches }: Props) {
  if (width <= 0 || height <= 0 || matches.length === 0) {
    return null;
  }

  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <Canvas style={StyleSheet.absoluteFill}>
        {matches.map((match) => (
          <Line
            key={`${match.guideLabel}-${match.segment.x1}-${match.segment.y1}-${match.segment.x2}-${match.segment.y2}`}
            p1={vec(match.segment.x1 * width, match.segment.y1 * height)}
            p2={vec(match.segment.x2 * width, match.segment.y2 * height)}
            color={normaColors.accent}
            strokeWidth={2}
            opacity={0.3 + 0.6 * match.agreement}
          />
        ))}
      </Canvas>
    </View>
  );
}

export const LineHarmonyOverlay = memo(LineHarmonyOverlayComponent);
