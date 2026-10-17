import { Canvas, Line, vec } from '@shopify/react-native-skia';
import { memo } from 'react';
import { StyleSheet, View } from 'react-native';
import { canonLineSegments } from '../composition/canonGeometry';
import type { CanonDefinition } from '../composition/types';
import { normaColors } from '../ui/theme';

type Props = {
  width: number;
  height: number;
  canon: CanonDefinition;
};

/**
 * Canon guide lines stay faint at all times; feedback lives in the nodes.
 */
function CanonLinesComponent({ width, height, canon }: Props) {
  const segments = canonLineSegments(canon, width, height);

  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <Canvas style={StyleSheet.absoluteFill}>
        {segments.map((segment) => (
          <Line
            key={`${segment.key}-shadow`}
            p1={vec(segment.x1, segment.y1)}
            p2={vec(segment.x2, segment.y2)}
            color={normaColors.lineShadow}
            strokeWidth={2.5}
          />
        ))}
        {segments.map((segment) => (
          <Line
            key={segment.key}
            p1={vec(segment.x1, segment.y1)}
            p2={vec(segment.x2, segment.y2)}
            color={normaColors.paperLine}
            strokeWidth={1}
          />
        ))}
      </Canvas>
    </View>
  );
}

export const CanonLines = memo(CanonLinesComponent);
