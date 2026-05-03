import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { GestureResponderEvent, LayoutChangeEvent } from 'react-native';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Camera, usePhotoOutput } from 'react-native-vision-camera';
import { withTiming } from 'react-native-reanimated';
import { createAutoCaptureController } from '../autocapture/createAutoCaptureController';
import { DEFAULT_AUTO_CAPTURE_CONFIG } from '../autocapture/decideAutoCapture';
import type { AutoCaptureDecision } from '../autocapture/types';
import { guideKindsForOverlayMode } from '../composition/guides';
import { scoreFrameComposition } from '../composition/scoreFrameComposition';
import { scorePointAgainstGuides } from '../composition/scorePointAgainstGuides';
import type { GuideHit, NormalizedPoint } from '../composition/types';
import { useCompositionSharedValues } from '../composition/useCompositionSharedValues';
import { CompositionOverlay } from '../overlay/CompositionOverlay';
import { ScoreBadge } from '../overlay/ScoreBadge';
import { clamp } from '../shared/clamp';
import { nowMs } from '../shared/time';
import { useCameraUiStore } from '../state/cameraUiStore';
import { CameraControls } from './CameraControls';
import { useCameraDeviceSafe } from './useCameraDeviceSafe';
import { useFrameQualityStub } from './useFrameQualityStub';

type LayoutSize = {
  width: number;
  height: number;
};

const AUTO_CAPTURE_CHECK_INTERVAL_MS = 250;
const LABEL_UPDATE_INTERVAL_MS = 500;
const HIGHLIGHT_SCORE_THRESHOLD = 70;

function findBestAxisHit(hits: GuideHit[], axis: 'x' | 'y'): GuideHit | null {
  const best = hits.filter((hit) => hit.guide.axis === axis).sort((a, b) => b.score - a.score || a.distance - b.distance)[0];
  return best && best.score >= HIGHLIGHT_SCORE_THRESHOLD ? best : null;
}

function uriForFilePath(filePath: string): string {
  return filePath.startsWith('file://') ? filePath : `file://${filePath}`;
}

export function CameraScreen() {
  const device = useCameraDeviceSafe();
  const photoOutput = usePhotoOutput();
  const sharedValues = useCompositionSharedValues();
  const autoCaptureController = useRef(createAutoCaptureController(DEFAULT_AUTO_CAPTURE_CONFIG));
  const compositionLabelRef = useRef('TAP SUBJECT');
  const mountedRef = useRef(true);
  const isCapturingRef = useRef(false);

  const overlayMode = useCameraUiStore((state) => state.overlayMode);
  const armed = useCameraUiStore((state) => state.armed);
  const lastCaptureAtMs = useCameraUiStore((state) => state.lastCaptureAtMs);
  const debugQualityMode = useCameraUiStore((state) => state.debugQualityMode);
  const addCapturedPhoto = useCameraUiStore((state) => state.addCapturedPhoto);

  const qualitySharedValues = useFrameQualityStub(debugQualityMode);
  const [layout, setLayout] = useState<LayoutSize>({ width: 0, height: 0 });
  const [isCapturing, setIsCapturing] = useState(false);
  const [displayLabel, setDisplayLabel] = useState('TAP SUBJECT');
  const [displayScore, setDisplayScore] = useState(0);
  const [autoStateLabel, setAutoStateLabel] = useState('IDLE');

  const activeGuideKinds = useMemo(() => guideKindsForOverlayMode(overlayMode), [overlayMode]);

  useEffect(() => {
    sharedValues.sharpnessScore.value = qualitySharedValues.sharpnessScore.value;
    sharedValues.exposureScore.value = qualitySharedValues.exposureScore.value;
    sharedValues.motionScore.value = qualitySharedValues.motionScore.value;
    sharedValues.sceneChangedScore.value = qualitySharedValues.sceneChangedScore.value;
  }, [debugQualityMode, qualitySharedValues, sharedValues]);

  useEffect(() => {
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const applyCompositionScore = useCallback(
    (point: NormalizedPoint | null) => {
      const result = scoreFrameComposition({
        subjectCenter: point,
        activeGuideKinds
      });

      sharedValues.compositionScore.value = result.score;
      compositionLabelRef.current = result.label;

      if (!point) {
        sharedValues.bestGuideX.value = -1;
        sharedValues.bestGuideY.value = -1;
        sharedValues.highlightIntensity.value = withTiming(0, { duration: 120 });
        return result;
      }

      const guideScore = scorePointAgainstGuides(point, { activeGuideKinds });
      const bestXHit = findBestAxisHit(guideScore.hits, 'x');
      const bestYHit = findBestAxisHit(guideScore.hits, 'y');

      sharedValues.bestGuideX.value = bestXHit?.guide.value ?? -1;
      sharedValues.bestGuideY.value = bestYHit?.guide.value ?? -1;
      sharedValues.highlightIntensity.value = withTiming(result.score >= HIGHLIGHT_SCORE_THRESHOLD ? 1 : 0, { duration: 120 });

      return result;
    },
    [activeGuideKinds, sharedValues]
  );

  useEffect(() => {
    if (sharedValues.hasSubject.value === 1) {
      const result = applyCompositionScore({ x: sharedValues.subjectX.value, y: sharedValues.subjectY.value });
      setDisplayLabel(result.label);
      setDisplayScore(result.score);
      autoCaptureController.current.reset();
    }
  }, [applyCompositionScore, overlayMode, sharedValues]);

  const handleLayout = useCallback((event: LayoutChangeEvent) => {
    const { width, height } = event.nativeEvent.layout;
    setLayout({ width, height });
  }, []);

  const handlePreviewPress = useCallback(
    (event: GestureResponderEvent) => {
      if (layout.width <= 0 || layout.height <= 0) {
        return;
      }

      const point: NormalizedPoint = {
        x: clamp(event.nativeEvent.locationX / layout.width, 0, 1),
        y: clamp(event.nativeEvent.locationY / layout.height, 0, 1)
      };

      sharedValues.subjectX.value = point.x;
      sharedValues.subjectY.value = point.y;
      sharedValues.hasSubject.value = 1;
      const result = applyCompositionScore(point);

      setDisplayLabel(result.label);
      setDisplayScore(result.score);
      autoCaptureController.current.reset();
    },
    [applyCompositionScore, layout.height, layout.width, sharedValues]
  );

  const capturePhoto = useCallback(
    async (trigger: 'manual' | 'auto') => {
      if (isCapturingRef.current) {
        return;
      }

      isCapturingRef.current = true;
      setIsCapturing(true);
      const createdAtMs = nowMs();
      const score = Math.round(sharedValues.compositionScore.value);
      const label = trigger === 'auto' ? 'COMPOSITION READY' : compositionLabelRef.current;

      try {
        let uri: string;

        if (photoOutput && typeof photoOutput.capturePhotoToFile === 'function') {
          const { filePath } = await photoOutput.capturePhotoToFile({}, {});
          uri = uriForFilePath(filePath);
        } else {
          uri = `simulated-capture://${createdAtMs}`;
        }

        addCapturedPhoto({
          uri,
          createdAtMs,
          label,
          score
        });
        autoCaptureController.current.reset();
        setAutoStateLabel(trigger === 'auto' ? 'AUTO CAPTURED' : 'CAPTURED');
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown capture error';
        setAutoStateLabel(`CAPTURE FAILED: ${message}`);
      } finally {
        isCapturingRef.current = false;
        if (mountedRef.current) {
          setIsCapturing(false);
        }
      }
    },
    [addCapturedPhoto, photoOutput, sharedValues.compositionScore]
  );

  useEffect(() => {
    let lastLabelUpdateAtMs = 0;
    const interval = setInterval(() => {
      const now = nowMs();
      const quality = {
        sharpnessScore: sharedValues.sharpnessScore.value,
        exposureScore: sharedValues.exposureScore.value,
        motionScore: sharedValues.motionScore.value,
        sceneChangedScore: sharedValues.sceneChangedScore.value
      };

      const decision: AutoCaptureDecision = autoCaptureController.current.evaluate({
        nowMs: now,
        armed,
        compositionScore: sharedValues.compositionScore.value,
        quality,
        lastCaptureAtMs
      });

      if (decision.kind === 'capture') {
        void capturePhoto('auto');
      }

      if (now - lastLabelUpdateAtMs >= LABEL_UPDATE_INTERVAL_MS) {
        lastLabelUpdateAtMs = now;
        const label = decision.kind === 'candidate' ? 'HOLD STEADY' : compositionLabelRef.current;
        setDisplayLabel(armed && decision.kind === 'capture' ? 'COMPOSITION READY' : label);
        setDisplayScore(sharedValues.compositionScore.value);
        setAutoStateLabel(decision.kind === 'candidate' ? `HOLD ${Math.round(decision.stableForMs / 100) / 10}s` : decision.reason.toUpperCase());
      }
    }, AUTO_CAPTURE_CHECK_INTERVAL_MS);

    return () => clearInterval(interval);
  }, [armed, capturePhoto, lastCaptureAtMs, sharedValues]);

  if (!device) {
    return (
      <View style={styles.centered}>
        <Text style={styles.centeredText}>No back camera found.</Text>
      </View>
    );
  }

  return (
    <View style={styles.root} onLayout={handleLayout}>
      <Camera style={StyleSheet.absoluteFill} device={device} isActive outputs={[photoOutput]} />
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Camera preview, tap to mark subject center"
        onPress={handlePreviewPress}
        style={StyleSheet.absoluteFill}
      >
        <CompositionOverlay width={layout.width} height={layout.height} overlayMode={overlayMode} sharedValues={sharedValues} />
      </Pressable>
      <ScoreBadge label={displayLabel} score={displayScore} armed={armed} autoStateLabel={autoStateLabel} debugQualityMode={debugQualityMode} />
      <CameraControls onManualCapture={() => void capturePhoto('manual')} isCapturing={isCapturing} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#000000'
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#000000',
    padding: 24
  },
  centeredText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
    textAlign: 'center'
  }
});
