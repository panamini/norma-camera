import { useMemo } from 'react';
import { useSharedValue, type SharedValue } from 'react-native-reanimated';

export type CompositionSharedValues = {
  subjectX: SharedValue<number>;
  subjectY: SharedValue<number>;
  hasSubject: SharedValue<number>;
  candidateBoundsX: SharedValue<number>;
  candidateBoundsY: SharedValue<number>;
  candidateBoundsWidth: SharedValue<number>;
  candidateBoundsHeight: SharedValue<number>;
  hasCandidateBounds: SharedValue<number>;
  compositionScore: SharedValue<number>;
  highlightIntensity: SharedValue<number>;
  lockPulse: SharedValue<number>;
  lockNodeX: SharedValue<number>;
  lockNodeY: SharedValue<number>;
  sharpnessScore: SharedValue<number>;
  exposureScore: SharedValue<number>;
  motionScore: SharedValue<number>;
  sceneChangedScore: SharedValue<number>;
};

export function useCompositionSharedValues(): CompositionSharedValues {
  const subjectX = useSharedValue(0.5);
  const subjectY = useSharedValue(0.5);
  const hasSubject = useSharedValue(0);
  const candidateBoundsX = useSharedValue(0);
  const candidateBoundsY = useSharedValue(0);
  const candidateBoundsWidth = useSharedValue(0);
  const candidateBoundsHeight = useSharedValue(0);
  const hasCandidateBounds = useSharedValue(0);
  const compositionScore = useSharedValue(0);
  const highlightIntensity = useSharedValue(0);
  // lockPulse rests at 1 (fully faded); a node lock resets it to 0 and eases
  // back to 1, which drives the expanding ring at (lockNodeX, lockNodeY).
  const lockPulse = useSharedValue(1);
  const lockNodeX = useSharedValue(-1);
  const lockNodeY = useSharedValue(-1);
  const sharpnessScore = useSharedValue(80);
  const exposureScore = useSharedValue(75);
  const motionScore = useSharedValue(10);
  const sceneChangedScore = useSharedValue(100);

  return useMemo(
    () => ({
      subjectX,
      subjectY,
      hasSubject,
      candidateBoundsX,
      candidateBoundsY,
      candidateBoundsWidth,
      candidateBoundsHeight,
      hasCandidateBounds,
      compositionScore,
      highlightIntensity,
      lockPulse,
      lockNodeX,
      lockNodeY,
      sharpnessScore,
      exposureScore,
      motionScore,
      sceneChangedScore
    }),
    [
      candidateBoundsHeight,
      candidateBoundsWidth,
      candidateBoundsX,
      candidateBoundsY,
      compositionScore,
      exposureScore,
      hasCandidateBounds,
      hasSubject,
      highlightIntensity,
      lockNodeX,
      lockNodeY,
      lockPulse,
      motionScore,
      sceneChangedScore,
      sharpnessScore,
      subjectX,
      subjectY
    ]
  );
}
