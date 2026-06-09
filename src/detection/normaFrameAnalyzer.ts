import { Platform } from 'react-native';
import { NitroModules, type HybridObject } from 'react-native-nitro-modules';

export interface NormaFrameAnalyzer extends HybridObject<{ android: 'c++' }> {
  analyze(frame: unknown): boolean;
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
