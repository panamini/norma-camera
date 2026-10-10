import { Canvas, Line, vec } from '@shopify/react-native-skia';
import { memo } from 'react';
import { StyleSheet, View } from 'react-native';
import { guidesForKinds } from '../composition/guides';
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
  const guides = guidesForKinds(canon.guideKinds);

  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <Canvas style={StyleSheet.absoluteFill}>
        {guides.map((guide) => {
          if (guide.axis === 'segment') {
            return (
              <Line
                key={guide.label}
                p1={vec(width * guide.start.x, height * guide.start.y)}
                p2={vec(width * guide.end.x, height * guide.end.y)}
                color={normaColors.paperFaint}
                strokeWidth={1}
              />
            );
          }

          const p1 = guide.axis === 'x' ? vec(width * guide.value, 0) : vec(0, height * guide.value);
          const p2 = guide.axis === 'x' ? vec(width * guide.value, height) : vec(width, height * guide.value);

          return <Line key={guide.label} p1={p1} p2={p2} color={normaColors.paperFaint} strokeWidth={1} />;
        })}
      </Canvas>
    </View>
  );
}

export const CanonLines = memo(CanonLinesComponent);
