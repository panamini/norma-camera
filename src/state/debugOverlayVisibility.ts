import type { DetectionMode } from '../detection/types';
import type { DebugQualityMode } from './cameraUiStore';

export type DebugOverlayVisibility = {
  showVisualMassDebug: boolean;
  showLineSignal: boolean;
  showLineSegmentSpike: boolean;
  showNativeDebugText: boolean;
};

export type DebugOverlayVisibilityInput = {
  detectionMode: DetectionMode;
  debugQualityMode: DebugQualityMode;
  showPanels: boolean;
  hasNativeAnalysis: boolean;
};

export type DebugOverlayPresetOption = {
  value: DebugQualityMode;
  label: string;
  accessibilityLabel: string;
};

export const DEBUG_OVERLAY_PRESET_OPTIONS: DebugOverlayPresetOption[] = [
  { value: 'normal', label: 'normal', accessibilityLabel: 'Use clean normal camera overlay' },
  { value: 'blurry', label: 'mass', accessibilityLabel: 'Show visual mass debug overlay' },
  { value: 'badExposure', label: 'lines', accessibilityLabel: 'Show line signal and line segment debug overlay' },
  { value: 'motion', label: 'mixed', accessibilityLabel: 'Show mixed native debug overlays' }
];

const DEBUG_OVERLAY_PRESET_LABELS: Record<DebugQualityMode, string> = {
  normal: 'normal',
  blurry: 'visual mass',
  badExposure: 'line segments',
  motion: 'mixed native overlays'
};

const HIDDEN_VISIBILITY: DebugOverlayVisibility = {
  showVisualMassDebug: false,
  showLineSignal: false,
  showLineSegmentSpike: false,
  showNativeDebugText: false
};

export function debugOverlayPresetLabel(mode: DebugQualityMode): string {
  return DEBUG_OVERLAY_PRESET_LABELS[mode];
}

export function getDebugOverlayVisibility(input: DebugOverlayVisibilityInput): DebugOverlayVisibility {
  if (input.detectionMode !== 'native-heuristic' || input.debugQualityMode === 'normal') {
    return HIDDEN_VISIBILITY;
  }

  const showNativeDebugText = input.showPanels;

  switch (input.debugQualityMode) {
    case 'blurry':
      return {
        showVisualMassDebug: input.hasNativeAnalysis,
        showLineSignal: false,
        showLineSegmentSpike: false,
        showNativeDebugText
      };
    case 'badExposure':
      return {
        showVisualMassDebug: false,
        showLineSignal: input.hasNativeAnalysis,
        showLineSegmentSpike: input.hasNativeAnalysis,
        showNativeDebugText
      };
    case 'motion':
      return {
        showVisualMassDebug: input.hasNativeAnalysis,
        showLineSignal: input.hasNativeAnalysis,
        showLineSegmentSpike: input.hasNativeAnalysis,
        showNativeDebugText
      };
  }
}
