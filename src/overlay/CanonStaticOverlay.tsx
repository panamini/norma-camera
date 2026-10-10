import { Canvas, Line, vec } from '@shopify/react-native-skia';
import { memo } from 'react';
import { StyleSheet, View } from 'react-native';
import { canonNodePoints } from '../composition/canonGeometry';
import type { CanonDefinition } from '../composition/types';
import { normaColors } from '../ui/theme';
import { CanonLines } from './CanonLines';

type Props = {
  width: number;
  height: number;
  canon: CanonDefinition;
};

const TICK_HALF_LENGTH = 6;

/**
 * Non-animated canon construction (lines + node ticks) for the review
 * screen and burn-in preview: exactly the geometry the viewfinder shows.
 */
function CanonStaticOverlayComponent({ width, height, canon }: Props) {
  if (width <= 0 || height <= 0) {
    return null;
  }

  const nodes = canonNodePoints(canon, width, height);

  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <CanonLines width={width} height={height} canon={canon} />
      <Canvas style={StyleSheet.absoluteFill}>
        {nodes.map((node) => (
          <Line
            key={`${node.key}-h`}
            p1={vec(node.x - TICK_HALF_LENGTH, node.y)}
            p2={vec(node.x + TICK_HALF_LENGTH, node.y)}
            color={normaColors.paperDim}
            strokeWidth={1}
          />
        ))}
        {nodes.map((node) => (
          <Line
            key={`${node.key}-v`}
            p1={vec(node.x, node.y - TICK_HALF_LENGTH)}
            p2={vec(node.x, node.y + TICK_HALF_LENGTH)}
            color={normaColors.paperDim}
            strokeWidth={1}
          />
        ))}
      </Canvas>
    </View>
  );
}

export const CanonStaticOverlay = memo(CanonStaticOverlayComponent);
