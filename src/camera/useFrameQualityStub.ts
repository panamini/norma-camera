import { useEffect, useMemo } from 'react';
import { useSharedValue, type SharedValue } from 'react-native-reanimated';
import type { FrameQuality } from '../autocapture/types';
import type { DebugQualityMode } from '../state/cameraUiStore';

export type FrameQualitySharedValues = {
  sharpnessScore: SharedValue<number>;
  exposureScore: SharedValue<number>;
  motionScore: SharedValue<number>;
  sceneChangedScore: SharedValue<number>;
};

export function getFrameQualityStubValues(mode: DebugQualityMode): FrameQuality {
  switch (mode) {
    case 'normal':
      return {
        sharpnessScore: 80,
        exposureScore: 75,
        motionScore: 10,
        sceneChangedScore: 100
      };
    case 'blurry':
      return {
        sharpnessScore: 25,
        exposureScore: 75,
        motionScore: 10,
        sceneChangedScore: 100
      };
    case 'badExposure':
      return {
        sharpnessScore: 80,
        exposureScore: 25,
        motionScore: 10,
        sceneChangedScore: 100
      };
    case 'motion':
      return {
        sharpnessScore: 80,
        exposureScore: 75,
        motionScore: 80,
        sceneChangedScore: 100
      };
  }
}

export function useFrameQualityStub(mode: DebugQualityMode): FrameQualitySharedValues {
  const sharpnessScore = useSharedValue(80);
  const exposureScore = useSharedValue(75);
  const motionScore = useSharedValue(10);
  const sceneChangedScore = useSharedValue(100);

  useEffect(() => {
    const next = getFrameQualityStubValues(mode);
    sharpnessScore.value = next.sharpnessScore;
    exposureScore.value = next.exposureScore;
    motionScore.value = next.motionScore;
    sceneChangedScore.value = next.sceneChangedScore;
  }, [exposureScore, mode, motionScore, sceneChangedScore, sharpnessScore]);

  return useMemo(
    () => ({
      sharpnessScore,
      exposureScore,
      motionScore,
      sceneChangedScore
    }),
    [exposureScore, motionScore, sceneChangedScore, sharpnessScore]
  );
}
