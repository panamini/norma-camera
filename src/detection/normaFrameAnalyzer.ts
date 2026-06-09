import { Platform } from 'react-native';
import { NitroModules, type HybridObject } from 'react-native-nitro-modules';
import type { Frame } from 'react-native-vision-camera';

export interface NormaFrameAnalyzer extends HybridObject<{ android: 'kotlin' }> {
  analyze(frame: Frame): boolean;
}

let cachedAnalyzer: NormaFrameAnalyzer | null | undefined;

export function getNormaFrameAnalyzer(): NormaFrameAnalyzer | null {
  if (cachedAnalyzer !== undefined) return cachedAnalyzer;
  if (Platform.OS !== 'android') {
    cachedAnalyzer = null;
    return cachedAnalyzer;
  }

  try {
    cachedAnalyzer = NitroModules.createHybridObject<NormaFrameAnalyzer>('NormaFrameAnalyzer');
  } catch {
    cachedAnalyzer = null;
  }

  return cachedAnalyzer;
}
