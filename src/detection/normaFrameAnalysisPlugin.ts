import { NitroModules, type HybridObject } from 'react-native-nitro-modules';
import type { Frame } from 'react-native-vision-camera';
import type { NativeFrameAnalysisModule, NativeFrameAnalysisResult } from './nativeHeuristicTypes';

export type NormaFrameAnalysisPlugin = HybridObject<{ android: 'kotlin' }> &
  NativeFrameAnalysisModule & {
    analyze(frame: Frame): void;
    reset?: () => void;
  };

let cachedPlugin: NormaFrameAnalysisPlugin | null | undefined;

export function getNormaFrameAnalysisPlugin(): NormaFrameAnalysisPlugin | null {
  if (cachedPlugin !== undefined) return cachedPlugin;

  try {
    cachedPlugin = NitroModules.createHybridObject<NormaFrameAnalysisPlugin>('NormaFrameAnalysis');
  } catch {
    cachedPlugin = null;
  }

  return cachedPlugin;
}

export function tryAnalyzeFrameWithNormaPlugin(plugin: NormaFrameAnalysisPlugin | null, frame: Frame): void {
  'worklet';
  try {
    plugin?.analyze(frame);
  } catch {
    // Keep frame-output mode fail-closed. JS polling will continue to report fallback/unavailable.
  }
}

export async function getLatestNormaFrameAnalysis(plugin: NativeFrameAnalysisModule | null): Promise<NativeFrameAnalysisResult | null> {
  const latest = plugin?.getLatestAnalysis?.();
  return latest ? await latest : null;
}
