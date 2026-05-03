import { memo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import type { DebugQualityMode } from '../state/cameraUiStore';

type CaptureBanner = {
  uri: string;
  score: number;
} | null;

type Props = {
  modeLabel: string;
  primaryLabel: string;
  instructionLabel: string;
  armStatusLabel: string;
  hasSubject: boolean;
  coordinateLabel: string;
  nearestGuideLabel: string;
  score: number;
  scoreReasonLabel: string;
  stabilityLabel: string | null;
  captureBanner: CaptureBanner;
  debugQualityMode: DebugQualityMode;
};

function ScoreBadgeComponent({
  modeLabel,
  primaryLabel,
  instructionLabel,
  armStatusLabel,
  hasSubject,
  coordinateLabel,
  nearestGuideLabel,
  score,
  scoreReasonLabel,
  stabilityLabel,
  captureBanner,
  debugQualityMode
}: Props) {
  return (
    <View pointerEvents="none" style={styles.root}>
      <Text style={styles.mode}>{modeLabel}</Text>
      <Text style={styles.label}>{primaryLabel}</Text>
      <Text style={styles.meta}>{instructionLabel}</Text>
      <Text style={styles.arm}>{armStatusLabel}</Text>

      {hasSubject ? (
        <View style={styles.detailBlock}>
          <Text style={styles.detail}>{coordinateLabel}</Text>
          <Text style={styles.detail}>{nearestGuideLabel}</Text>
          <Text style={styles.detail}>score {Math.round(score)} / 100</Text>
          <Text style={styles.reason}>{scoreReasonLabel}</Text>
        </View>
      ) : null}

      {stabilityLabel ? <Text style={styles.stability}>{stabilityLabel}</Text> : null}

      {captureBanner ? (
        <View style={styles.captureBanner}>
          <Text style={styles.captureTitle}>CAPTURED · SCORE {Math.round(captureBanner.score)}</Text>
          <Text style={styles.captureUri}>{captureBanner.uri}</Text>
        </View>
      ) : null}

      {debugQualityMode !== 'normal' ? <Text style={styles.warning}>DEBUG QUALITY: {debugQualityMode}</Text> : null}
    </View>
  );
}

export const ScoreBadge = memo(ScoreBadgeComponent);

const styles = StyleSheet.create({
  root: {
    position: 'absolute',
    left: 16,
    right: 16,
    top: 48,
    borderRadius: 14,
    backgroundColor: 'rgba(0,0,0,0.58)',
    paddingHorizontal: 14,
    paddingVertical: 10
  },
  mode: {
    color: '#f2b84b',
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 1
  },
  label: {
    marginTop: 2,
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: 0.8
  },
  meta: {
    marginTop: 4,
    color: 'rgba(255,255,255,0.78)',
    fontSize: 12,
    fontWeight: '600'
  },
  arm: {
    marginTop: 6,
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '800'
  },
  detailBlock: {
    marginTop: 8,
    gap: 3
  },
  detail: {
    color: 'rgba(255,255,255,0.76)',
    fontSize: 11,
    fontWeight: '600'
  },
  reason: {
    color: 'rgba(255,255,255,0.86)',
    fontSize: 11,
    lineHeight: 15,
    fontWeight: '600'
  },
  stability: {
    marginTop: 8,
    color: '#f2b84b',
    fontSize: 12,
    fontWeight: '800'
  },
  captureBanner: {
    marginTop: 10,
    borderRadius: 10,
    backgroundColor: 'rgba(242,184,75,0.18)',
    borderWidth: 1,
    borderColor: 'rgba(242,184,75,0.72)',
    paddingHorizontal: 10,
    paddingVertical: 8
  },
  captureTitle: {
    color: '#f2b84b',
    fontSize: 12,
    fontWeight: '900'
  },
  captureUri: {
    marginTop: 3,
    color: 'rgba(255,255,255,0.78)',
    fontSize: 10,
    lineHeight: 14,
    fontWeight: '600'
  },
  warning: {
    marginTop: 7,
    color: '#f2b84b',
    fontSize: 11,
    fontWeight: '700'
  }
});
