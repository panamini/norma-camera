import { useEffect, useMemo, useRef, useState } from 'react';
import { NativeModules, Platform } from 'react-native';
import { normalizeNativeAnalysisFreshness } from './nativeHeuristicDebug';
import type { NativeFrameAnalysisModule, NativeFrameAnalysisResult } from './nativeHeuristicTypes';
import { hasRenderableHorizontalLine, retainRecentHorizontalLine } from './nativeLineDiagnosticRetention';
import { getNormaFrameAnalysisPlugin } from './normaFrameAnalysisPlugin';

const POLL_INTERVAL_MS = 250;

export type NativeHeuristicHookState = {
  analysis: NativeFrameAnalysisResult | null;
  available: boolean;
  status: NativeFrameAnalysisResult['status'];
  explanation: string;
};

type NativeModulesWithFrameAnalysis = typeof NativeModules & {
  NormaFrameAnalysis?: NativeFrameAnalysisModule;
};

function getFrameAnalysisModule(): NativeFrameAnalysisModule | null {
  if (Platform.OS !== 'android') return null;
  const modules = NativeModules as NativeModulesWithFrameAnalysis;
  return modules.NormaFrameAnalysis ?? getNormaFrameAnalysisPlugin();
}

function unavailableState(): NativeHeuristicHookState {
  return {
    analysis: null,
    available: false,
    status: 'unavailable',
    explanation: 'Native visual-mass analyzer unavailable. No Android frame-analysis plugin is wired yet.'
  };
}

export function useNativeHeuristicCandidate(enabled: boolean): NativeHeuristicHookState {
  const module = useMemo(getFrameAnalysisModule, []);
  const lastAnalysisWithLineRef = useRef<NativeFrameAnalysisResult | null>(null);
  const [state, setState] = useState<NativeHeuristicHookState>(() => unavailableState());

  useEffect(() => {
    if (!enabled) {
      lastAnalysisWithLineRef.current = null;
      setState(unavailableState());
      return;
    }

    if (!module || typeof module.getLatestAnalysis !== 'function') {
      lastAnalysisWithLineRef.current = null;
      setState(unavailableState());
      return;
    }

    const frameAnalysisModule = module;
    let cancelled = false;

    async function pollLatestAnalysis() {
      try {
        const rawLatest = normalizeNativeAnalysisFreshness((await frameAnalysisModule.getLatestAnalysis?.()) ?? null);
        if (cancelled) return;

        if (!rawLatest) {
          lastAnalysisWithLineRef.current = null;
          setState(unavailableState());
          return;
        }

        const latest = retainRecentHorizontalLine(rawLatest, lastAnalysisWithLineRef.current);
        if (hasRenderableHorizontalLine(rawLatest)) {
          lastAnalysisWithLineRef.current = rawLatest;
        } else if (rawLatest.analysisSource !== 'live-frame') {
          lastAnalysisWithLineRef.current = null;
        }

        setState({
          analysis: latest,
          available: latest.status !== 'unavailable' && latest.status !== 'error',
          status: latest.status,
          explanation: latest.explanation
        });
      } catch (error) {
        if (cancelled) return;
        lastAnalysisWithLineRef.current = null;
        const message = error instanceof Error ? error.message : 'Unknown native visual-mass analysis error';
        setState({
          analysis: {
            status: 'error',
            createdAtMs: Date.now(),
            subject: null,
            lineCandidate: null,
            exposure: null,
            sharpness: null,
            explanation: message
          },
          available: false,
          status: 'error',
          explanation: message
        });
      }
    }

    void pollLatestAnalysis();
    const interval = setInterval(() => void pollLatestAnalysis(), POLL_INTERVAL_MS);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [enabled, module]);

  return state;
}
