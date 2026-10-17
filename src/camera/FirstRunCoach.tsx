import { memo, useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { normaColors, normaFonts } from '../ui/theme';

type Props = {
  visible: boolean;
  onDone: () => void;
};

type CoachStep = {
  glyphs?: string;
  title: string;
  body: string;
};

const STEPS: CoachStep[] = [
  {
    glyphs: '⅓  φ  √2  ╳',
    title: 'CHOOSE A CANON',
    body: 'A classical composition grid with marked power points. Tap a name under the viewfinder to switch.'
  },
  {
    title: 'REFRAME UNTIL IT SINGS',
    body: 'Norma follows the strongest visual mass while you move. Reframe until it rests on a marked point — the point lights up, the ring around the shutter fills. That is the shot.'
  },
  {
    title: 'TAP TO ASK',
    body: 'Tap any spot to score it for five seconds — a question, not a tracker. It never changes focus or exposure. AUTO-SHOT, if you turn it on, fires by itself when the frame holds.'
  }
];

/**
 * Three screens, once, skippable at every step. The coach resets its step
 * on every open so a re-trigger (e.g. cleared storage) starts from one.
 */
function FirstRunCoachComponent({ visible, onDone }: Props) {
  const [stepIndex, setStepIndex] = useState(0);
  const step = STEPS[Math.min(stepIndex, STEPS.length - 1)]!;
  const isLast = stepIndex >= STEPS.length - 1;

  const finish = () => {
    setStepIndex(0);
    onDone();
  };

  const advance = () => {
    if (isLast) {
      finish();
      return;
    }
    setStepIndex((index) => index + 1);
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={finish}>
      <View style={styles.backdrop}>
        <Pressable accessibilityRole="button" accessibilityLabel={isLast ? 'Start shooting' : 'Next tip'} onPress={advance} style={styles.card}>
          {step.glyphs ? <Text style={styles.glyphs}>{step.glyphs}</Text> : null}
          <Text style={styles.title}>{step.title}</Text>
          <Text style={styles.body}>{step.body}</Text>
          <View style={styles.footerRow}>
            <Text style={styles.progress}>{`${stepIndex + 1} / ${STEPS.length}`}</Text>
            <Text style={styles.nextHint}>{isLast ? 'START' : 'NEXT'}</Text>
          </View>
        </Pressable>
        {!isLast ? (
          <Pressable accessibilityRole="button" accessibilityLabel="Skip the introduction" onPress={finish} style={styles.skip}>
            <Text style={styles.skipText}>SKIP</Text>
          </Pressable>
        ) : null}
      </View>
    </Modal>
  );
}

export const FirstRunCoach = memo(FirstRunCoachComponent);

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.55)',
    padding: 28,
    gap: 16
  },
  card: {
    alignSelf: 'stretch',
    backgroundColor: normaColors.graphiteScrimHeavy,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: normaColors.paperGhost,
    padding: 24,
    gap: 14
  },
  glyphs: {
    fontFamily: normaFonts.mono,
    fontSize: 20,
    letterSpacing: 2,
    color: normaColors.accent,
    textAlign: 'center'
  },
  title: {
    fontFamily: normaFonts.mono,
    fontSize: 14,
    letterSpacing: 1.8,
    color: normaColors.paper,
    textAlign: 'center'
  },
  body: {
    fontFamily: normaFonts.mono,
    fontSize: 12,
    lineHeight: 19,
    color: normaColors.paperDim,
    textAlign: 'center'
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 6
  },
  progress: {
    fontFamily: normaFonts.mono,
    fontSize: 10,
    color: normaColors.paperFaint
  },
  nextHint: {
    fontFamily: normaFonts.mono,
    fontSize: 11,
    letterSpacing: 1.6,
    color: normaColors.accent
  },
  skip: {
    paddingHorizontal: 14,
    paddingVertical: 8
  },
  skipText: {
    fontFamily: normaFonts.mono,
    fontSize: 10,
    letterSpacing: 1.6,
    color: normaColors.paperFaint
  }
});
