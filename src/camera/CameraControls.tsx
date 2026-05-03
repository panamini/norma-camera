import { memo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { OverlayMode } from '../composition/types';
import { useCameraUiStore, type DebugQualityMode } from '../state/cameraUiStore';

type Props = {
  onManualCapture: () => void;
  isCapturing: boolean;
};

const OVERLAY_MODES: OverlayMode[] = ['thirds', 'halves', 'both'];
const QUALITY_MODES: DebugQualityMode[] = ['normal', 'blurry', 'badExposure', 'motion'];

function CameraControlsComponent({ onManualCapture, isCapturing }: Props) {
  const overlayMode = useCameraUiStore((state) => state.overlayMode);
  const armed = useCameraUiStore((state) => state.armed);
  const debugQualityMode = useCameraUiStore((state) => state.debugQualityMode);
  const setOverlayMode = useCameraUiStore((state) => state.setOverlayMode);
  const toggleArmed = useCameraUiStore((state) => state.toggleArmed);
  const setDebugQualityMode = useCameraUiStore((state) => state.setDebugQualityMode);

  return (
    <View style={styles.root}>
      <View accessibilityLabel="Overlay mode" style={styles.segmented}>
        {OVERLAY_MODES.map((mode) => {
          const active = mode === overlayMode;

          return (
            <Pressable
              key={mode}
              accessibilityRole="button"
              accessibilityLabel={`Show ${mode} composition guides`}
              accessibilityState={{ selected: active }}
              onPress={() => setOverlayMode(mode)}
              style={[styles.segmentButton, active ? styles.segmentButtonActive : null]}
            >
              <Text style={[styles.segmentText, active ? styles.segmentTextActive : null]}>{mode}</Text>
            </Pressable>
          );
        })}
      </View>

      <View style={styles.primaryRow}>
        <Pressable
          accessibilityRole="switch"
          accessibilityLabel={armed ? 'Turn armed auto capture off' : 'Turn armed auto capture on'}
          accessibilityState={{ checked: armed }}
          onPress={toggleArmed}
          style={[styles.armedButton, armed ? styles.armedButtonActive : null]}
        >
          <Text style={[styles.armedText, armed ? styles.armedTextActive : null]}>{armed ? 'ARM ON' : 'ARM OFF'}</Text>
        </Pressable>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Take photo manually"
          disabled={isCapturing}
          onPress={onManualCapture}
          style={[styles.captureButton, isCapturing ? styles.captureButtonDisabled : null]}
        >
          <View style={styles.captureButtonInner} />
        </Pressable>
      </View>

      <View accessibilityLabel="Debug quality gates" style={styles.debugRow}>
        {QUALITY_MODES.map((mode) => {
          const active = mode === debugQualityMode;

          return (
            <Pressable
              key={mode}
              accessibilityRole="button"
              accessibilityLabel={`Set debug quality mode ${mode}`}
              accessibilityState={{ selected: active }}
              onPress={() => setDebugQualityMode(mode)}
              style={[styles.debugButton, active ? styles.debugButtonActive : null]}
            >
              <Text style={[styles.debugText, active ? styles.debugTextActive : null]}>{mode}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

export const CameraControls = memo(CameraControlsComponent);

const styles = StyleSheet.create({
  root: {
    position: 'absolute',
    left: 16,
    right: 16,
    bottom: 28,
    alignItems: 'center',
    gap: 14
  },
  segmented: {
    flexDirection: 'row',
    borderRadius: 999,
    backgroundColor: 'rgba(0,0,0,0.5)',
    padding: 4
  },
  segmentButton: {
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 8
  },
  segmentButtonActive: {
    backgroundColor: 'rgba(255,255,255,0.9)'
  },
  segmentText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '700',
    textTransform: 'uppercase'
  },
  segmentTextActive: {
    color: '#000000'
  },
  primaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 28
  },
  armedButton: {
    minWidth: 92,
    alignItems: 'center',
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.6)',
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingHorizontal: 18,
    paddingVertical: 12
  },
  armedButtonActive: {
    borderColor: '#f2b84b',
    backgroundColor: 'rgba(242,184,75,0.2)'
  },
  armedText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '800'
  },
  armedTextActive: {
    color: '#f2b84b'
  },
  captureButton: {
    width: 72,
    height: 72,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 36,
    borderWidth: 4,
    borderColor: '#ffffff',
    backgroundColor: 'rgba(0,0,0,0.32)'
  },
  captureButtonDisabled: {
    opacity: 0.5
  },
  captureButtonInner: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#ffffff'
  },
  debugRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 6
  },
  debugButton: {
    borderRadius: 999,
    backgroundColor: 'rgba(0,0,0,0.48)',
    paddingHorizontal: 9,
    paddingVertical: 5
  },
  debugButtonActive: {
    backgroundColor: 'rgba(242,184,75,0.82)'
  },
  debugText: {
    color: 'rgba(255,255,255,0.76)',
    fontSize: 10,
    fontWeight: '700'
  },
  debugTextActive: {
    color: '#000000'
  }
});
