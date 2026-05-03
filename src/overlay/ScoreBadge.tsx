import { memo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import type { DebugQualityMode } from '../state/cameraUiStore';

type Props = {
  label: string;
  score: number;
  armed: boolean;
  autoStateLabel: string;
  debugQualityMode: DebugQualityMode;
};

function ScoreBadgeComponent({ label, score, armed, autoStateLabel, debugQualityMode }: Props) {
  return (
    <View pointerEvents="none" style={styles.root}>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.meta}>
        {armed ? 'ARMED' : 'DISARMED'} · {autoStateLabel} · SCORE {Math.round(score)}
      </Text>
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
    backgroundColor: 'rgba(0,0,0,0.52)',
    paddingHorizontal: 14,
    paddingVertical: 10
  },
  label: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: 0.8
  },
  meta: {
    marginTop: 4,
    color: 'rgba(255,255,255,0.72)',
    fontSize: 12,
    fontWeight: '600'
  },
  warning: {
    marginTop: 4,
    color: '#f2b84b',
    fontSize: 11,
    fontWeight: '700'
  }
});
