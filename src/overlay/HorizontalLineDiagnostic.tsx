import { memo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { normalizedHorizontalLineOverlayY } from '../detection/nativeLineDiagnosticOverlay';
import type { NativeLineCandidate } from '../detection/nativeHeuristicTypes';

type Props = {
  width: number;
  height: number;
  lineCandidate?: NativeLineCandidate | null;
};

function HorizontalLineDiagnosticComponent({ width, height, lineCandidate }: Props) {
  if (width <= 0 || height <= 0 || !lineCandidate) return null;

  const y = normalizedHorizontalLineOverlayY(lineCandidate);
  if (y === null) return null;

  return (
    <View pointerEvents="none" style={[styles.container, { top: height * y - 1 }]}>
      <View style={styles.line} />
      <Text style={styles.label}>LINE SIGNAL</Text>
    </View>
  );
}

export const HorizontalLineDiagnostic = memo(HorizontalLineDiagnosticComponent);

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 12,
    right: 12,
    height: 18,
    justifyContent: 'center'
  },
  line: {
    height: 2,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(80,210,255,0.94)',
    backgroundColor: 'rgba(80,210,255,0.24)'
  },
  label: {
    position: 'absolute',
    right: 0,
    top: 4,
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 4,
    overflow: 'hidden',
    color: 'rgba(220,246,255,0.96)',
    backgroundColor: 'rgba(0,0,0,0.46)',
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.6
  }
});
