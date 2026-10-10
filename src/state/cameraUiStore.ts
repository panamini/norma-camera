import { create } from 'zustand';
import { DEFAULT_CANON_ID } from '../composition/canons';
import type { CanonId } from '../composition/types';
import type { DetectionMode } from '../detection/types';

export type DebugQualityMode = 'normal' | 'blurry' | 'badExposure' | 'motion';

export type CapturedPhoto = {
  uri: string;
  createdAtMs: number;
  label: string;
  score: number;
  canonId: CanonId;
};

type CameraUiState = {
  canonId: CanonId;
  detectionMode: DetectionMode;
  armed: boolean;
  lastCaptureAtMs: number | null;
  capturedPhotos: CapturedPhoto[];
  debugQualityMode: DebugQualityMode;
  debugPanelsHidden: boolean;
  setCanonId: (canonId: CanonId) => void;
  setDetectionMode: (detectionMode: DetectionMode) => void;
  setArmed: (armed: boolean) => void;
  toggleArmed: () => void;
  addCapturedPhoto: (photo: CapturedPhoto) => void;
  setDebugQualityMode: (mode: DebugQualityMode) => void;
  toggleDebugPanelsHidden: () => void;
};

export const useCameraUiStore = create<CameraUiState>((set) => ({
  canonId: DEFAULT_CANON_ID,
  detectionMode: 'native-heuristic',
  armed: false,
  lastCaptureAtMs: null,
  capturedPhotos: [],
  debugQualityMode: 'normal',
  debugPanelsHidden: true,
  setCanonId: (canonId) => set({ canonId }),
  setDetectionMode: (detectionMode) => set({ detectionMode }),
  setArmed: (armed) => set({ armed }),
  toggleArmed: () => set((state) => ({ armed: !state.armed })),
  addCapturedPhoto: (photo) =>
    set((state) => ({
      capturedPhotos: [photo, ...state.capturedPhotos],
      lastCaptureAtMs: photo.createdAtMs
    })),
  setDebugQualityMode: (debugQualityMode) => set({ debugQualityMode }),
  toggleDebugPanelsHidden: () => set((state) => ({ debugPanelsHidden: !state.debugPanelsHidden }))
}));
