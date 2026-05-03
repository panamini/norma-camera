import { memo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import type { DebugQualityMode } from '../state/cameraUiStore';

export type CaptureBanner = {
  score: number;
  uri: string;
  trigger: 'manual' | 'auto';
};

export type CandidateScoreSnapshot = {
  hasCandidate: boolean;
  candidateSourceText: string | null;
  candidateConfidenceText: string | null;
  subjectText: string | null;
  boundsText: string | null;
  nearestGuideText: string | null;
  scoreReason: string;
  candidateExplanation: string;
};

type Props = {
  modeLabel: string;
  title: string;
  instruction: string;
  score: number;
  statusLine: string;
  gateReasonLine: string;
  stabilityLine: string | null;
  qualityLine: string;
  snapshot: CandidateScoreSnapshot;
  captureBanner: CaptureBanner | null;
  debugQualityMode: DebugQualityMode;
};

function ScoreBadgeComponent({
  modeLabel,
  title,
  instruction,
  score,
  statusLine,
  gateReasonLine,
  stabilityLine,
  qualityLine,
  snapshot,
  captureBanner,
  debugQualityMode
}: Props) {
  return (
    <View pointerEvents="none" style={styles.root}>
      {captureBanner ? (
        <View style={styles.captureBanner}>
          <Text style={styles.captureTitle}>{captureBanner.trigger === 'auto' ? 'AUTO CAPTURED' : 'CAPTURED'}</Text>
          <Text numberOfLines={2} style={styles.captureMeta}>
            score {captureBanner.score} · {captureBanner.uri}
          </Text>
        </View>
      ) : null}

      <Text style={styles.mode}>{modeLabel}</Text>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.instruction}>{instruction}</Text>

      <View style={styles.divider} />

      <Text style={styles.status}>{statusLine}</Text>
      <Text style={styles.meta}>{gateReasonLine}</Text>
      {stabilityLine ? <Text style={styles.meta}>{stabilityLine}</Text> : null}
      <Text style={styles.meta}>{qualityLine}</Text>

      {snapshot.hasCandidate ? (
        <View style={styles.debugBlock}>
          <Text style={styles.meta}>source {snapshot.candidateSourceText}</Text>
          <Text style={styles.meta}>confidence {snapshot.candidateConfidenceText}</Text>
          <Text style={styles.meta}>point {snapshot.subjectText}</Text>
          {snapshot.boundsText ? <Text style={styles.meta}>bbox {snapshot.boundsText}</Text> : null}
          <Text style={styles.meta}>nearest guide {snapshot.nearestGuideText ?? 'none'}</Text>
          <Text style={styles.meta}>score {Math.round(score)} / 100</Text>
        </View>
      ) : (
        <Text style={styles.meta}>source no subject · confidence 0%</Text>
      )}

      <Text style={styles.reason}>{snapshot.scoreReason}</Text>
      <Text style={styles.explanation}>{snapshot.candidateExplanation}</Text>
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
    top: 42,
    borderRadius: 14,
    backgroundColor: 'rgba(0,0,0,0.62)',
    paddingHorizontal: 14,
    paddingVertical: 10
  },
  captureBanner: {
    marginBottom: 8,
    borderRadius: 10,
    backgroundColor: 'rgba(242,184,75,0.22)',
    paddingHorizontal: 10,
    paddingVertical: 8
  },
  captureTitle: {
    color: '#f2b84b',
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: 0.7
  },
  captureMeta: {
    marginTop: 3,
    color: 'rgba(255,255,255,0.82)',
    fontSize: 10,
    fontWeight: '700'
  },
  mode: {
    color: '#f2b84b',
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 1.1
  },
  title: {
    marginTop: 2,
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '900',
    letterSpacing: 0.6
  },
  instruction: {
    marginTop: 4,
    color: 'rgba(255,255,255,0.86)',
    fontSize: 12,
    fontWeight: '700'
  },
  divider: {
    height: 1,
    marginVertical: 8,
    backgroundColor: 'rgba(255,255,255,0.14)'
  },
  status: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '900'
  },
  debugBlock: {
    marginTop: 6,
    gap: 2
  },
  meta: {
    color: 'rgba(255,255,255,0.72)',
    fontSize: 11,
    fontWeight: '700'
  },
  reason: {
    marginTop: 6,
    color: 'rgba(255,255,255,0.88)',
    fontSize: 11,
    fontWeight: '700'
  },
  explanation: {
    marginTop: 4,
    color: 'rgba(255,255,255,0.68)',
    fontSize: 10,
    fontWeight: '700'
  },
  warning: {
    marginTop: 5,
    color: '#f2b84b',
    fontSize: 11,
    fontWeight: '800'
  }
});
