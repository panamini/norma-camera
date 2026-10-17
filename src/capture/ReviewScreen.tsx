import * as Sharing from 'expo-sharing';
import { memo, useCallback, useState } from 'react';
import type { ImageLoadEventData, LayoutChangeEvent, NativeSyntheticEvent } from 'react-native';
import { Image, Linking, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { canonById } from '../composition/canons';
import { CanonStaticOverlay } from '../overlay/CanonStaticOverlay';
import type { CapturedPhoto } from '../state/cameraUiStore';
import { normaColors, normaFonts } from '../ui/theme';
import { renderNormaCard } from './burnInCanon';
import { constructExportUrl } from './constructExport';
import { fitContainRect } from './fitRect';

type Props = {
  photo: CapturedPhoto | null;
  onClose: () => void;
};

type Size = { width: number; height: number };

function formatCaptureTime(createdAtMs: number): string {
  const date = new Date(createdAtMs);
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${hours}:${minutes}`;
}

/**
 * Session review: the photo, its canon construction on demand, honest
 * metadata, system share, and the Construct hand-off. Nothing is uploaded;
 * the share sheet and the browser are the only exits.
 */
function ReviewScreenComponent({ photo, onClose }: Props) {
  const [canonVisible, setCanonVisible] = useState(true);
  const [imageSize, setImageSize] = useState<Size | null>(null);
  const [boxSize, setBoxSize] = useState<Size>({ width: 0, height: 0 });
  const [actionNote, setActionNote] = useState<string | null>(null);
  const [isBurningIn, setIsBurningIn] = useState(false);

  const handleImageLoad = useCallback((event: NativeSyntheticEvent<ImageLoadEventData>) => {
    const { width, height } = event.nativeEvent.source;
    if (width > 0 && height > 0) {
      setImageSize({ width, height });
    }
  }, []);

  const handleBoxLayout = useCallback((event: LayoutChangeEvent) => {
    const { width, height } = event.nativeEvent.layout;
    setBoxSize({ width, height });
  }, []);

  const handleShare = useCallback(async (uri: string) => {
    try {
      if (!(await Sharing.isAvailableAsync())) {
        setActionNote('sharing unavailable on this device');
        return;
      }
      await Sharing.shareAsync(uri, { mimeType: 'image/jpeg', dialogTitle: 'Share photo' });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'unknown error';
      setActionNote(`share failed · ${message}`);
    }
  }, []);

  const handleShareWithCanon = useCallback(
    async (reviewed: CapturedPhoto) => {
      setIsBurningIn(true);
      setActionNote(null);
      try {
        const cardUri = await renderNormaCard(reviewed);
        await handleShare(cardUri);
      } catch (error) {
        const message = error instanceof Error ? error.message : 'unknown error';
        setActionNote(`card render failed · ${message}`);
      } finally {
        setIsBurningIn(false);
      }
    },
    [handleShare]
  );

  const handleConstruct = useCallback(async (reviewed: CapturedPhoto) => {
    try {
      await Linking.openURL(constructExportUrl(reviewed));
      setActionNote('canon context opened in Construct · share the photo to move the image');
    } catch {
      setActionNote('could not open norma.science');
    }
  }, []);

  const handleDismiss = useCallback(() => {
    setImageSize(null);
    setActionNote(null);
    setCanonVisible(true);
    onClose();
  }, [onClose]);

  if (!photo) {
    return null;
  }

  const canon = canonById(photo.canonId);
  const fitted = imageSize ? fitContainRect(imageSize.width, imageSize.height, boxSize.width, boxSize.height) : null;

  return (
    <Modal visible transparent={false} animationType="fade" onRequestClose={handleDismiss}>
      <View style={styles.root}>
        <View style={styles.metaRow}>
          <View style={styles.canonTag}>
            <Text style={styles.canonGlyph}>{canon.glyph}</Text>
            <Text style={styles.canonName}>{canon.name}</Text>
          </View>
          <Text style={styles.metaText}>{`${photo.label} · ${Math.round(photo.score)} · ${formatCaptureTime(photo.createdAtMs)}`}</Text>
        </View>

        <View onLayout={handleBoxLayout} style={styles.imageBox}>
          <Image source={{ uri: photo.uri }} onLoad={handleImageLoad} resizeMode="contain" style={StyleSheet.absoluteFill} />
          {canonVisible && fitted && fitted.width > 0 ? (
            <View pointerEvents="none" style={[styles.overlayBox, { left: fitted.x, top: fitted.y, width: fitted.width, height: fitted.height }]}>
              <CanonStaticOverlay width={fitted.width} height={fitted.height} canon={canon} />
            </View>
          ) : null}
        </View>

        {actionNote ? (
          <Text numberOfLines={2} style={styles.actionNote}>
            {actionNote}
          </Text>
        ) : null}

        <View style={styles.actionRow}>
          <Pressable
            accessibilityRole="switch"
            accessibilityLabel="Toggle canon construction overlay"
            accessibilityState={{ checked: canonVisible }}
            onPress={() => setCanonVisible((visible) => !visible)}
            style={[styles.actionChip, canonVisible ? styles.actionChipActive : null]}
          >
            <Text style={[styles.actionText, canonVisible ? styles.actionTextActive : null]}>CANON</Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Share photo"
            onPress={() => void handleShare(photo.uri)}
            style={styles.actionChip}
          >
            <Text style={styles.actionText}>SHARE</Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Share as a Norma card with the canon construction drawn in"
            disabled={isBurningIn}
            onPress={() => void handleShareWithCanon(photo)}
            style={[styles.actionChip, isBurningIn ? styles.actionChipBusy : null]}
          >
            <Text style={styles.actionText}>{isBurningIn ? 'DRAWING…' : 'CARD'}</Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Open canon context in Norma Construct"
            onPress={() => void handleConstruct(photo)}
            style={styles.actionChip}
          >
            <Text style={styles.actionText}>CONSTRUCT</Text>
          </Pressable>
          <Pressable accessibilityRole="button" accessibilityLabel="Close review" onPress={handleDismiss} style={styles.actionChip}>
            <Text style={styles.actionText}>CLOSE</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

export const ReviewScreen = memo(ReviewScreenComponent);

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: normaColors.graphite,
    paddingTop: 52,
    paddingBottom: 28,
    paddingHorizontal: 16,
    gap: 12
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10
  },
  canonTag: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 6
  },
  canonGlyph: {
    fontFamily: normaFonts.mono,
    fontSize: 13,
    color: normaColors.accent
  },
  canonName: {
    fontFamily: normaFonts.mono,
    fontSize: 11,
    letterSpacing: 1.4,
    textTransform: 'uppercase',
    color: normaColors.paper
  },
  metaText: {
    flexShrink: 1,
    fontFamily: normaFonts.mono,
    fontSize: 9,
    letterSpacing: 0.6,
    color: normaColors.paperDim,
    textAlign: 'right'
  },
  imageBox: {
    flex: 1,
    borderRadius: 6,
    overflow: 'hidden',
    backgroundColor: '#000000'
  },
  overlayBox: {
    position: 'absolute'
  },
  actionNote: {
    fontFamily: normaFonts.mono,
    fontSize: 9,
    letterSpacing: 0.6,
    color: normaColors.paperDim,
    textAlign: 'center'
  },
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8
  },
  actionChip: {
    borderRadius: 4,
    borderWidth: 1,
    borderColor: normaColors.paperFaint,
    paddingHorizontal: 12,
    paddingVertical: 9
  },
  actionChipActive: {
    borderColor: normaColors.accent,
    backgroundColor: normaColors.accentSoft
  },
  actionChipBusy: {
    opacity: 0.5
  },
  actionText: {
    fontFamily: normaFonts.mono,
    fontSize: 10,
    letterSpacing: 1.2,
    color: normaColors.paperDim
  },
  actionTextActive: {
    color: normaColors.accent
  }
});
