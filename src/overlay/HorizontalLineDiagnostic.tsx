import { memo } from 'react';
import { StyleSheet, View } from 'react-native';
import type { NativeLineCandidate } from '../detection/nativeHeuristicTypes';

const MIN_OVERLAY_CONFIDENCE = 0.34;

type Props = {
  width: number;
  height: number;
  lineCandidate?: NativeLineCandidate | null;
};

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}

function normalizedLineY(lineCandidate: NativeLineCandidate): number | null {
  if (lineCandidate.kind !== 'horizontal-line') return null;
  if (typeof lineCandidate.y1 !== 'number' || !Number.isFinite(lineCandidate.y1)) return null;
  if (typeof lineCandidate.y2 !== 'number' || !Number.isFinite(lineCandidate.y2)) return null;
  if (typeof lineCandidate.confidence !== 'number' || !Number.isFinite(lineCandidate.confidence)) return null;
  if (lineCandidate.confidence < MIN_OVERLAY_CONFIDENCE) return null;

  return clamp01((lineCandidate.y1 + lineCandidate.y2) / 2);
}

function HorizontalLineDiagnosticComponent({ width, height, lineCandidate }: Props) {
  if (width <= 0 || height <= 0 || !lineCandidate) return null;

  const y = normalizedLineY(lineCandidate);
  if (y === null) return null;

  return <View pointerEvents="none" style={[styles.line, { top: height * y - 1 }]} />;
}

export const HorizontalLineDiagnostic = memo(HorizontalLineDiagnosticComponent);

const styles = StyleSheet.create({
  line: {
    position: 'absolute',
    left: 12,
    right: 12,
    height: 2,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(132,242,143,0.92)',
    backgroundColor: 'rgba(132,242,143,0.28)'
  }
});
