import { memo } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { CANON_EDITORIAL_NOTE } from '../composition/canons';
import type { CanonDefinition } from '../composition/types';
import { normaColors, normaFonts } from '../ui/theme';
import type { CandidateScoreSnapshot } from './ScoreBadge';

type Props = {
  visible: boolean;
  onClose: () => void;
  canon: CanonDefinition;
  snapshot: CandidateScoreSnapshot;
  score: number | null;
};

/**
 * The one-tap "why" sheet: surfaces the existing score explanation layer —
 * what the score is, which guide earned it, what the evidence actually is —
 * plus the canon's editorial description and Norma's subjectivity note.
 */
function WhySheetComponent({ visible, onClose, canon, snapshot, score }: Props) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable accessibilityRole="button" accessibilityLabel="Close explanation" style={styles.backdrop} onPress={onClose}>
        <View />
      </Pressable>
      <View style={styles.sheet}>
        <View style={styles.headerRow}>
          <View style={styles.canonTag}>
            <Text style={styles.canonGlyph}>{canon.glyph}</Text>
            <Text style={styles.canonName}>{canon.name}</Text>
          </View>
          <Text style={styles.headerScore}>{score !== null ? `${Math.round(score)} / 100` : '— / 100'}</Text>
        </View>

        <ScrollView style={styles.body} contentContainerStyle={styles.bodyContent}>
          <Text style={styles.sectionLabel}>READING</Text>
          <Text style={styles.text}>{snapshot.scoreReason}</Text>

          {snapshot.compositionBreakdownLines && snapshot.compositionBreakdownLines.length > 1 ? (
            <View>
              <Text style={styles.sectionLabel}>BREAKDOWN</Text>
              {snapshot.compositionBreakdownLines.slice(1).map((line) => (
                <Text key={line} style={styles.text}>
                  {line}
                </Text>
              ))}
              {snapshot.lineContributionText ? <Text style={styles.text}>{`Line signal: ${snapshot.lineContributionText}`}</Text> : null}
            </View>
          ) : null}

          {snapshot.nearestGuideText ? (
            <View>
              <Text style={styles.sectionLabel}>NEAREST GUIDE</Text>
              <Text style={styles.text}>{snapshot.nearestGuideText}</Text>
            </View>
          ) : null}

          <Text style={styles.sectionLabel}>EVIDENCE</Text>
          <Text style={styles.text}>{snapshot.candidateExplanation}</Text>

          <Text style={styles.sectionLabel}>THE CANON</Text>
          <Text style={styles.text}>{canon.description}</Text>

          <Text style={styles.editorialNote}>{CANON_EDITORIAL_NOTE}</Text>
        </ScrollView>

        <Pressable accessibilityRole="button" accessibilityLabel="Close" onPress={onClose} style={styles.closeButton}>
          <Text style={styles.closeText}>CLOSE</Text>
        </Pressable>
      </View>
    </Modal>
  );
}

export const WhySheet = memo(WhySheetComponent);

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)'
  },
  sheet: {
    backgroundColor: normaColors.graphiteScrimHeavy,
    borderTopLeftRadius: 10,
    borderTopRightRadius: 10,
    borderTopWidth: 1,
    borderColor: normaColors.paperGhost,
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 28,
    maxHeight: '62%',
    gap: 12
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between'
  },
  canonTag: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 6
  },
  canonGlyph: {
    fontFamily: normaFonts.mono,
    fontSize: 14,
    color: normaColors.accent
  },
  canonName: {
    fontFamily: normaFonts.mono,
    fontSize: 12,
    letterSpacing: 1.6,
    textTransform: 'uppercase',
    color: normaColors.paper
  },
  headerScore: {
    fontFamily: normaFonts.mono,
    fontSize: 12,
    color: normaColors.paper
  },
  body: {
    flexGrow: 0
  },
  bodyContent: {
    gap: 10
  },
  sectionLabel: {
    fontFamily: normaFonts.mono,
    fontSize: 9,
    letterSpacing: 1.6,
    color: normaColors.accent,
    marginTop: 4
  },
  text: {
    fontFamily: normaFonts.mono,
    fontSize: 11,
    lineHeight: 16,
    color: normaColors.paperDim
  },
  editorialNote: {
    fontFamily: normaFonts.mono,
    fontSize: 10,
    lineHeight: 15,
    color: normaColors.paperDim,
    marginTop: 6,
    fontStyle: 'italic'
  },
  closeButton: {
    alignSelf: 'center',
    borderRadius: 4,
    borderWidth: 1,
    borderColor: normaColors.paperFaint,
    paddingHorizontal: 18,
    paddingVertical: 8
  },
  closeText: {
    fontFamily: normaFonts.mono,
    fontSize: 10,
    letterSpacing: 1.6,
    color: normaColors.paperDim
  }
});
