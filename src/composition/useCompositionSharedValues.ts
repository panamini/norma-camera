import { useMemo } from 'react';
import { useSharedValue, type SharedValue } from 'react-native-reanimated';

export type CompositionSharedValues = {
  subjectX: SharedValue<number>;
  subjectY: SharedValue<number>;
  hasSubject: SharedValue<number>;
  compositionScore: SharedValue<number>;
  bestGuideX: SharedValue<number>;
  bestGuideY: SharedValue<number>;
  highlightIntensity: SharedValue<number>;
  sharpnessScore: SharedValue<number>;
  exposureScore: SharedValue<number>;
  motionScore: SharedValue<number>;
  sceneChangedScore: SharedValue<number>;
};

export function useCompositionSharedValues(): CompositionSharedValues {
  const subjectX = useSharedValue(0.5);
  const subjectY = useSharedValue(0.5);
  const hasSubject = useSharedValue(0);
  const compositionScore = useSharedValue(0);
  const bestGuideX = useSharedValue(-1);
  const bestGuideY = useSharedValue(-1);
  const highlightIntensity = useSharedValue(0);
  const sharpnessScore = useSharedValue(80);
  const exposureScore = useSharedValue(75);
  const motionScore = useSharedValue(10);
  const sceneChangedScore = useSharedValue(100);

  return useMemo(
    () => ({
      subjectX,
      subjectY,
      hasSubject,
      compositionScore,
      bestGuideX,
      bestGuideY,
      highlightIntensity,
      sharpnessScore,
      exposureScore,
      motionScore,
      sceneChangedScore
    }),
    [
      bestGuideX,
      bestGuideY,
      compositionScore,
      exposureScore,
      hasSubject,
      highlightIntensity,
      motionScore,
      sceneChangedScore,
      sharpnessScore,
      subjectX,
      subjectY
    ]
  );
}
