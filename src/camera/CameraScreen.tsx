import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { GestureResponderEvent, LayoutChangeEvent } from 'react-native';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { withTiming } from 'react-native-reanimated';
import { Camera, useFrameOutput, usePhotoOutput } from 'react-native-vision-camera';
import { captureReadinessLine } from '../autocapture/captureReadinessText';
import { createAutoCaptureController } from '../autocapture/createAutoCaptureController';
import { DEFAULT_AUTO_CAPTURE_CONFIG } from '../autocapture/decideAutoCapture';
import type { AutoCaptureDecision } from '../autocapture/types';
import { canonById } from '../composition/canons';
import { displayNameForGuide, formatCompositionBreakdown, formatGuideHit, formatNormalizedPoint } from '../composition/scoreExplanation';
import { DEFAULT_MAX_GUIDE_DISTANCE } from '../composition/scorePointAgainstGuides';
import type { CompositionScoreResult, GuideKind, NormalizedPoint } from '../composition/types';
import { useCompositionSharedValues } from '../composition/useCompositionSharedValues';
import { formatCandidateConfidence, instructionForDetectionMode, modeLabelForDetectionMode, statusInstructionFor } from '../detection/candidateLabels';
import {
  mapNativeEvidenceToPreview,
  mapNormalizedFramePointToPreviewPoint,
  mapNormalizedFrameRectToPreviewRect,
  type NativeEvidencePreviewMapping,
  type PreviewGeometry
} from '../detection/nativeEvidenceCoordinateMapping';
import { EMPTY_LINE_HARMONY, scoreLineHarmony } from '../detection/lineHarmony';
import { makeNativeAnalysisDebugLine } from '../detection/nativeHeuristicDebug';
import type { NativeFrameAnalysisResult } from '../detection/nativeHeuristicTypes';
import { nativeVisualMassDebugOverlay, nativeVisualMassOverlayCandidate } from '../detection/nativeVisualMassOverlay';
import { getNormaFrameAnalyzer } from '../detection/normaFrameAnalyzer';
import { scoreDetectedComposition } from '../detection/scoreDetectedComposition';
import { selectCompositionCandidate } from '../detection/selectCompositionCandidate';
import type { CandidateSelectionResult, CompositionCandidate, DetectionMode, DetectionSource, DetectedCompositionScore, NormalizedRect } from '../detection/types';
import { useNativeHeuristicCandidate } from '../detection/useNativeHeuristicCandidate';
import { GallerySheet } from '../capture/GallerySheet';
import { ReviewScreen } from '../capture/ReviewScreen';
import { CompositionOverlay } from '../overlay/CompositionOverlay';
import { ScoreBadge, type CandidateScoreSnapshot, type CaptureBanner } from '../overlay/ScoreBadge';
import { WhySheet } from '../overlay/WhySheet';
import { clamp } from '../shared/clamp';
import { nowMs } from '../shared/time';
import { useCameraUiStore, type CapturedPhoto } from '../state/cameraUiStore';
import { getDebugOverlayVisibility } from '../state/debugOverlayVisibility';
import { tickNodeLock } from '../ui/haptics';
import { CameraControls } from './CameraControls';
import { FirstRunCoach } from './FirstRunCoach';
import { evaluateNodeLockTick, nearestNode } from './nodeLockTick';
import { StatusStrip } from './StatusStrip';
import { useCameraDeviceSafe } from './useCameraDeviceSafe';
import { useFrameQualityStub } from './useFrameQualityStub';

type LayoutSize = { width: number; height: number };

type AppliedComposition = {
  selection: CandidateSelectionResult;
  detectedScore: DetectedCompositionScore;
  snapshot: CandidateScoreSnapshot;
  overlaySource: DetectionSource;
};

type CameraPreviewProps = {
  device: NonNullable<ReturnType<typeof useCameraDeviceSafe>>;
  photoOutput: ReturnType<typeof usePhotoOutput>;
};

const AUTO_CAPTURE_CHECK_INTERVAL_MS = 250;
const LABEL_UPDATE_INTERVAL_MS = 500;
const SUBJECT_EASE_MS = 180;
const SCORE_EASE_MS = 220;
const CAPTURE_TOAST_MS = 2500;
const LOCK_PULSE_MS = 520;
const HIGHLIGHT_SCORE_THRESHOLD = 70;
const READY_SCORE_THRESHOLD = DEFAULT_AUTO_CAPTURE_CONFIG.compositionThreshold;
const GUIDE_SCORE_RETENTION_MS = 900;

function uriForFilePath(filePath: string): string {
  return filePath.startsWith('file://') ? filePath : `file://${filePath}`;
}

function formatBounds(bounds: NormalizedRect | undefined): string | null {
  if (!bounds) return null;
  return `x=${bounds.x.toFixed(3)} · y=${bounds.y.toFixed(3)} · w=${bounds.width.toFixed(3)} · h=${bounds.height.toFixed(3)}`;
}

function mapNativeCandidateForOverlay(candidate: CompositionCandidate, evidenceMapping: NativeEvidencePreviewMapping): CompositionCandidate {
  if (candidate.source !== 'native-heuristic' || !evidenceMapping.frameGeometry) return candidate;

  const mappedCenter = mapNormalizedFramePointToPreviewPoint(candidate.center, evidenceMapping.frameGeometry, evidenceMapping.previewGeometry);
  if (!mappedCenter) return candidate;

  let mappedBounds: NormalizedRect | undefined;
  if (candidate.bounds) {
    const nextMappedBounds = mapNormalizedFrameRectToPreviewRect(candidate.bounds, evidenceMapping.frameGeometry, evidenceMapping.previewGeometry);
    if (!nextMappedBounds) return candidate;
    mappedBounds = nextMappedBounds;
  }

  return {
    ...candidate,
    center: mappedCenter,
    bounds: mappedBounds
  };
}

function lineContributionSuffix(result: CompositionScoreResult): string {
  if (result.lineContribution <= 0 || result.lineAlignmentScore === null) return '';
  return ` Horizontal line adds +${result.lineContribution} as a secondary signal.`;
}

function formatLineContributionText(result: CompositionScoreResult): string | null {
  if (result.lineContribution <= 0 || result.lineAlignmentScore === null) return null;
  return `+${result.lineContribution} · alignment ${Math.round(result.lineAlignmentScore)} / 100`;
}

function makeScoreReason(candidate: CompositionCandidate | null, result: CompositionScoreResult): string {
  if (!candidate) return 'No subject candidate. Tap your subject to score it.';
  if (!result.bestHit) return 'No active composition guide is available for this overlay mode.';

  const guideName = displayNameForGuide(result.bestHit.guide);
  const distance = result.bestHit.distance.toFixed(3);
  const lineSuffix = lineContributionSuffix(result);

  if (result.score >= READY_SCORE_THRESHOLD) {
    return `High: ${candidate.label} is ${distance} from the ${guideName}; ready threshold is ${READY_SCORE_THRESHOLD}.${lineSuffix}`;
  }
  if (result.score >= 45) {
    return `Medium: ${candidate.label} is ${distance} from the ${guideName}; move closer for ${READY_SCORE_THRESHOLD}.${lineSuffix}`;
  }
  return `Low: ${candidate.label} is ${distance} from the ${guideName}; guide score reaches 0 around ${DEFAULT_MAX_GUIDE_DISTANCE}.${lineSuffix}`;
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
      lineContributionText: null,
      compositionBreakdownLines: null,
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
    lineContributionText: formatLineContributionText(detectedScore.composition),
    compositionBreakdownLines: formatCompositionBreakdown(detectedScore.composition),
    candidateExplanation: detectedScore.explanation
  };
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

function buildQualityLine(params: {
  sharpnessScore: number;
  exposureScore: number;
  motionScore: number;
  nativeQualityIsReal: boolean;
  nativeAnalysis: NativeFrameAnalysisResult | null;
  showNativeDebug: boolean;
  guideScore: number | null;
  activeGuideKinds: GuideKind[];
  lineGuideScore: DetectedCompositionScore['lineGuideScore'];
  nativeEvidenceMapping?: NativeEvidencePreviewMapping;
}): string {
  const source = params.nativeQualityIsReal ? 'real luminance' : 'stub';
  const quality = `sharpness ${Math.round(params.sharpnessScore)} · exposure ${Math.round(params.exposureScore)} (${source}) · motion ${Math.round(params.motionScore)} stub`;
  const nativeDebug = makeNativeAnalysisDebugLine(
    params.nativeAnalysis,
    params.showNativeDebug,
    nowMs(),
    params.guideScore,
    params.activeGuideKinds,
    params.lineGuideScore,
    params.nativeEvidenceMapping
  );
  return nativeDebug ? `${quality}\n${nativeDebug}` : quality;
}

function titleForCandidate(candidate: CompositionCandidate | null, result: CompositionScoreResult): string {
  if (!candidate) return 'NO SUBJECT';
  return result.label === 'TAP SUBJECT' ? candidate.label.toUpperCase() : result.label;
}

function PhotoOnlyCameraPreview({ device, photoOutput }: CameraPreviewProps) {
  return <Camera style={StyleSheet.absoluteFill} device={device} isActive outputs={[photoOutput]} resizeMode="cover" />;
}

function NativeHeuristicCameraPreview({ device, photoOutput }: CameraPreviewProps) {
  const analyzer = getNormaFrameAnalyzer();
  const nativeReadinessFrameOutput = useFrameOutput({
    pixelFormat: 'yuv',
    dropFramesWhileBusy: true,
    onFrame(frame) {
      'worklet';
      try {
        analyzer?.analyze(frame);
      } finally {
        frame.dispose();
      }
    }
  });
  const cameraOutputs = useMemo(() => [photoOutput, nativeReadinessFrameOutput], [nativeReadinessFrameOutput, photoOutput]);

  return <Camera style={StyleSheet.absoluteFill} device={device} isActive outputs={cameraOutputs} resizeMode="cover" />;
}

export function CameraScreen() {
  const device = useCameraDeviceSafe();
  const photoOutput = usePhotoOutput();
  const sharedValues = useCompositionSharedValues();
  const autoCaptureController = useRef(createAutoCaptureController(DEFAULT_AUTO_CAPTURE_CONFIG));
  const compositionLabelRef = useRef('NO SUBJECT');
  const compositionScoreRef = useRef(0);
  const mountedRef = useRef(true);
  const isCapturingRef = useRef(false);
  const wasArmedRef = useRef(false);
  const retainedGuideScoreRef = useRef<{ value: number; expiresAtMs: number } | null>(null);
  const wasNodeLockedRef = useRef(false);
  const lastNodeLockTickAtMsRef = useRef(0);

  const canonId = useCameraUiStore((state) => state.canonId);
  const detectionMode = useCameraUiStore((state) => state.detectionMode);
  const armed = useCameraUiStore((state) => state.armed);
  const lastCaptureAtMs = useCameraUiStore((state) => state.lastCaptureAtMs);
  const debugQualityMode = useCameraUiStore((state) => state.debugQualityMode);
  const debugPanelsHidden = useCameraUiStore((state) => state.debugPanelsHidden);
  const addCapturedPhoto = useCameraUiStore((state) => state.addCapturedPhoto);
  const hydrateFromJournal = useCameraUiStore((state) => state.hydrateFromJournal);
  const capturedPhotos = useCameraUiStore((state) => state.capturedPhotos);
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
    scoreReason: 'No subject candidate. Tap your subject to score it.',
    lineContributionText: null,
    compositionBreakdownLines: null,
    candidateExplanation: 'Native visual-mass analyzer unavailable. Manual fallback active. No recognition is used.'
  });
  const [qualityLine, setQualityLine] = useState('sharpness 80 · exposure 75 (stub) · motion 10 stub');
  const [captureBanner, setCaptureBanner] = useState<CaptureBanner | null>(null);
  const [retainedGuideScore, setRetainedGuideScore] = useState<number | null>(null);
  const [whyOpen, setWhyOpen] = useState(false);
  const [galleryOpen, setGalleryOpen] = useState(false);
  const [reviewPhoto, setReviewPhoto] = useState<CapturedPhoto | null>(null);
  const [captureError, setCaptureError] = useState<string | null>(null);
  const [tapHint, setTapHint] = useState<string | null>(null);
  const [firstRunVisible, setFirstRunVisible] = useState(false);
  const tapHintShownRef = useRef(false);

  const canon = useMemo(() => canonById(canonId), [canonId]);
  const activeGuideKinds = canon.guideKinds;
  const previewGeometry = useMemo<PreviewGeometry>(
    () => ({ width: layout.width, height: layout.height, resizeMode: 'cover' }),
    [layout.height, layout.width]
  );
  const nativeEvidenceMapping = useMemo(
    () => mapNativeEvidenceToPreview(nativeHeuristic.analysis, previewGeometry),
    [nativeHeuristic.analysis, previewGeometry]
  );
  const visualMassDebugOverlay = useMemo(
    () => nativeVisualMassDebugOverlay(nativeHeuristic.analysis, nativeEvidenceMapping),
    [nativeEvidenceMapping, nativeHeuristic.analysis]
  );
  const lineHarmony = useMemo(
    () => (detectionMode === 'native-heuristic' ? scoreLineHarmony(nativeEvidenceMapping.mappedLineSegments, canon) : EMPTY_LINE_HARMONY),
    [canon, detectionMode, nativeEvidenceMapping.mappedLineSegments]
  );
  const debugOverlayVisibility = useMemo(
    () =>
      getDebugOverlayVisibility({
        detectionMode,
        debugQualityMode,
        showPanels: !debugPanelsHidden,
        hasNativeAnalysis: nativeHeuristic.analysis !== null
      }),
    [debugPanelsHidden, debugQualityMode, detectionMode, nativeHeuristic.analysis]
  );

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
      retainedGuideScoreRef.current = null;
      setRetainedGuideScore(null);
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

  // Harmony Journal: hydrate persisted captures once on app start.
  useEffect(() => {
    hydrateFromJournal();
  }, [hydrateFromJournal]);

  useEffect(() => {
    if (!captureBanner) return;
    const timeout = setTimeout(() => setCaptureBanner(null), CAPTURE_TOAST_MS);
    return () => clearTimeout(timeout);
  }, [captureBanner]);

  useEffect(() => {
    if (!captureError) return;
    const timeout = setTimeout(() => setCaptureError(null), CAPTURE_TOAST_MS);
    return () => clearTimeout(timeout);
  }, [captureError]);

  useEffect(() => {
    if (!tapHint) return;
    const timeout = setTimeout(() => setTapHint(null), CAPTURE_TOAST_MS);
    return () => clearTimeout(timeout);
  }, [tapHint]);

  useEffect(() => {
    let cancelled = false;
    import('../journal/firstRunFlag')
      .then((flag) => {
        if (!cancelled && !flag.hasSeenFirstRun()) setFirstRunVisible(true);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  const selectAndApplyCandidate = useCallback(
    (evaluationNowMs: number): AppliedComposition => {
      const selection = selectCompositionCandidate({
        nowMs: evaluationNowMs,
        manualSubject,
        autoMode: detectionMode,
        nativeFrameAnalysis: nativeHeuristic.analysis
      });
      // Scoring formula unchanged, but native candidate input coordinates are
      // corrected from raw-frame space to preview/composition space, so the
      // scored geometry is exactly the drawn geometry (PR4.1 contract).
      const compositionCandidate = selection.candidate ? mapNativeCandidateForOverlay(selection.candidate, nativeEvidenceMapping) : null;
      const compositionLineCandidate = nativeEvidenceMapping.mappedLineCandidate ?? nativeHeuristic.analysis?.lineCandidate ?? null;
      const detectedScore = scoreDetectedComposition(compositionCandidate, activeGuideKinds, selection.explanation, compositionLineCandidate);
      const candidate = detectedScore.candidate;
      const result = detectedScore.composition;

      compositionScoreRef.current = result.score;
      sharedValues.compositionScore.value = withTiming(result.score, { duration: SCORE_EASE_MS });
      compositionLabelRef.current = titleForCandidate(candidate, result);

      const subjectWasVisible = sharedValues.hasSubject.value > 0.5;
      const easeOrSnap = (value: number) => (subjectWasVisible ? withTiming(value, { duration: SUBJECT_EASE_MS }) : value);

      if (!candidate) {
        sharedValues.highlightIntensity.value = withTiming(0, { duration: 120 });

        const visualMassOverlay = nativeVisualMassOverlayCandidate(nativeHeuristic.analysis);
        if (visualMassOverlay) {
          const overlayCenter = nativeEvidenceMapping.mappedVisualMassCenter ?? visualMassOverlay.center;
          const overlayBounds = nativeEvidenceMapping.mappedVisualMassBounds ?? visualMassOverlay.bounds;
          sharedValues.subjectX.value = easeOrSnap(overlayCenter.x);
          sharedValues.subjectY.value = easeOrSnap(overlayCenter.y);
          sharedValues.hasSubject.value = 1;
          sharedValues.candidateBoundsX.value = easeOrSnap(overlayBounds.x);
          sharedValues.candidateBoundsY.value = easeOrSnap(overlayBounds.y);
          sharedValues.candidateBoundsWidth.value = easeOrSnap(overlayBounds.width);
          sharedValues.candidateBoundsHeight.value = easeOrSnap(overlayBounds.height);
          sharedValues.hasCandidateBounds.value = 1;
          return { selection, detectedScore, snapshot: makeCandidateScoreSnapshot(detectedScore), overlaySource: 'native-heuristic' };
        }

        sharedValues.hasSubject.value = 0;
        sharedValues.hasCandidateBounds.value = 0;
        return { selection, detectedScore, snapshot: makeCandidateScoreSnapshot(detectedScore), overlaySource: 'none' };
      }

      sharedValues.subjectX.value = easeOrSnap(candidate.center.x);
      sharedValues.subjectY.value = easeOrSnap(candidate.center.y);
      sharedValues.hasSubject.value = 1;

      if (candidate.bounds) {
        sharedValues.candidateBoundsX.value = easeOrSnap(candidate.bounds.x);
        sharedValues.candidateBoundsY.value = easeOrSnap(candidate.bounds.y);
        sharedValues.candidateBoundsWidth.value = easeOrSnap(candidate.bounds.width);
        sharedValues.candidateBoundsHeight.value = easeOrSnap(candidate.bounds.height);
        sharedValues.hasCandidateBounds.value = 1;
      } else {
        sharedValues.hasCandidateBounds.value = 0;
      }

      sharedValues.highlightIntensity.value = withTiming(result.score >= HIGHLIGHT_SCORE_THRESHOLD ? 1 : 0, { duration: 120 });

      return { selection, detectedScore, snapshot: makeCandidateScoreSnapshot(detectedScore), overlaySource: candidate.source };
    },
    [activeGuideKinds, detectionMode, manualSubject, nativeEvidenceMapping, sharedValues]
  );

  const publishCandidateUi = useCallback(
    (params: {
      selection: CandidateSelectionResult;
      detectedScore: DetectedCompositionScore;
      snapshot: CandidateScoreSnapshot;
      overlaySource: DetectionSource;
      decision: AutoCaptureDecision;
    }) => {
      const candidate = params.detectedScore.candidate;
      const hasCandidate = Boolean(candidate);
      const result = params.detectedScore.composition;
      const nowMsValue = nowMs();

      if (hasCandidate && result.score > 0) {
        retainedGuideScoreRef.current = {
          value: result.score,
          expiresAtMs: nowMsValue + GUIDE_SCORE_RETENTION_MS
        };
      } else if (retainedGuideScoreRef.current && retainedGuideScoreRef.current.expiresAtMs <= nowMsValue) {
        retainedGuideScoreRef.current = null;
      }

      const retainedGuideScoreValue =
        hasCandidate || !retainedGuideScoreRef.current || retainedGuideScoreRef.current.expiresAtMs <= nowMsValue
          ? null
          : retainedGuideScoreRef.current.value;
      setRetainedGuideScore(retainedGuideScoreValue);

      setDisplayModeLabel(params.selection.modeLabel);
      setDisplayTitle(hasCandidate && params.decision.kind === 'candidate' ? 'COMPOSITION READY' : titleForCandidate(candidate, result));
      setDisplayInstruction(instructionForDetectionMode(detectionMode, hasCandidate));
      setDisplayScore(result.score);
      setCandidateSource(candidate?.source ?? params.overlaySource);
      setCandidateBounds(candidate?.bounds);
      setCandidateSnapshot(params.snapshot);
      setAutoStatusLine(
        captureReadinessLine({
          nowMs: nowMsValue,
          armed,
          detectionMode,
          hasCandidate,
          modeLabel: params.selection.modeLabel,
          compositionScore: result.score,
          compositionThreshold: READY_SCORE_THRESHOLD,
          quality: {
            sharpnessScore: sharedValues.sharpnessScore.value,
            exposureScore: sharedValues.exposureScore.value,
            motionScore: sharedValues.motionScore.value,
            sceneChangedScore: sharedValues.sceneChangedScore.value
          },
          sharpnessThreshold: DEFAULT_AUTO_CAPTURE_CONFIG.sharpnessThreshold,
          exposureThreshold: DEFAULT_AUTO_CAPTURE_CONFIG.exposureThreshold,
          candidateConfidence: candidate?.confidence ?? null,
          lineContribution: result.lineContribution,
          decision: params.decision,
          nativeAnalysis: nativeHeuristic.analysis
        })
      );
      setGateReasonLine(buildGateReasonLine(params.decision, hasCandidate));
      setStabilityLine(buildStabilityLine(params.decision));
      setQualityLine(
        buildQualityLine({
          sharpnessScore: sharedValues.sharpnessScore.value,
          exposureScore: sharedValues.exposureScore.value,
          motionScore: sharedValues.motionScore.value,
          nativeQualityIsReal,
          nativeAnalysis: nativeHeuristic.analysis,
          showNativeDebug: debugOverlayVisibility.showNativeDebugText,
          guideScore: hasCandidate ? result.score : null,
          activeGuideKinds,
          lineGuideScore: params.detectedScore.lineGuideScore,
          nativeEvidenceMapping
        })
      );
    },
    [activeGuideKinds, armed, debugOverlayVisibility.showNativeDebugText, detectionMode, nativeEvidenceMapping, nativeHeuristic.analysis, nativeQualityIsReal, sharedValues]
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
      if (!tapHintShownRef.current) {
        tapHintShownRef.current = true;
        setTapHint('SUBJECT MARKED · FOCUS & EXPOSURE UNTOUCHED');
      }
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
      const score = Math.round(compositionScoreRef.current);
      const label = trigger === 'auto' ? 'COMPOSITION READY' : compositionLabelRef.current;

      try {
        let uri: string;

        if (photoOutput && typeof photoOutput.capturePhotoToFile === 'function') {
          const { filePath } = await photoOutput.capturePhotoToFile(
            {},
            {
              onWillBeginCapture: () => {},
              onDidCapturePhoto: () => {}
            }
          );
          uri = uriForFilePath(filePath);
        } else {
          uri = `simulated-capture://${createdAtMs}`;
        }

        addCapturedPhoto({ uri, createdAtMs, label, score, canonId });
        autoCaptureController.current.reset();
        setCaptureBanner({ score, uri, trigger });
        setAutoStatusLine(trigger === 'auto' ? 'ARMED · captured' : 'manual capture complete');
        setGateReasonLine('gate: capture complete');
        setStabilityLine(null);
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown capture error';
        setAutoStatusLine(`capture failed · ${message}`);
        setGateReasonLine('gate: capture failed');
        setCaptureError(`CAPTURE FAILED · ${message}`);
      } finally {
        isCapturingRef.current = false;
        if (mountedRef.current) setIsCapturing(false);
      }
    },
    [addCapturedPhoto, canonId, photoOutput]
  );

  useEffect(() => {
    let lastLabelUpdateAtMs = 0;
    const interval = setInterval(() => {
      const currentNowMs = nowMs();
      const applied = selectAndApplyCandidate(currentNowMs);
      const hasCandidate = applied.selection.candidate !== null;

      const scoredCandidate = applied.detectedScore.candidate;
      const lockTarget = scoredCandidate ? nearestNode(scoredCandidate.center, canon.nodes) : { node: null, distance: Number.POSITIVE_INFINITY };
      const tickDecision = evaluateNodeLockTick({
        wasLocked: wasNodeLockedRef.current,
        score: applied.detectedScore.composition.score,
        readyThreshold: READY_SCORE_THRESHOLD,
        nodeDistance: lockTarget.distance,
        source: scoredCandidate?.source ?? 'none',
        nowMs: currentNowMs,
        lastTickAtMs: lastNodeLockTickAtMsRef.current
      });
      wasNodeLockedRef.current = tickDecision.locked;
      if (tickDecision.tick) {
        lastNodeLockTickAtMsRef.current = currentNowMs;
        tickNodeLock();
        if (lockTarget.node) {
          sharedValues.lockNodeX.value = lockTarget.node.point.x;
          sharedValues.lockNodeY.value = lockTarget.node.point.y;
          sharedValues.lockPulse.value = 0;
          sharedValues.lockPulse.value = withTiming(1, { duration: LOCK_PULSE_MS });
        }
      }

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
  }, [armed, canon, capturePhoto, lastCaptureAtMs, publishCandidateUi, selectAndApplyCandidate, sharedValues]);

  if (!device) {
    return (
      <View style={styles.centered}>
        <Text style={styles.centeredText}>No back camera found.</Text>
      </View>
    );
  }

  return (
    <View style={styles.root} onLayout={handleLayout}>
      {detectionMode === 'native-heuristic' ? (
        <NativeHeuristicCameraPreview device={device} photoOutput={photoOutput} />
      ) : (
        <PhotoOnlyCameraPreview device={device} photoOutput={photoOutput} />
      )}
      <Pressable accessibilityRole="button" accessibilityLabel="Camera preview, tap to mark manual subject center" onPress={handlePreviewPress} style={StyleSheet.absoluteFill}>
        <CompositionOverlay
          width={layout.width}
          height={layout.height}
          canon={canon}
          sharedValues={sharedValues}
          candidateSource={candidateSource}
          candidateBounds={candidateBounds}
          lineCandidate={nativeHeuristic.analysis?.lineCandidate}
          mappedLineCandidate={nativeEvidenceMapping.mappedLineCandidate}
          lineSegments={nativeEvidenceMapping.mappedLineSegments}
          showLineSignal={debugOverlayVisibility.showLineSignal}
          showLineSegmentSpike={debugOverlayVisibility.showLineSegmentSpike}
          visualMassDebug={visualMassDebugOverlay?.mapped ?? null}
          showVisualMassDebug={debugOverlayVisibility.showVisualMassDebug}
          lineHarmonyMatches={lineHarmony.matches}
          showLineHarmony={detectionMode === 'native-heuristic' && debugQualityMode === 'normal'}
        />
      </Pressable>
      <StatusStrip
        canon={canon}
        title={displayTitle}
        score={candidateSnapshot.hasCandidate ? displayScore : retainedGuideScore}
        instruction={statusInstructionFor(displayModeLabel, displayInstruction)}
        armedLine={armed ? autoStatusLine : null}
        captureToast={captureBanner ? `CAPTURED · ${captureBanner.score}` : (captureError ?? tapHint)}
        lineHarmony={detectionMode === 'native-heuristic' ? lineHarmony : null}
        onWhyPress={() => setWhyOpen(true)}
      />
      {debugPanelsHidden ? null : (
        <ScoreBadge
          modeLabel={displayModeLabel}
          title={displayTitle}
          instruction={displayInstruction}
          score={displayScore}
          retainedGuideScore={retainedGuideScore}
          statusLine={autoStatusLine}
          gateReasonLine={gateReasonLine}
          stabilityLine={stabilityLine}
          qualityLine={qualityLine}
          snapshot={candidateSnapshot}
          captureBanner={captureBanner}
          debugQualityMode={debugQualityMode}
        />
      )}
      <CameraControls
        onManualCapture={() => void capturePhoto('manual')}
        onOpenGallery={() => setGalleryOpen(true)}
        isCapturing={isCapturing}
        readyThreshold={READY_SCORE_THRESHOLD}
        score={sharedValues.compositionScore}
      />
      <WhySheet
        visible={whyOpen}
        onClose={() => setWhyOpen(false)}
        canon={canon}
        snapshot={candidateSnapshot}
        score={candidateSnapshot.hasCandidate ? displayScore : retainedGuideScore}
        lineHarmony={detectionMode === 'native-heuristic' ? lineHarmony : null}
      />
      <GallerySheet
        visible={galleryOpen}
        photos={capturedPhotos}
        onSelect={(photo) => setReviewPhoto(photo)}
        onClose={() => setGalleryOpen(false)}
      />
      <ReviewScreen photo={reviewPhoto} onClose={() => setReviewPhoto(null)} />
      <FirstRunCoach
        visible={firstRunVisible}
        onDone={() => {
          setFirstRunVisible(false);
          void import('../journal/firstRunFlag')
            .then((flag) => flag.markFirstRunSeen())
            .catch(() => {});
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#000000' },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#000000', padding: 24 },
  centeredText: { color: '#ffffff', fontSize: 16, fontWeight: '700', textAlign: 'center' }
});
