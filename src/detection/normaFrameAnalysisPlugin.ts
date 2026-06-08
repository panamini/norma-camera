import { Platform } from 'react-native';
import * as NitroModuleNamespace from 'react-native-nitro-modules';
import type { Frame } from 'react-native-vision-camera';
import type { NativeFrameAnalysisModule } from './nativeHeuristicTypes';

type MaybeNitroModulesApi = {
  NitroModules?: {
    createHybridObject?: <T>(name: string) => T;
  };
};

export type NormaFrameAnalysisPlugin = NativeFrameAnalysisModule & {
  analyze(frame: Frame): void;
  reset?: () => void;
};

let cachedPlugin: NormaFrameAnalysisPlugin | null | undefined;

export function getNormaFrameAnalysisPlugin(): NormaFrameAnalysisPlugin | null {
  if (cachedPlugin !== undefined) return cachedPlugin;
  if (Platform.OS !== 'android') {
    cachedPlugin = null;
    return cachedPlugin;
  }

  try {
    const maybeNitroModules = NitroModuleNamespace as unknown as MaybeNitroModulesApi;
    cachedPlugin = maybeNitroModules.NitroModules?.createHybridObject?.<NormaFrameAnalysisPlugin>('NormaFrameAnalysisPlugin') ?? null;
  } catch {
    cachedPlugin = null;
  }

  return cachedPlugin;
}
