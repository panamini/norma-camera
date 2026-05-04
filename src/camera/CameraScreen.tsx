import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { GestureResponderEvent, LayoutChangeEvent } from 'react-native';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { withTiming } from 'react-native-reanimated';
import { Camera, usePhotoOutput } from 'react-native-vision-camera';
import { createAutoCaptureController } from '../autocapture/createAutoCaptureController';
import { DEFAULT_AUTO_CAPTURE_CONFIG } from '../autocapture/decideAutoCapture';
import type { AutoCaptureDecision } from '../autocapture/types';
import { guideKindsForOverlayMode } from '../composition/guides';
import { displayNameForGuide, formatGuideHit, formatNormalizedPoint } from '../composition/scoreExplanation';
import { DEFAULT_MAX_GUIDE_DISTANCE, scorePointAgainstGuides } from '../composition/scorePointAgainstGuides';
import type { CompositionScoreResult, GuideHit, NormalizedPoint } from '../composition/types';
import { useCompositionSharedValues } from '../composition/useCompositionSharedValues';
import { formatCandidateConfidence, instructionForDetectionMode, modeLabelForDetectionMode } from '../detection/candidateLabels';
import { useNativeHeuristicCandidate } from '../detection/useNativeHeuristicCandidate';
import { scoreDetectedComposition } from '../detection/scoreDetectedComposition';
import { selectCompositionCandidate } from '../detection/selectCompositionCandidate';
import type { CandidateSelectionResult, CompositionCandidate, DetectionMode, DetectionSource, DetectedCompositionScore, NormalizedRect } from '../detection/types';
import { CompositionOverlay } from '../overlay/CompositionOverlay';
import { ScoreBadge, type CandidateScoreSnapshot, type CaptureBanner } from '../overlay/ScoreBadge';
import { clamp } from '../shared/clamp';
import { nowMs } from '../shared/time';
import { useCameraUiStore } from '../state/cameraUiStore';
import { CameraControls } from './CameraControls';
import { useCameraDeviceSafe } from './useCameraDeviceSafe';
import { useFrameQualityStub } from './useFrameQualityStub';

type LayoutSize = { width: number; height: number };

type AppliedComposition = {
  selection: CandidateSelectionResult;
  detectedScore: DetectedCompositionScore;
  snapshot: CandidateScoreSnapshot;
};

const AUTO_CAPTURE_CHECK_INTERVAL_MS = 250;
const LABEL_UPDATE_INTERVAL_MS = 500;
const HIGHLIGHT_SCORE_THRESHOLD = 70;
const READY_SCORE_THRESHOLD = DEFAULT_AUTO_CAPTURE_CONFIG.compositionThreshold;

function findBestAxisHit(hits: GuideHit[], axis: 'x' | 'y'): GuideHit | null {
  const best = hits.filter((hit) => hit.guide.axis === axis).sort((a, b) => b.score - a.score || a.distance - b.distance)[0];
  return best && best.score >= HIGHLIGHT_SCORE_THRESHOLD ? best : null;
}

function uriForFilePath(filePath: string): string {
  return filePath.startsWith('file://') ? filePath : `file://${filePath}`;
}

function formatBounds(bounds: NormalizedRect | undefined): string | null {
  if (!bounds) return null;
  return `x=${bounds.x.toFixed(3)} · y=${bounds.y.toFixed(3)} · w=${bounds.width.toFixed(3)} · h=${bounds.height.toFixed(3)}`;
}

function makeScoreReason(candidate: CompositionCandidate | null, result: CompositionScoreResult): string {
  if (!candidate) return 'No subject candidate. Tap subject or switch Auto.';
  if (!result.bestHit) return 'No active composition guide is available for this overlay mode.';

  const guideName = displayNameForGuide(result.bestHit.guide);
  const distance = result.bestHit.distance.toFixed(3);

  if (result.score >= READY_SCORE_THRESHOLD) {
    return `High: ${candidate.label} is ${distance} from the ${guideName}; ready threshold is ${READY_SCORE_THRESHOLD}.`;
  }
  if (result.score >= 45) {
    return `Medium: ${candidate.label} is ${distance} from the ${guideName}; move closer for ${READY_SCORE_THRESHOLD}.`;
  }
  return `Low: ${candidate.label} is ${distance} from the ${guideName}; guide score reaches 0 around ${DEFAULT_MAX_GUIDE_DISTANCE}.`;
}

function makeCandidateScoreSnapshot(detectedScore: DetectedCompositionScore): CandidateScoreSnapshot {
  const candidate = detectedScore.candidate;
  if (!candidate) {
    return {
      hasCandidate: false,
      candidateSourceText: null,
      candidateConfidenceText: null,
      subjectText: null,
      boundsText: null,
      nearestGuideText: null,
      scoreReason: makeScoreReason(null, detectedScore.composition),
      candidateExplanation: detectedScore.explanation
    };
  }

  return {
    hasCandidate: true,
    candidateSourceText: candidate.label,
    candidateConfidenceText: formatCandidateConfidence(candidate.confidence),
    subjectText: formatNormalizedPoint(candidate.center),
    boundsText: formatBounds(candidate.bounds),
    nearestGuideText: formatGuideHit(detectedScore.composition.bestHit),
    scoreReason: makeScoreReason(candidate, detectedScore.composition),
    candidateExplanation: detectedScore.explanation
  };
}

function buildAutoStatusLine(params: { armed: boolean; hasCandidate: boolean; score: number; decision: AutoCaptureDecision }): string {
  const roundedScore = Math.round(params.score);
  if (!params.armed) return 'ARM OFF · auto-capture disabled';
  if (!params.hasCandidate) return 'ARMED · no subject';
  if (roundedScore < READY_SCORE_THRESHOLD) return `ARMED · adjust composition · score ${roundedScore} / ${READY_SCORE_THRESHOLD}`;
  if (params.decision.kind === 'candidate') return 'ARMED · hold steady';
  if (params.decision.kind === 'capture') return 'ARMED · capture triggered';

  switch (params.decision.reason) {
    case 'sharpness below threshold':
      return 'ARMED · quality blocked · blurry';
    case 'exposure below threshold':
      return 'ARMED · quality blocked · exposure';
    case 'motion too high':
      return 'ARMED · quality blocked · motion';
    case 'cooldown active':
      return 'ARMED · cooldown active';
    case 'scene unchanged':
      return 'ARMED · scene unchanged';
    default:
      return 'ARMED · hold steady';
  }
}

function buildGateReasonLine(decision: AutoCaptureDecision, hasCandidate: boolean): string {
  if (!hasCandidate && decision.reason === 'composition below threshold') return 'gate: no subject candidate';
  return `gate: ${decision.reason}`;
}

function buildStabilityLine(decision: AutoCaptureDecision): string | null {
  if (decision.kind !== 'candidate') return null;
  const stableForMs = Math.max(0, decision.stableForMs);
  const progress = Math.min(100, Math.round((stableForMs / DEFAULT_AUTO_CAPTURE_CONFIG.stableDurationMs) * 100));
  return `stability ${progress}% · ${stableForMs} / ${DEFAULT_AUTO_CAPTURE_CONFIG.stableDurationMs} ms`;
}

function buildQualityLine(params: { sharpnessScore: number; exposureScore: number; motionScore: number; nativeQualityIsReal: boolean }): string {
  const source = params.nativeQualityIsReal ? 'real luminance' : 'stub';
  return `sharpness ${Math.round(params.sharpnessScore)} · exposure ${Math.round(params.exposureScore)} (${source}) · motion ${Math.round(params.motionScore)} stub`;
}

function titleForCandidate(candidate: CompositionCandidate | null, result: CompositionScoreResult): string {
  if (!candidate) return 'NO SUBJECT';
  return result.label === 'TAP SUBJECT' ? candidate.label.toUpperCase() : result.label;
}

export function CameraScreen() {
  const device = useCameraDeviceSafe();
  const photoOutput = usePhotoOutput();
  const sharedValues = useCompositionSharedValues();
  const autoCaptureController = useRef(createAutoCaptureController(DEFAULT_AUTO_CAPTURE_CONFIG));
  const compositionLabelRef = useRef('NO SUBJECT');
  const mountedRef = useRef(true);
  const isCapturingRef = useRef(false);
  const wasArmedRef = useRef(false);

  const overlayMode = useCameraUiStore((state) => state.overlayMode);
  const detectionMode = useCameraUiStore((state) => state.detectionMode);
  const armed = useCameraUiStore((state) => state.armed);
  const lastCaptureAtMs = useCameraUiStore((state) => state.lastCaptureAtMs);
  const debugQualityMode = useCameraUiStore((state) => state.debugQualityMode);
  const addCapturedPhoto = useCameraUiStore((state) => state.addCapturedPhoto);
  const nativeHeuristic = useNativeHeuristicCandidate(detectionMode === 'native-heuristic');
  const nativeSharpnessScore = nativeHeuristic.analysis?.sharpness?.sharpnessScore;
  const nativeExposureScore = nativeHeuristic.analysis?.exposure?.exposureScore;
  const nativeQualityIsReal = detectionMode === 'native-heuristic' && typeof nativeSharpnessScore === 'number' && typeof nativeExposureScore === 'number';
  const detectionModeRef = useRef<DetectionMode>(detectionMode);

  const qualitySharedValues = useFrameQualityStub(debugQualityMode);
  const [layout, setLayout] = useState<LayoutSize>({ width: 0, height: 0 });
  const [manualSubject, setManualSubject] = useState<NormalizedPoint | null>(null);
  const [isCapturing, setIsCapturing] = useState(false);
  const [displayModeLabel, setDisplayModeLabel] = useState(modeLabelForDetectionMode(detectionMode));
  const [displayTitle, setDisplayTitle] = useState('NO SUBJECT');
  const [displayInstruction, setDisplayInstruction] = useState(instructionForDetectionMode(detectionMode, false));
  const [displayScore, setDisplayScore] = useState(0);
  const [autoStatusLine, setAutoStatusLine] = useState('ARM OFF · auto-capture disabled');
  const [gateReasonLine, setGateReasonLine] = useState('gate: not armed');
  const [stabilityLine, setStabilityLine] = useState<string | null>(null);
  const [candidateSource, setCandidateSource] = useState<DetectionSource>('none');
  const [candidateBounds, setCandidateBounds] = useState<NormalizedRect | undefined>(undefined);
  const [candidateSnapshot, setCandidateSnapshot] = useState<CandidateScoreSnapshot>({
    hasCandidate: false,
    candidateSourceText: null,
    candidateConfidenceText: null,
    subjectText: null,
    boundsText: null,
    nearestGuideText: null,
    scoreReason: 'No subject candidate. Tap subject or switch Auto.',
    candidateExplanation: 'Native visual-mass analyzer unavailable. Manual fallback active. No semantic object detection yet.'
  });
  const [qualityLine, setQualityLine] = useState('sharpness 80 · exposure 75 (stub) · motion 10 stub');
  const [captureBanner, setCaptureBanner] = useState<CaptureBanner | null>(null);

  const activeGuideKinds = useMemo(() => guideKindsForOverlayMode(overlayMode), [overlayMode]);

  useEffect(() => {
    sharedValues.sharpnessScore.value =
      nativeQualityIsReal && typeof nativeSharpnessScore === 'number' ? nativeSharpnessScore : qualitySharedValues.sharpnessScore.value;
    sharedValues.exposureScore.value =
      nativeQualityIsReal && typeof nativeExposureScore === 'number' ? nativeExposureScore : qualitySharedValues.exposureScore.value;
    sharedValues.motionScore.value = qualitySharedValues.motionScore.value;
    sharedValues.sceneChangedScore.value = qualitySharedValues.sceneChangedScore.value;
  }, [debugQualityMode, nativeExposureScore, nativeQualityIsReal, nativeSharpnessScore, qualitySharedValues, sharedValues]);

  useEffect(() => {
    if (detectionModeRef.current !== detectionMode) {
      if (detectionMode !== 'manual') {
        setManualSubject(null);
      }
      autoCaptureController.current.reset();
      detectionModeRef.current = detectionMode;
    }
  }, [detectionMode]);

  useEffect(() => {
    const justArmed = armed && !wasArmedRef.current;
    wasArmedRef.current = armed;

    if (!justArmed) {
      return;
    }

    if (detectionMode !== 'manual' && manualSubject !== null) {
      setManualSubject(null);
      autoCaptureController.current.reset();
      setCaptureBanner(null);
    }
  }, [armed, detectionMode, manualSubject]);

  useEffect(() => () => {
    mountedRef.current = false;
  }, []);

  const selectAndApplyCandidate = useCallback(
    (evaluationNowMs: number): AppliedComposition => {
      const selection = selectCompositionCandidate({
        nowMs: evaluationNowMs,
        manualSubject,
        autoMode: detectionMode,
        nativeFrameAnalysis: nativeHeuristic.analysis
      });
      const detectedScore = scoreDetectedComposition(selection.candidate, activeGuideKinds, selection.explanation);
      const candidate = detectedScore.candidate;
      const result = detectedScore.composition;

      sharedValues.compositionScore.value = result.score;
      compositionLabelRef.current = titleForCandidate(candidate, result);

      if (!candidate) {
        sharedValues.hasSubject.value = 0;
        sharedValues.hasCandidateBounds.value = 0;
        sharedValues.bestGuideX.value = -1;
        sharedValues.bestGuideY.value = -1;
        sharedValues.highlightIntensity.value = withTiming(0, { duration: 120 });
        return { selection, detectedScore, snapshot: makeCandidateScoreSnapshot(detectedScore) };
      }

      sharedValues.subjectX.value = candidate.center.x;
      sharedValues.subjectY.value = candidate.center.y;
      sharedValues.hasSubject.value = 1;

      if (candidate.bounds) {
        sharedValues.candidateBoundsX.value = candidate.bounds.x;
        sharedValues.candidateBoundsY.value = candidate.bounds.y;
        sharedValues.candidateBoundsWidth.value = candidate.bounds.width;
        sharedValues.candidateBoundsHeight.value = candidate.bounds.height;
        sharedValues.hasCandidateBounds.value = 1;
      } else {
        sharedValues.hasCandidateBounds.value = 0;
      }

      const guideScore = scorePointAgainstGuides(candidate.center, { activeGuideKinds });
      const bestXHit = findBestAxisHit(guideScore.hits, 'x');
      const bestYHit = findBestAxisHit(guideScore.hits, 'y');
      sharedValues.bestGuideX.value = bestXHit?.guide.value ?? -1;
      sharedValues.bestGuideY.value = bestYHit?.guide.value ?? -1;
      sharedValues.highlightIntensity.value = withTiming(result.score >= HIGHLIGHT_SCORE_THRESHOLD ? 1 : 0, { duration: 120 });

      return { selection, detectedScore, snapshot: makeCandidateScoreSnapshot(detectedScore) };
    },
    [activeGuideKinds, detectionMode, manualSubject, nativeHeuristic.analysis, sharedValues]
  );

  const publishCandidateUi = useCallback(
    (params: { selection: CandidateSelectionResult; detectedScore: DetectedCompositionScore; snapshot: CandidateScoreSnapshot; decision: AutoCaptureDecision }) => {
      const candidate = params.detectedScore.candidate;
      const hasCandidate = Boolean(candidate);
      const result = params.detectedScore.composition;
      setDisplayModeLabel(params.selection.modeLabel);
      setDisplayTitle(hasCandidate && params.decision.kind === 'candidate' ? 'COMPOSITION READY' : titleForCandidate(candidate, result));
      setDisplayInstruction(instructionForDetectionMode(detectionMode, hasCandidate));
      setDisplayScore(result.score);
      setCandidateSource(candidate?.source ?? 'none');
      setCandidateBounds(candidate?.bounds);
      setCandidateSnapshot(params.snapshot);
      setAutoStatusLine(buildAutoStatusLine({ armed, hasCandidate, score: result.score, decision: params.decision }));
      setGateReasonLine(buildGateReasonLine(params.decision, hasCandidate));
      setStabilityLine(buildStabilityLine(params.decision));
      setQualityLine(
        buildQualityLine({
          sharpnessScore: sharedValues.sharpnessScore.value,
          exposureScore: sharedValues.exposureScore.value,
          motionScore: sharedValues.motionScore.value,
          nativeQualityIsReal
        })
      );
    },
    [armed, detectionMode, nativeQualityIsReal, sharedValues]
  );

  useEffect(() => {
    const applied = selectAndApplyCandidate(nowMs());
    const idleDecision: AutoCaptureDecision = { kind: 'idle', reason: armed ? 'waiting for next check' : 'not armed', nextStableSinceMs: null };
    publishCandidateUi({ ...applied, decision: idleDecision });
    autoCaptureController.current.reset();
  }, [armed, publishCandidateUi, selectAndApplyCandidate]);

  const handleLayout = useCallback((event: LayoutChangeEvent) => {
    const { width, height } = event.nativeEvent.layout;
    setLayout({ width, height });
  }, []);

  const handlePreviewPress = useCallback(
    (event: GestureResponderEvent) => {
      if (layout.width <= 0 || layout.height <= 0) {
        return;
      }

      setManualSubject({
        x: clamp(event.nativeEvent.locationX / layout.width, 0, 1),
        y: clamp(event.nativeEvent.locationY / layout.height, 0, 1)
      });
      setCaptureBanner(null);
      autoCaptureController.current.reset();
    },
    [layout.height, layout.width]
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

        addCapturedPhoto({ uri, createdAtMs, label, score });
        autoCaptureController.current.reset();
        setCaptureBanner({ score, uri, trigger });
        setAutoStatusLine(trigger === 'auto' ? 'ARMED · captured' : 'manual capture complete');
        setGateReasonLine('gate: capture complete');
        setStabilityLine(null);
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown capture error';
        setAutoStatusLine(`capture failed · ${message}`);
        setGateReasonLine('gate: capture failed');
      } finally {
        isCapturingRef.current = false;
        if (mountedRef.current) setIsCapturing(false);
      }
    },
    [addCapturedPhoto, photoOutput, sharedValues.compositionScore]
  );

  useEffect(() => {
    let lastLabelUpdateAtMs = 0;
    const interval = setInterval(() => {
      const currentNowMs = nowMs();
      const applied = selectAndApplyCandidate(currentNowMs);
      const hasCandidate = applied.selection.candidate !== null;
      const decision = autoCaptureController.current.evaluate({
        nowMs: currentNowMs,
        armed,
        compositionScore: hasCandidate ? applied.detectedScore.composition.score : 0,
        quality: {
          sharpnessScore: sharedValues.sharpnessScore.value,
          exposureScore: sharedValues.exposureScore.value,
          motionScore: sharedValues.motionScore.value,
          sceneChangedScore: sharedValues.sceneChangedScore.value
        },
        lastCaptureAtMs
      });

      if (decision.kind === 'capture') void capturePhoto('auto');

      if (currentNowMs - lastLabelUpdateAtMs >= LABEL_UPDATE_INTERVAL_MS) {
        lastLabelUpdateAtMs = currentNowMs;
        publishCandidateUi({ ...applied, decision });
      }
    }, AUTO_CAPTURE_CHECK_INTERVAL_MS);

    return () => clearInterval(interval);
  }, [armed, capturePhoto, lastCaptureAtMs, publishCandidateUi, selectAndApplyCandidate, sharedValues]);

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
      <Pressable accessibilityRole="button" accessibilityLabel="Camera preview, tap to mark manual subject center" onPress={handlePreviewPress} style={StyleSheet.absoluteFill}>
        <CompositionOverlay width={layout.width} height={layout.height} overlayMode={overlayMode} sharedValues={sharedValues} candidateSource={candidateSource} candidateBounds={candidateBounds} />
      </Pressable>
      <ScoreBadge
        modeLabel={displayModeLabel}
        title={displayTitle}
        instruction={displayInstruction}
        score={displayScore}
        statusLine={autoStatusLine}
        gateReasonLine={gateReasonLine}
        stabilityLine={stabilityLine}
        qualityLine={qualityLine}
        snapshot={candidateSnapshot}
        captureBanner={captureBanner}
        debugQualityMode={debugQualityMode}
      />
      <CameraControls onManualCapture={() => void capturePhoto('manual')} isCapturing={isCapturing} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#000000' },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#000000', padding: 24 },
  centeredText: { color: '#ffffff', fontSize: 16, fontWeight: '700', textAlign: 'center' }
});
