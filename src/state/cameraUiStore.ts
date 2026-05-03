import { create } from 'zustand';
import type { OverlayMode } from '../composition/types';
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
  detectionMode: DetectionMode;
  armed: boolean;
  lastCaptureAtMs: number | null;
  capturedPhotos: CapturedPhoto[];
  debugQualityMode: DebugQualityMode;
  setOverlayMode: (overlayMode: OverlayMode) => void;
  setDetectionMode: (detectionMode: DetectionMode) => void;
  setArmed: (armed: boolean) => void;
  toggleArmed: () => void;
  addCapturedPhoto: (photo: CapturedPhoto) => void;
  setDebugQualityMode: (mode: DebugQualityMode) => void;
};

export const useCameraUiStore = create<CameraUiState>((set) => ({
  overlayMode: 'thirds',
  detectionMode: 'auto-placeholder',
  armed: false,
  lastCaptureAtMs: null,
  capturedPhotos: [],
  debugQualityMode: 'normal',
  setOverlayMode: (overlayMode) => set({ overlayMode }),
  setDetectionMode: (detectionMode) => set({ detectionMode }),
  setArmed: (armed) => set({ armed }),
  toggleArmed: () => set((state) => ({ armed: !state.armed })),
  addCapturedPhoto: (photo) =>
    set((state) => ({
      capturedPhotos: [photo, ...state.capturedPhotos],
      lastCaptureAtMs: photo.createdAtMs
    })),
  setDebugQualityMode: (debugQualityMode) => set({ debugQualityMode })
}));
