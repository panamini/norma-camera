import { requireNativeModule } from 'expo-modules-core';
import { Platform } from 'react-native';
import type { NativeFrameAnalysisModule } from './nativeHeuristicTypes';

let cachedModule: NativeFrameAnalysisModule | null | undefined;

export function getNormaFrameAnalysisPlugin(): NativeFrameAnalysisModule | null {
  if (cachedModule !== undefined) return cachedModule;
  if (Platform.OS !== 'android') {
    cachedModule = null;
    return cachedModule;
  }

  try {
    cachedModule = requireNativeModule<NativeFrameAnalysisModule>('NormaFrameAnalysis');
  } catch {
    cachedModule = null;
  }

  return cachedModule;
}
