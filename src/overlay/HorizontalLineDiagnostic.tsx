import { memo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { normalizedLineCandidateOverlaySegment } from '../detection/nativeLineDiagnosticOverlay';
import type { NativeLineCandidate } from '../detection/nativeHeuristicTypes';

type Props = {
  width: number;
  height: number;
  lineCandidate?: NativeLineCandidate | null;
  mappedLineCandidate?: NativeLineCandidate | null;
};

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function HorizontalLineDiagnosticComponent({ width, height, lineCandidate, mappedLineCandidate }: Props) {
  if (width <= 0 || height <= 0 || !lineCandidate) return null;

  const segment = normalizedLineCandidateOverlaySegment(mappedLineCandidate ?? lineCandidate);
  if (segment === null) return null;

  const x1 = segment.x1 * width;
  const y1 = segment.y1 * height;
  const x2 = segment.x2 * width;
  const y2 = segment.y2 * height;
  const dx = Math.abs(x2 - x1);
  const dy = Math.abs(y2 - y1);
  const isVertical = dy > dx;
  const lineStyle = isVertical
    ? {
        left: (x1 + x2) / 2 - 1,
        top: Math.min(y1, y2),
        width: 2,
        height: Math.max(2, dy)
      }
    : {
        left: Math.min(x1, x2),
        top: (y1 + y2) / 2 - 1,
        width: Math.max(2, dx),
        height: 2
      };
  const labelStyle = {
    left: clamp((x1 + x2) / 2 + 6, 8, Math.max(8, width - 84)),
    top: clamp((y1 + y2) / 2 + 6, 8, Math.max(8, height - 18))
  };

  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <View style={[styles.line, lineStyle]} />
      <Text style={[styles.label, labelStyle]}>LINE SIGNAL</Text>
    </View>
  );
}

export const HorizontalLineDiagnostic = memo(HorizontalLineDiagnosticComponent);

const styles = StyleSheet.create({
  line: {
    position: 'absolute',
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(80,210,255,0.94)',
    backgroundColor: 'rgba(80,210,255,0.24)'
  },
  label: {
    position: 'absolute',
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
