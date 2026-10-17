import { memo, useCallback, useMemo } from 'react';
import { FlatList, Image, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { canonById } from '../composition/canons';
import { journalStats, type JournalStats } from '../journal/journalStats';
import { nowMs } from '../shared/time';
import type { CapturedPhoto } from '../state/cameraUiStore';
import { normaColors, normaFonts } from '../ui/theme';

type Props = {
  visible: boolean;
  photos: CapturedPhoto[];
  onSelect: (photo: CapturedPhoto) => void;
  onClose: () => void;
};

const NUM_COLUMNS = 3;

/** Mono stats row; the 7-day average segment is omitted when there is nothing to average. */
function statsLineFor(stats: JournalStats): string {
  const segments = [`STREAK ${stats.currentStreak}d`];
  if (stats.sevenDayAverageScore !== null) {
    segments.push(`7D AVG ${Math.round(stats.sevenDayAverageScore)}`);
  }
  segments.push(`${stats.totalCaptures} ${stats.totalCaptures === 1 ? 'FRAME' : 'FRAMES'}`);
  return segments.join(' · ');
}

/**
 * Harmony Journal: captures persist across sessions in the on-device journal,
 * newest first — nothing is uploaded by Norma.
 */
function GallerySheetComponent({ visible, photos, onSelect, onClose }: Props) {
  // `visible` is a deliberate dependency: reopening the sheet re-reads the
  // clock, so the streak cannot go stale while the app stays open overnight.
  const stats = useMemo(() => journalStats(photos, nowMs()), [photos, visible]);
  const renderItem = useCallback(
    ({ item }: { item: CapturedPhoto }) => {
      const canon = canonById(item.canonId);

      return (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Review capture scored ${Math.round(item.score)}`}
          onPress={() => onSelect(item)}
          style={styles.cell}
        >
          <Image source={{ uri: item.uri }} resizeMode="cover" style={styles.cellImage} />
          <View style={styles.cellTag}>
            <Text style={styles.cellTagText}>{`${canon.glyph} ${Math.round(item.score)}`}</Text>
          </View>
        </Pressable>
      );
    },
    [onSelect]
  );

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.root}>
        <View style={styles.headerRow}>
          <Text style={styles.headerText}>JOURNAL</Text>
          <Pressable accessibilityRole="button" accessibilityLabel="Close journal" onPress={onClose} style={styles.closeChip}>
            <Text style={styles.closeText}>CLOSE</Text>
          </Pressable>
        </View>
        <Text style={styles.statsText}>{statsLineFor(stats)}</Text>
        {photos.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyText}>NO FRAMES IN YOUR JOURNAL YET.</Text>
          </View>
        ) : (
          <FlatList
            data={photos}
            renderItem={renderItem}
            keyExtractor={(item) => `${item.createdAtMs}-${item.uri}`}
            numColumns={NUM_COLUMNS}
            columnWrapperStyle={styles.columnWrapper}
            contentContainerStyle={styles.listContent}
          />
        )}
        <Text style={styles.privacyLine}>On this device only · nothing leaves it.</Text>
      </View>
    </Modal>
  );
}

export const GallerySheet = memo(GallerySheetComponent);

const styles = StyleSheet.create({
  root: {
    flex: 1,
    marginTop: 90,
    backgroundColor: normaColors.graphiteScrimHeavy,
    borderTopLeftRadius: 10,
    borderTopRightRadius: 10,
    borderTopWidth: 1,
    borderColor: normaColors.paperGhost,
    paddingHorizontal: 14,
    paddingTop: 14,
    paddingBottom: 24,
    gap: 12
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between'
  },
  headerText: {
    fontFamily: normaFonts.mono,
    fontSize: 11,
    letterSpacing: 1.4,
    color: normaColors.paper
  },
  statsText: {
    fontFamily: normaFonts.mono,
    fontSize: 9,
    letterSpacing: 1.2,
    color: normaColors.paperDim
  },
  closeChip: {
    borderRadius: 4,
    borderWidth: 1,
    borderColor: normaColors.paperFaint,
    paddingHorizontal: 10,
    paddingVertical: 6
  },
  closeText: {
    fontFamily: normaFonts.mono,
    fontSize: 9,
    letterSpacing: 1.2,
    color: normaColors.paperDim
  },
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center'
  },
  emptyText: {
    fontFamily: normaFonts.mono,
    fontSize: 10,
    letterSpacing: 1.2,
    color: normaColors.paperDim
  },
  listContent: {
    gap: 6
  },
  columnWrapper: {
    gap: 6
  },
  cell: {
    flex: 1 / NUM_COLUMNS,
    aspectRatio: 1,
    borderRadius: 4,
    overflow: 'hidden',
    backgroundColor: '#000000'
  },
  cellImage: {
    ...StyleSheet.absoluteFillObject
  },
  cellTag: {
    position: 'absolute',
    left: 4,
    bottom: 4,
    backgroundColor: normaColors.graphiteScrim,
    borderRadius: 3,
    paddingHorizontal: 5,
    paddingVertical: 2
  },
  cellTagText: {
    fontFamily: normaFonts.mono,
    fontSize: 9,
    color: normaColors.paper
  },
  privacyLine: {
    fontFamily: normaFonts.mono,
    fontSize: 8,
    letterSpacing: 0.6,
    color: normaColors.paperFaint,
    textAlign: 'center'
  }
});
