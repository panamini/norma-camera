# modules/frame-analysis

Status: **local Android-only Expo module for live luminance frame analysis**.

This module is present in the source tree and is intended to be included by Expo autolinking when the Android dev-client is rebuilt.

## Runtime entry points

```ts
requireNativeModule('NormaFrameAnalysis').getLatestAnalysis()
requireNativeModule('NormaFrameAnalysis').analyzeDownsampledLumaGrid(...)
requireNativeModule('NormaFrameAnalysis').reset()
NitroModules.createHybridObject('NormaFrameAnalyzer').analyze(frame)
```

When the runtime is not Android, or when the installed dev-client does not contain this module, JS must keep Native mode honest:

```txt
NATIVE VISUAL MASS · unavailable
Manual fallback active.
No recognition is used.
```

## Live pipeline

```txt
VisionCamera frame
  -> worklet-safe Nitro analyzer
  -> Android Y plane / luminance only
  -> downsample to 32x24
  -> exposure stats
  -> sharpness / edge energy
  -> contrast visual-mass candidate
  -> horizontal-line signal
  -> compact normalized result to JS
```

No raw pixels or luminance grids should cross the JS bridge during live analysis.

## Output contract

```ts
type NativeFrameAnalysisResult = {
  status: 'unavailable' | 'ready' | 'low-confidence' | 'error';
  createdAtMs: number;
  subject: NativeSubjectCandidate | null;
  lineCandidate?: NativeLineCandidate | null;
  exposure: NativeExposureMetrics | null;
  sharpness: NativeSharpnessMetrics | null;
  explanation: string;
  analysisSource?: 'live-frame' | 'debug-grid' | string;
  updateCount?: number;
  analysisFps?: number;
};

type NativeSubjectCandidate = {
  center: NormalizedPoint;
  bounds: NormalizedRect;
  confidence: number;
  source: 'native-heuristic';
};

type NativeLineCandidate = {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  angleDeg: number;
  confidence: number;
  kind: 'horizontal-line' | 'unknown-line';
};
```

The subject candidate is a native visual-mass contrast candidate. The line candidate is a secondary horizontal-line signal. Neither is semantic recognition.

## Safety constraints

- Android only.
- Latest-frame-only.
- Throttle live analysis to about 4 fps.
- Drop/return latest result if the analyzer is busy.
- Never queue frames.
- No full-frame copy into JS.
- No JS pixel loops.
- No backend.
- No cloud AI.
- No ML Kit.
- No Google Play Services dependency.

## Local Android validation notes

The source module can exist while the running app still reports unavailable if the installed dev-client was built before the module was added. Rebuild with:

```bash
npm run android
```

If that blocks locally, capture the exact blocker:

- `ANDROID_HOME` missing
- `android/local.properties` missing
- no emulator/device available
- device unauthorized/offline
- ADB daemon/socket failure
- Gradle/native C++ build failure

Passing JS tests and Expo introspection are necessary but do not prove the native analyzer is present in the installed Android runtime.
