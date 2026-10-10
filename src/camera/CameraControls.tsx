import { memo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { CANONS } from '../composition/canons';
import type { CompositionSharedValues } from '../composition/useCompositionSharedValues';
import type { DetectionMode } from '../detection/types';
import { ResonanceArc } from '../overlay/ResonanceArc';
import { useCameraUiStore } from '../state/cameraUiStore';
import { DEBUG_OVERLAY_PRESET_OPTIONS } from '../state/debugOverlayVisibility';
import { normaColors, normaFonts } from '../ui/theme';

type Props = {
  onManualCapture: () => void;
  isCapturing: boolean;
  readyThreshold: number;
  sharedValues: CompositionSharedValues;
};

const SHUTTER_ZONE = 86;
const SHUTTER_SIZE = 64;

const DEV_DETECTION_MODES: Array<{ value: DetectionMode; label: string; accessibilityLabel: string }> = [
  { value: 'auto-placeholder', label: 'placeholder', accessibilityLabel: 'Use automatic placeholder subject mode' },
  { value: 'simulated-detector', label: 'sim detector', accessibilityLabel: 'Use simulated detector mode' }
];

function CameraControlsComponent({ onManualCapture, isCapturing, readyThreshold, sharedValues }: Props) {
  const canonId = useCameraUiStore((state) => state.canonId);
  const detectionMode = useCameraUiStore((state) => state.detectionMode);
  const armed = useCameraUiStore((state) => state.armed);
  const debugQualityMode = useCameraUiStore((state) => state.debugQualityMode);
  const debugPanelsHidden = useCameraUiStore((state) => state.debugPanelsHidden);
  const setCanonId = useCameraUiStore((state) => state.setCanonId);
  const setDetectionMode = useCameraUiStore((state) => state.setDetectionMode);
  const toggleArmed = useCameraUiStore((state) => state.toggleArmed);
  const setDebugQualityMode = useCameraUiStore((state) => state.setDebugQualityMode);
  const toggleDebugPanelsHidden = useCameraUiStore((state) => state.toggleDebugPanelsHidden);
  const [devOpen, setDevOpen] = useState(false);

  return (
    <View pointerEvents="box-none" style={styles.root}>
      {devOpen ? (
        <View accessibilityLabel="Developer tools" style={styles.devRow}>
          {DEV_DETECTION_MODES.map((mode) => {
            const active = mode.value === detectionMode;
            return (
              <Pressable
                key={mode.value}
                accessibilityRole="button"
                accessibilityLabel={mode.accessibilityLabel}
                accessibilityState={{ selected: active }}
                onPress={() => setDetectionMode(mode.value)}
                style={[styles.devChip, active ? styles.devChipActive : null]}
              >
                <Text style={[styles.devChipText, active ? styles.devChipTextActive : null]}>{mode.label}</Text>
              </Pressable>
            );
          })}
          {DEBUG_OVERLAY_PRESET_OPTIONS.map((mode) => {
            const active = mode.value === debugQualityMode;
            return (
              <Pressable
                key={mode.value}
                accessibilityRole="button"
                accessibilityLabel={mode.accessibilityLabel}
                accessibilityState={{ selected: active }}
                onPress={() => setDebugQualityMode(mode.value)}
                style={[styles.devChip, active ? styles.devChipActive : null]}
              >
                <Text style={[styles.devChipText, active ? styles.devChipTextActive : null]}>{mode.label}</Text>
              </Pressable>
            );
          })}
          <Pressable
            accessibilityRole="switch"
            accessibilityLabel={debugPanelsHidden ? 'Show debug panels' : 'Hide debug panels'}
            accessibilityState={{ checked: !debugPanelsHidden }}
            onPress={toggleDebugPanelsHidden}
            style={[styles.devChip, debugPanelsHidden ? null : styles.devChipActive]}
          >
            <Text style={[styles.devChipText, debugPanelsHidden ? null : styles.devChipTextActive]}>
              {debugPanelsHidden ? 'panels off' : 'panels on'}
            </Text>
          </Pressable>
        </View>
      ) : null}

      <View accessibilityLabel="Canon" style={styles.canonRow}>
        {CANONS.map((canon) => {
          const active = canon.id === canonId;
          return (
            <Pressable
              key={canon.id}
              accessibilityRole="button"
              accessibilityLabel={`Use the ${canon.name} canon`}
              accessibilityState={{ selected: active }}
              onPress={() => setCanonId(canon.id)}
              style={[styles.canonChip, active ? styles.canonChipActive : null]}
            >
              <Text style={[styles.canonGlyph, active ? styles.canonGlyphActive : null]}>{canon.glyph}</Text>
              <Text style={[styles.canonText, active ? styles.canonTextActive : null]}>{canon.name}</Text>
            </Pressable>
          );
        })}
      </View>

      <View style={styles.primaryRow}>
        <Pressable
          accessibilityRole="switch"
          accessibilityLabel="Toggle armed auto capture"
          accessibilityState={{ checked: armed }}
          onPress={toggleArmed}
          style={[styles.armPill, armed ? styles.armPillActive : null]}
        >
          <Text style={[styles.armText, armed ? styles.armTextActive : null]}>{armed ? 'ARMED' : 'ARM'}</Text>
        </Pressable>

        <View style={styles.shutterZone}>
          <ResonanceArc size={SHUTTER_ZONE} readyThreshold={readyThreshold} sharedValues={sharedValues} />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Take photo manually"
            disabled={isCapturing}
            onPress={onManualCapture}
            style={({ pressed }) => [styles.shutter, pressed || isCapturing ? styles.shutterPressed : null]}
          >
            <View style={styles.shutterInner} />
          </Pressable>
        </View>

        <View accessibilityLabel="Subject mode" style={styles.modeToggle}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Use manual tap subject mode"
            accessibilityState={{ selected: detectionMode === 'manual' }}
            onPress={() => setDetectionMode('manual')}
            style={[styles.modeChip, detectionMode === 'manual' ? styles.modeChipActive : null]}
          >
            <Text style={[styles.modeText, detectionMode === 'manual' ? styles.modeTextActive : null]}>MANUAL</Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Use native visual mass auto mode"
            accessibilityState={{ selected: detectionMode === 'native-heuristic' }}
            onPress={() => setDetectionMode('native-heuristic')}
            style={[styles.modeChip, detectionMode === 'native-heuristic' ? styles.modeChipActive : null]}
          >
            <Text style={[styles.modeText, detectionMode === 'native-heuristic' ? styles.modeTextActive : null]}>AUTO</Text>
          </Pressable>
        </View>
      </View>

      <Pressable
        accessibilityRole="switch"
        accessibilityLabel={devOpen ? 'Hide developer tools' : 'Show developer tools'}
        accessibilityState={{ checked: devOpen }}
        onPress={() => setDevOpen((open) => !open)}
        style={styles.devToggle}
      >
        <Text style={[styles.devToggleText, devOpen ? styles.devToggleTextActive : null]}>···</Text>
      </Pressable>
    </View>
  );
}

export const CameraControls = memo(CameraControlsComponent);

const styles = StyleSheet.create({
  root: {
    position: 'absolute',
    left: 16,
    right: 16,
    bottom: 24,
    alignItems: 'center',
    gap: 14
  },
  canonRow: {
    flexDirection: 'row',
    backgroundColor: normaColors.graphiteScrim,
    borderRadius: 6,
    padding: 3,
    gap: 2
  },
  canonChip: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 5,
    borderRadius: 4,
    paddingHorizontal: 10,
    paddingVertical: 7
  },
  canonChipActive: {
    backgroundColor: normaColors.paper
  },
  canonGlyph: {
    fontFamily: normaFonts.mono,
    fontSize: 11,
    color: normaColors.accentFaint
  },
  canonGlyphActive: {
    color: normaColors.graphite
  },
  canonText: {
    fontFamily: normaFonts.mono,
    fontSize: 10,
    letterSpacing: 1.1,
    textTransform: 'uppercase',
    color: normaColors.paperDim
  },
  canonTextActive: {
    color: normaColors.graphite
  },
  primaryRow: {
    alignSelf: 'stretch',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between'
  },
  armPill: {
    minWidth: 76,
    alignItems: 'center',
    borderRadius: 4,
    borderWidth: 1,
    borderColor: normaColors.paperFaint,
    backgroundColor: normaColors.graphiteScrim,
    paddingHorizontal: 14,
    paddingVertical: 10
  },
  armPillActive: {
    borderColor: normaColors.accent,
    backgroundColor: normaColors.accentSoft
  },
  armText: {
    fontFamily: normaFonts.mono,
    fontSize: 11,
    letterSpacing: 1.4,
    color: normaColors.paperDim
  },
  armTextActive: {
    color: normaColors.accent
  },
  shutterZone: {
    width: SHUTTER_ZONE,
    height: SHUTTER_ZONE,
    alignItems: 'center',
    justifyContent: 'center'
  },
  shutter: {
    width: SHUTTER_SIZE,
    height: SHUTTER_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: SHUTTER_SIZE / 2,
    borderWidth: 2,
    borderColor: normaColors.paper,
    backgroundColor: 'rgba(23,23,21,0.35)'
  },
  shutterPressed: {
    opacity: 0.6
  },
  shutterInner: {
    width: SHUTTER_SIZE - 14,
    height: SHUTTER_SIZE - 14,
    borderRadius: (SHUTTER_SIZE - 14) / 2,
    backgroundColor: normaColors.paper
  },
  modeToggle: {
    flexDirection: 'row',
    backgroundColor: normaColors.graphiteScrim,
    borderRadius: 4,
    padding: 3,
    gap: 2
  },
  modeChip: {
    borderRadius: 3,
    paddingHorizontal: 9,
    paddingVertical: 8
  },
  modeChipActive: {
    backgroundColor: normaColors.paper
  },
  modeText: {
    fontFamily: normaFonts.mono,
    fontSize: 10,
    letterSpacing: 1.1,
    color: normaColors.paperDim
  },
  modeTextActive: {
    color: normaColors.graphite
  },
  devRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 5
  },
  devChip: {
    borderRadius: 3,
    backgroundColor: normaColors.graphiteScrim,
    paddingHorizontal: 8,
    paddingVertical: 5
  },
  devChipActive: {
    backgroundColor: normaColors.accentSoft,
    borderWidth: 1,
    borderColor: normaColors.accentFaint
  },
  devChipText: {
    fontFamily: normaFonts.mono,
    fontSize: 9,
    letterSpacing: 0.6,
    color: normaColors.paperDim
  },
  devChipTextActive: {
    color: normaColors.accent
  },
  devToggle: {
    position: 'absolute',
    right: 0,
    bottom: 0,
    paddingHorizontal: 8,
    paddingVertical: 4
  },
  devToggleText: {
    fontFamily: normaFonts.mono,
    fontSize: 12,
    letterSpacing: 2,
    color: normaColors.paperFaint
  },
  devToggleTextActive: {
    color: normaColors.accent
  }
});
