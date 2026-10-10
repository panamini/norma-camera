import { memo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { CanonDefinition } from '../composition/types';
import { normaColors, normaFonts } from '../ui/theme';

type Props = {
  canon: CanonDefinition;
  title: string;
  score: number | null;
  instruction: string | null;
  armedLine: string | null;
  captureToast: string | null;
  onWhyPress: () => void;
};

/**
 * The branded top strip: active canon on the left, honest state + score on
 * the right as the one-tap entry into the "why" sheet. Conservative armed
 * copy appears only while armed.
 */
function StatusStripComponent({ canon, title, score, instruction, armedLine, captureToast, onWhyPress }: Props) {
  return (
    <View pointerEvents="box-none" style={styles.root}>
      <View pointerEvents="box-none" style={styles.row}>
        <View style={styles.canonTag}>
          <Text style={styles.canonGlyph}>{canon.glyph}</Text>
          <Text style={styles.canonName}>{canon.name}</Text>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`${title}${score !== null ? `, score ${Math.round(score)}` : ''}. Show why this frame scored as it did.`}
          onPress={onWhyPress}
          hitSlop={{ top: 10, bottom: 10, left: 8, right: 8 }}
          style={styles.whyButton}
        >
          <Text numberOfLines={1} style={styles.title}>
            {title}
            {score !== null ? <Text style={styles.score}>{`  ${Math.round(score)}`}</Text> : null}
            <Text style={styles.whyHint}>{'  WHY?'}</Text>
          </Text>
        </Pressable>
      </View>
      {instruction ? (
        <Text numberOfLines={1} style={styles.instruction}>
          {instruction}
        </Text>
      ) : null}
      {armedLine ? (
        <Text numberOfLines={1} style={styles.armedLine}>
          {armedLine}
        </Text>
      ) : null}
      {captureToast ? (
        <Text numberOfLines={1} style={styles.captureToast}>
          {captureToast}
        </Text>
      ) : null}
    </View>
  );
}

export const StatusStrip = memo(StatusStripComponent);

const styles = StyleSheet.create({
  root: {
    position: 'absolute',
    top: 52,
    left: 16,
    right: 16,
    gap: 6
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12
  },
  canonTag: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 6,
    backgroundColor: normaColors.graphiteScrim,
    borderRadius: 4,
    paddingHorizontal: 8,
    paddingVertical: 4
  },
  canonGlyph: {
    fontFamily: normaFonts.mono,
    fontSize: 12,
    color: normaColors.accent
  },
  canonName: {
    fontFamily: normaFonts.mono,
    fontSize: 10,
    letterSpacing: 1.4,
    textTransform: 'uppercase',
    color: normaColors.paper
  },
  whyButton: {
    flexShrink: 1,
    backgroundColor: normaColors.graphiteScrim,
    borderRadius: 4,
    paddingHorizontal: 8,
    paddingVertical: 4
  },
  title: {
    fontFamily: normaFonts.mono,
    fontSize: 10,
    letterSpacing: 1,
    color: normaColors.paperDim
  },
  score: {
    color: normaColors.paper,
    fontSize: 11
  },
  whyHint: {
    color: normaColors.accentFaint
  },
  instruction: {
    alignSelf: 'flex-end',
    fontFamily: normaFonts.mono,
    fontSize: 9,
    letterSpacing: 0.8,
    color: normaColors.paperDim,
    backgroundColor: normaColors.graphiteScrim,
    borderRadius: 4,
    paddingHorizontal: 8,
    paddingVertical: 3
  },
  armedLine: {
    alignSelf: 'flex-end',
    fontFamily: normaFonts.mono,
    fontSize: 9,
    letterSpacing: 0.8,
    color: normaColors.paperDim,
    backgroundColor: normaColors.graphiteScrim,
    borderRadius: 4,
    paddingHorizontal: 8,
    paddingVertical: 3
  },
  captureToast: {
    alignSelf: 'flex-end',
    fontFamily: normaFonts.mono,
    fontSize: 10,
    letterSpacing: 1,
    color: normaColors.accent,
    backgroundColor: normaColors.graphiteScrim,
    borderRadius: 4,
    paddingHorizontal: 8,
    paddingVertical: 3
  }
});
