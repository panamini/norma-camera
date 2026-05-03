import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { GestureResponderEvent, LayoutChangeEvent } from 'react-native';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { withTiming } from 'react-native-reanimated';
import { Camera, usePhotoOutput } from 'react-native-vision-camera';
import { createAutoCaptureController } from '../autocapture/createAutoCaptureController';
import { DEFAULT_AUTO_CAPTURE_CONFIG } from '../autocapture/decideAutoCapture';
import type { AutoCaptureDecision } from '../autocapture/types';
import { describeGuideHit, explainGuideScore, formatNormalizedPoint } from '../composition/describeGuideHit';
import { guideKindsForOverlayMode } from '../composition/guides';
import { scoreFrameComposition } from '../composition/scoreFrameComposition';
import { scorePointAgainstGuides } from '../composition/scorePointAgainstGuides';
import type { CompositionScoreResult, GuideHit, NormalizedPoint } from '../composition/types';
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

type CompositionDisplay = {
  hasSubject: boolean;
  point: NormalizedPoint | null;
  label: string;
  score: number;
  coordinateLabel: string;
  nearestGuideLabel: string;
  scoreReasonLabel: string;
};

type CaptureBanner = {
  uri: string;
  score: number;
} | null;

const AUTO_CAPTURE_CHECK_INTERVAL_MS = 250;
const LABEL_UPDATE_INTERVAL_MS = 500;
const HIGHLIGHT_SCORE_THRESHOLD = 70;
const CAPTURE_THRESHOLD = DEFAULT_AUTO_CAPTURE_CONFIG.compositionThreshold;

const EMPTY_COMPOSITION_DISPLAY: CompositionDisplay = {
  hasSubject: false,
  point: null,
  label: 'TAP SUBJECT',
  score: 0,
  coordinateLabel: 'x=— · y=—',
  nearestGuideLabel: 'nearest guide: none',
  scoreReasonLabel: 'No subject point has been selected. Manual V0 does not detect objects or horizons yet.'
};

function findBestAxisHit(hits: GuideHit[], axis: 'x' | 'y'): GuideHit | null {
  const best = hits.filter((hit) => hit.guide.axis === axis).sort((a, b) => b.score - a.score || a.distance - b.distance)[0];
  return best && best.score >= HIGHLIGHT_SCORE_THRESHOLD ? best : null;
}

function uriForFilePath(filePath: string): string {
  return filePath.startsWith('file://') ? filePath : `file://${filePath}`;
}

function displayFromScore(point: NormalizedPoint | null, result: CompositionScoreResult): CompositionDisplay {
  if (!point) {
    return EMPTY_COMPOSITION_DISPLAY;
  }

  return {
    hasSubject: true,
    point,
    label: result.label,
    score: result.score,
    coordinateLabel: formatNormalizedPoint(point),
    nearestGuideLabel: describeGuideHit(result.bestHit),
    scoreReasonLabel: explainGuideScore(result.score, result.bestHit)
  };
}


function statusForManualDisplay(display: CompositionDisplay, armed: boolean): string {
  if (!armed) {
    return 'ARM OFF · auto-capture disabled';
  }

  if (!display.hasSubject) {
    return 'ARMED · tap subject first';
  }

  if (display.score < CAPTURE_THRESHOLD) {
    return `ARMED · adjust composition · score ${Math.round(display.score)} / ${CAPTURE_THRESHOLD}`;
  }

  return 'ARMED · hold steady';
}

function statusForDecision(hasSubject: boolean, score: number, armed: boolean, decision: AutoCaptureDecision): string {
  if (!armed) {
    return 'ARM OFF · auto-capture disabled';
  }

  if (!hasSubject) {
    return 'ARMED · tap subject first';
  }

  if (score < CAPTURE_THRESHOLD) {
    return `ARMED · adjust composition · score ${Math.round(score)} / ${CAPTURE_THRESHOLD}`;
  }

  if (decision.kind === 'candidate' || decision.kind === 'capture') {
    return 'ARMED · hold steady';
  }

  switch (decision.reason) {
    case 'sharpness below threshold':
      return 'ARMED · quality gate: blurry frame';
    case 'exposure below threshold':
      return 'ARMED · quality gate: bad exposure';
    case 'motion too high':
      return 'ARMED · quality gate: motion too high';
    case 'scene unchanged':
      return 'ARMED · scene unchanged';
    case 'cooldown active':
      return 'ARMED · cooldown active';
    default:
      return `ARMED · ${decision.reason}`;
  }
}

function stabilityLabelForDecision(decision: AutoCaptureDecision): string | null {
  if (decision.kind !== 'candidate') {
    return null;
  }

  const stableForMs = Math.max(0, decision.stableForMs);
  const progress = Math.min(100, Math.round((stableForMs / DEFAULT_AUTO_CAPTURE_CONFIG.stableDurationMs) * 100));
  return `stability ${progress}% · ${Math.round(stableForMs)} / ${DEFAULT_AUTO_CAPTURE_CONFIG.stableDurationMs} ms`;
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
  const [compositionDisplay, setCompositionDisplay] = useState<CompositionDisplay>(EMPTY_COMPOSITION_DISPLAY);
  const [armStatusLabel, setArmStatusLabel] = useState('ARM OFF · auto-capture disabled');
  const [stabilityLabel, setStabilityLabel] = useState<string | null>(null);
  const [captureBanner, setCaptureBanner] = useState<CaptureBanner>(null);

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
        return displayFromScore(null, result);
      }

      const guideScore = scorePointAgainstGuides(point, { activeGuideKinds });
      const bestXHit = findBestAxisHit(guideScore.hits, 'x');
      const bestYHit = findBestAxisHit(guideScore.hits, 'y');

      sharedValues.bestGuideX.value = bestXHit?.guide.value ?? -1;
      sharedValues.bestGuideY.value = bestYHit?.guide.value ?? -1;
      sharedValues.highlightIntensity.value = withTiming(result.score >= HIGHLIGHT_SCORE_THRESHOLD ? 1 : 0, { duration: 120 });

      return displayFromScore(point, result);
    },
    [activeGuideKinds, sharedValues]
  );

  useEffect(() => {
    const display =
      sharedValues.hasSubject.value === 1
        ? applyCompositionScore({ x: sharedValues.subjectX.value, y: sharedValues.subjectY.value })
        : applyCompositionScore(null);

    setCompositionDisplay(display);
    setArmStatusLabel(statusForManualDisplay(display, armed));
    setStabilityLabel(null);
    autoCaptureController.current.reset();
  }, [applyCompositionScore, armed, overlayMode, sharedValues]);

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
      const display = applyCompositionScore(point);

      setCompositionDisplay(display);
      setArmStatusLabel(statusForManualDisplay(display, armed));
      setStabilityLabel(null);
      setCaptureBanner(null);
      autoCaptureController.current.reset();
    },
    [applyCompositionScore, armed, layout.height, layout.width, sharedValues]
  );

  useEffect(() => {
    setArmStatusLabel(statusForManualDisplay(compositionDisplay, armed));

    if (!armed || !compositionDisplay.hasSubject || compositionDisplay.score < CAPTURE_THRESHOLD) {
      setStabilityLabel(null);
    }
  }, [armed, compositionDisplay.hasSubject, compositionDisplay.score]);

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
          const { filePath } = await photoOutput.capturePhotoToFile(
            {},
            {
              onWillBeginCapture: () => {},
              onDidCapturePhoto: () => {},
            },
          );
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
        setCaptureBanner({ uri, score });
        setArmStatusLabel(trigger === 'auto' ? 'ARMED · captured' : 'MANUAL CAPTURED');
        setStabilityLabel(null);
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown capture error';
        setArmStatusLabel(`CAPTURE FAILED: ${message}`);
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
      const score = sharedValues.compositionScore.value;
      const hasSubject = sharedValues.hasSubject.value === 1;
      const quality = {
        sharpnessScore: sharedValues.sharpnessScore.value,
        exposureScore: sharedValues.exposureScore.value,
        motionScore: sharedValues.motionScore.value,
        sceneChangedScore: sharedValues.sceneChangedScore.value
      };

      const decision: AutoCaptureDecision = autoCaptureController.current.evaluate({
        nowMs: now,
        armed,
        compositionScore: score,
        quality,
        lastCaptureAtMs
      });

      if (decision.kind === 'capture') {
        void capturePhoto('auto');
      }

      if (now - lastLabelUpdateAtMs >= LABEL_UPDATE_INTERVAL_MS) {
        lastLabelUpdateAtMs = now;
        setCompositionDisplay((current) => ({ ...current, score }));
        setArmStatusLabel(statusForDecision(hasSubject, score, armed, decision));
        setStabilityLabel(stabilityLabelForDecision(decision));
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

  const primaryLabel = compositionDisplay.hasSubject ? compositionDisplay.label : 'Tap the subject point.';
  const instructionLabel = compositionDisplay.hasSubject
    ? 'Point scorer only · no object or horizon detection yet.'
    : 'Tap the subject point.';

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
      <ScoreBadge
        modeLabel="MANUAL V0"
        primaryLabel={primaryLabel}
        instructionLabel={instructionLabel}
        armStatusLabel={armStatusLabel}
        hasSubject={compositionDisplay.hasSubject}
        coordinateLabel={compositionDisplay.coordinateLabel}
        nearestGuideLabel={compositionDisplay.nearestGuideLabel}
        score={compositionDisplay.score}
        scoreReasonLabel={compositionDisplay.scoreReasonLabel}
        stabilityLabel={stabilityLabel}
        captureBanner={captureBanner}
        debugQualityMode={debugQualityMode}
      />
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
