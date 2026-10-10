import { create } from 'zustand';
import { DEFAULT_CANON_ID } from '../composition/canons';
import type { CanonId, OverlayMode } from '../composition/types';
import type { DetectionMode } from '../detection/types';

export type DebugQualityMode = 'normal' | 'blurry' | 'badExposure' | 'motion';

export type CapturedPhoto = {
  uri: string;
  createdAtMs: number;
  label: string;
  score: number;
};

type CameraUiState = {
  overlayMode: OverlayMode;
  canonId: CanonId;
  detectionMode: DetectionMode;
  armed: boolean;
  lastCaptureAtMs: number | null;
  capturedPhotos: CapturedPhoto[];
  debugQualityMode: DebugQualityMode;
  debugPanelsHidden: boolean;
  setOverlayMode: (overlayMode: OverlayMode) => void;
  setCanonId: (canonId: CanonId) => void;
  setDetectionMode: (detectionMode: DetectionMode) => void;
  setArmed: (armed: boolean) => void;
  toggleArmed: () => void;
  addCapturedPhoto: (photo: CapturedPhoto) => void;
  setDebugQualityMode: (mode: DebugQualityMode) => void;
  toggleDebugPanelsHidden: () => void;
};

export const useCameraUiStore = create<CameraUiState>((set) => ({
  overlayMode: 'thirds',
  canonId: DEFAULT_CANON_ID,
  detectionMode: 'auto-placeholder',
  armed: false,
  lastCaptureAtMs: null,
  capturedPhotos: [],
  debugQualityMode: 'normal',
  debugPanelsHidden: false,
  setOverlayMode: (overlayMode) => set({ overlayMode }),
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
