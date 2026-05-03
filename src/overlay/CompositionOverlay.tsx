import { memo } from 'react';
import { StyleSheet, View } from 'react-native';
import { guideKindsForOverlayMode } from '../composition/guides';
import type { OverlayMode } from '../composition/types';
import type { CompositionSharedValues } from '../composition/useCompositionSharedValues';
import { GuideLines } from './GuideLines';
import { SubjectMarker } from './SubjectMarker';

type Props = {
  width: number;
  height: number;
  overlayMode: OverlayMode;
  sharedValues: CompositionSharedValues;
};

function CompositionOverlayComponent({ width, height, overlayMode, sharedValues }: Props) {
  if (width <= 0 || height <= 0) {
    return null;
  }

  const activeGuideKinds = guideKindsForOverlayMode(overlayMode);

  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <GuideLines width={width} height={height} activeGuideKinds={activeGuideKinds} sharedValues={sharedValues} />
      <SubjectMarker width={width} height={height} sharedValues={sharedValues} />
    </View>
  );
}

export const CompositionOverlay = memo(CompositionOverlayComponent);
