import { memo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { normalizedLineCandidateOverlaySegment, normalizedLineSegmentSpikeOverlaySegments } from '../detection/nativeLineDiagnosticOverlay';
import type { NativeLineCandidate, NativeLineSegmentCandidate } from '../detection/nativeHeuristicTypes';
import type { LineSegmentStabilityState } from '../detection/nativeLineSegmentRetention';

type Props = {
  width: number;
  height: number;
  lineCandidate?: NativeLineCandidate | null;
  mappedLineCandidate?: NativeLineCandidate | null;
  lineSegments?: NativeLineSegmentCandidate[] | null;
  showLineSegmentSpike?: boolean;
};

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function lineStyleForSegment(segment: { x1: number; y1: number; x2: number; y2: number }, width: number, height: number, thickness: number) {
  const x1 = segment.x1 * width;
  const y1 = segment.y1 * height;
  const x2 = segment.x2 * width;
  const y2 = segment.y2 * height;
  const dx = x2 - x1;
  const dy = y2 - y1;
  const length = Math.max(2, Math.hypot(dx, dy));
  const angle = Math.atan2(dy, dx);

  return {
    left: (x1 + x2) / 2 - length / 2,
    top: (y1 + y2) / 2 - thickness / 2,
    width: length,
    height: thickness,
    transform: [{ rotateZ: `${angle}rad` }]
  };
}

function labelStyleForSegment(segment: { x1: number; y1: number; x2: number; y2: number }, width: number, height: number, labelWidth: number) {
  return {
    left: clamp(((segment.x1 + segment.x2) / 2) * width + 6, 8, Math.max(8, width - labelWidth)),
    top: clamp(((segment.y1 + segment.y2) / 2) * height + 6, 8, Math.max(8, height - 18))
  };
}

function spikeLineStyleForState(stabilityState: LineSegmentStabilityState) {
  if (stabilityState === 'stable') return styles.stableSpikeLine;
  if (stabilityState === 'retained') return styles.retainedSpikeLine;
  return styles.spikeLine;
}

function HorizontalLineDiagnosticComponent({ width, height, lineCandidate, mappedLineCandidate, lineSegments, showLineSegmentSpike = false }: Props) {
  if (width <= 0 || height <= 0) return null;

  const segment = normalizedLineCandidateOverlaySegment(mappedLineCandidate ?? lineCandidate);
  const spikeSegments = showLineSegmentSpike ? normalizedLineSegmentSpikeOverlaySegments(lineSegments) : [];
  if (segment === null && spikeSegments.length === 0) return null;

  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      {segment ? (
        <>
          <View style={[styles.line, lineStyleForSegment(segment, width, height, 2)]} />
          <Text style={[styles.label, labelStyleForSegment(segment, width, height, 84)]}>LINE SIGNAL</Text>
        </>
      ) : null}
      {spikeSegments.map((spikeSegment) => (
        <View key={spikeSegment.key} style={[spikeLineStyleForState(spikeSegment.stabilityState), lineStyleForSegment(spikeSegment, width, height, 2)]} />
      ))}
      {spikeSegments[0] ? <Text style={[styles.spikeLabel, labelStyleForSegment(spikeSegments[0], width, height, 118)]}>LINE SEGMENT SPIKE</Text> : null}
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
  spikeLine: {
    position: 'absolute',
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(255,214,96,0.94)',
    backgroundColor: 'rgba(255,214,96,0.22)'
  },
  stableSpikeLine: {
    position: 'absolute',
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(255,232,128,0.98)',
    backgroundColor: 'rgba(255,232,128,0.34)'
  },
  retainedSpikeLine: {
    position: 'absolute',
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(255,214,96,0.58)',
    backgroundColor: 'rgba(255,214,96,0.13)'
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
  },
  spikeLabel: {
    position: 'absolute',
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 4,
    overflow: 'hidden',
    color: 'rgba(255,246,214,0.96)',
    backgroundColor: 'rgba(0,0,0,0.52)',
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.6
  }
});
