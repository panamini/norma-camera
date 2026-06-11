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
  frameWidth?: number;
  frameHeight?: number;
  gridWidth?: number;
  gridHeight?: number;
  frameOrientation?: 'up' | 'right' | 'down' | 'left';
  isMirrored?: boolean;
  subject: NativeSubjectCandidate | null;
  lineCandidate?: NativeLineCandidate | null;
  exposure: NativeExposureMetrics | null;
  sharpness: NativeSharpnessMetrics | null;
  visualMassDebug?: NativeVisualMassDebug | null;
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

type NativeVisualMassDebug = {
  gridWidth: number;
  gridHeight: number;
  heatmapWidth: number;
  heatmapHeight: number;
  cells: NativeVisualMassDebugCell[];
  topCandidates: NativeVisualMassDebugCandidate[];
  selectedCandidate: NativeVisualMassDebugCandidate | null;
  stabilizedCandidate: NativeVisualMassDebugCandidate | null;
  explanation: string;
};
```

The subject candidate is a native visual-mass contrast candidate. The line candidate is a secondary horizontal-line signal. Neither is semantic recognition.
The visual-mass debug payload is compact contrast/luminance evidence only: coarse heat cells, top coarse candidate summaries, raw selected candidate, and stabilized candidate. It does not expose raw pixels, a full luminance grid, semantic labels, or object identity.

## Coordinate calibration

Live Android results include native frame dimensions, downsampled grid dimensions, VisionCamera frame orientation, and mirroring when the installed VisionCamera frame exposes them through `HybridFrameSpec`.

JS keeps raw and mapped evidence side by side:

```txt
rawLineCandidate
mappedLineCandidate
rawVisualMassBounds
mappedVisualMassBounds
rawVisualMassCenter
mappedVisualMassCenter
```

The mapping layer is:

```txt
native frame normalized coordinates
  -> orientation / mirror correction
  -> presented frame coordinates
  -> preview layout coordinates using VisionCamera resizeMode cover
```

VisionCamera `PreviewView` documents `resizeMode: 'cover' | 'contain'` and defaults to `cover`; the app sets `cover` explicitly. Device validation still needs to verify that the native preview transform and overlay transform match on the target Android device.

PR4.1 uses mapped evidence for overlay/debug. Composition scoring and auto-capture behavior remain on the existing raw candidate inputs; the scoring formula is unchanged.

## Camera evidence model

PR4.3 adds a TypeScript camera evidence model on the JS side. It adapts the existing native output into explicit raw-frame and preview-mapped evidence for manual points, native visual mass, native line signals, and visual-mass heatmap summaries.

PR4.4 keeps the native analyzer unchanged and generalizes line evidence as endpoint-based `CameraLineSegmentEvidence`. The evidence layer derives `angleDeg`, `lengthEuclidean`, and visual `orientationKind` from `x1/y1/x2/y2` in whichever coordinate space the evidence occupies, so a raw horizontal signal can become vertical or diagonal after preview mapping.

This model is a contract layer only. It does not add OpenCV, Hough lines, a new native detector, coordinate mapping math changes, composition scoring changes, auto-capture changes, or visual-mass/line heuristic changes. Visual mass remains contrast/luminance evidence, not object detection. Line segment evidence remains geometric evidence.

## PR4.2 visual mass debug heatmap

PR4.2 makes native visual mass auditable without changing detection, scoring, or capture behavior.

In native mode, non-normal debug quality modes can show a mapped heatmap overlay labeled `CONTRAST MASS · NOT OBJECT DETECTION`. The debug readout keeps raw and mapped visual-mass values side by side so device tests can explain why the box appears in a region.

Visual mass remains contrast/luminance evidence:

- It is not object detection.
- It does not know what the object is.
- It can prefer black/white high-contrast regions over subtle objects.
- It can be wrong in cluttered scenes.
- It is only one evidence source.

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

For PR4.1, capture raw + mapped debug values for a physical horizontal edge and a physical vertical edge in portrait, landscape-left, and landscape-right.
