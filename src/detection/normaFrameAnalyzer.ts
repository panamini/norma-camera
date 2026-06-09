import { Platform } from 'react-native';
import { NitroModules, type HybridObject } from 'react-native-nitro-modules';
import { getNormaFrameAnalysisPlugin } from './normaFrameAnalysisPlugin';

export interface NormaFrameAnalyzer extends HybridObject<{ android: 'c++' }> {
  analyze(frame: unknown): boolean;
}

let cachedAnalyzer: NormaFrameAnalyzer | undefined;

export function getNormaFrameAnalyzer(): NormaFrameAnalyzer | null {
  if (cachedAnalyzer) return cachedAnalyzer;
  if (Platform.OS !== 'android') return null;

  try {
    // Force the local frame-analysis module to initialize and load its native
    // registry library before asking Nitro for the worklet-safe hybrid object.
    getNormaFrameAnalysisPlugin();
    cachedAnalyzer = NitroModules.createHybridObject<NormaFrameAnalyzer>('NormaFrameAnalyzer');
    return cachedAnalyzer;
  } catch {
    // Do not cache a miss. The native module/registry can become available
    // after the first render, especially during dev-client startup.
    return null;
  }
}
