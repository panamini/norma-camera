import { describe, expect, it } from 'vitest';
import { DEBUG_OVERLAY_PRESET_OPTIONS, debugOverlayPresetLabel, getDebugOverlayVisibility } from '../debugOverlayVisibility';

describe('debug overlay visibility policy', () => {
  it('keeps normal mode clean even when native analysis is available', () => {
    expect(
      getDebugOverlayVisibility({
        detectionMode: 'native-heuristic',
        debugQualityMode: 'normal',
        showPanels: true,
        hasNativeAnalysis: true
      })
    ).toEqual({
      showVisualMassDebug: false,
      showLineSignal: false,
      showLineSegmentSpike: false,
      showNativeDebugText: false
    });
  });

  it('shows visual mass without the line segment spike in the visual-mass preset', () => {
    expect(
      getDebugOverlayVisibility({
        detectionMode: 'native-heuristic',
        debugQualityMode: 'blurry',
        showPanels: true,
        hasNativeAnalysis: true
      })
    ).toEqual({
      showVisualMassDebug: true,
      showLineSignal: false,
      showLineSegmentSpike: false,
      showNativeDebugText: true
    });
  });

  it('shows line signal and line segment spike without the visual mass heatmap in the line-segment preset', () => {
    expect(
      getDebugOverlayVisibility({
        detectionMode: 'native-heuristic',
        debugQualityMode: 'badExposure',
        showPanels: true,
        hasNativeAnalysis: true
      })
    ).toEqual({
      showVisualMassDebug: false,
      showLineSignal: true,
      showLineSegmentSpike: true,
      showNativeDebugText: true
    });
  });

  it('keeps overlay visibility stable when panels are hidden', () => {
    expect(
      getDebugOverlayVisibility({
        detectionMode: 'native-heuristic',
        debugQualityMode: 'badExposure',
        showPanels: false,
        hasNativeAnalysis: true
      })
    ).toEqual({
      showVisualMassDebug: false,
      showLineSignal: true,
      showLineSegmentSpike: true,
      showNativeDebugText: false
    });
  });

  it('hides native overlays outside native heuristic mode', () => {
    expect(
      getDebugOverlayVisibility({
        detectionMode: 'simulated-detector',
        debugQualityMode: 'motion',
        showPanels: true,
        hasNativeAnalysis: true
      })
    ).toEqual({
      showVisualMassDebug: false,
      showLineSignal: false,
      showLineSegmentSpike: false,
      showNativeDebugText: false
    });
  });

  it('uses short field-facing preset labels for the existing debug mode values', () => {
    expect(DEBUG_OVERLAY_PRESET_OPTIONS.map((option) => option.label)).toEqual(['normal', 'mass', 'lines', 'mixed']);
    expect(debugOverlayPresetLabel('badExposure')).toBe('line segments');
  });
});
