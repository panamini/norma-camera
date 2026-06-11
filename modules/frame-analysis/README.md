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
  -> debug-only line segment spike candidates
  -> compact normalized result to JS
  -> JS-side debug-only line segment temporal stabilization
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
  lineSegments?: NativeLineSegmentCandidate[];
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

type NativeLineSegmentCandidate = {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  angleDeg: number;
  lengthEuclidean: number;
  confidence: number;
  orientationKind: 'horizontal' | 'vertical' | 'diagonal' | 'unknown';
  src: 'native-line-segment-spike';
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

The subject candidate is a native visual-mass contrast candidate. The line candidate is a secondary horizontal-line signal. `lineSegments` is a debug-only native spike over the same downsampled luma grid. JS may enrich displayed `lineSegments` with `fresh`, `stable`, or `retained` debug state, but none of these signals are semantic recognition.
The visual-mass debug payload is compact contrast/luminance evidence only: coarse heat cells, top coarse candidate summaries, raw selected candidate, and stabilized candidate. It does not expose raw pixels, a full luminance grid, semantic labels, or object identity.

## Coordinate calibration

Live Android results include native frame dimensions, downsampled grid dimensions, VisionCamera frame orientation, and mirroring when the installed VisionCamera frame exposes them through `HybridFrameSpec`.

JS keeps raw and mapped evidence side by side:

```txt
rawLineCandidate
mappedLineCandidate
rawLineSegments
mappedLineSegments
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

## PR4.5 line segment spike

PR4.5 adds `LineSegmentHeuristic.kt`, a no-dependency Android/Kotlin prototype over the existing 32x24 luma grid. It scans simple horizontal, vertical, and diagonal edge runs, scores by length, coverage, and contrast, keeps a compact top-N list, and emits `lineSegments`.

This spike is debug-only:

- `lineCandidate` remains compatible and unchanged.
- `lineSegments` does not feed composition scoring.
- `lineSegments` does not feed readiness text, capture triggers, or auto-capture.
- No OpenCV, ML Kit, cloud, backend, or JS pixel loop is added.
- The debug overlay can show mapped segments labeled `LINE SEGMENT SPIKE` in native debug modes.

PR4.6 keeps this spike debug-only and calibrates the presentation layer: JS pairs each raw segment with its mapped segment or a mapped-rejection reason, and overlay keys are deterministic from rounded endpoints, source, and orientation rather than UUIDs or index-only keys.

PR4.7 keeps the spike debug-only and calibrates native candidate thresholds only. The detector now keeps at most 3 segments, requires stronger overall edge energy, a higher adaptive edge threshold, 6-cell runs, normalized length at least 0.22, confidence at least 0.32, and same-orientation deduplication within a 0.08 normalized center distance.

PR4.8 keeps the native detector unchanged and stabilizes `lineSegments` in JS for debug presentation only. Same-orientation segments with coherent center, angle, and length become `stable` after repeated observations; previously stable missing segments can be shown briefly as `retained`. This does not create a subject candidate, feed scoring, affect readiness text, trigger capture, or change auto-capture.

PR4.9 tunes debug overlay visibility and preset behavior. It does not change detection, scoring, auto-capture, readiness text, native algorithms, native thresholds, the frame pipeline, or the native bridge.

Debug overlay presets:

- `normal`: clean camera overlay; visual mass heatmap, legacy line signal, line segment spike, and heavy native debug text are hidden.
- `mass`: mapped visual mass heatmap and native debug text, without line segment spike.
- `lines`: legacy `LINE SIGNAL`, mapped `LINE SEGMENT SPIKE`, and native debug text, without visual mass heatmap.
- `mixed`: visual mass, line signal, line segment spike, and native debug text for explicit combined inspection.

The `hide panels` control hides the heavy native debug text but does not change overlay preset visibility.

Limitations:

- The grid is intentionally coarse, so endpoints are approximate.
- Textures and high-contrast clutter can outrank real scene lines.
- Kotlin unit tests are not currently wired for this local Expo module; TS tests cover bridge contract, mapping, evidence, debug readout, and scoring guardrails, while Android build validation covers native compilation.

## PR4.2 visual mass debug heatmap

PR4.2 makes native visual mass auditable without changing detection, scoring, or capture behavior.

In native mode, the `mass` debug overlay preset shows a mapped heatmap overlay labeled `CONTRAST MASS`. The debug readout keeps raw and mapped visual-mass values side by side so device tests can explain why the box appears in a region.

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

For PR4.6, validate `LINE SEGMENT SPIKE` in portrait upright, landscape-left, and landscape-right against a horizontal table edge, vertical door edge, rectangular screen, keyboard, visible diagonal, cluttered scene, and nearly empty wall. Check visible-line alignment, rotation behavior, raw/mapped coherence, false-positive volume, diagonal visibility, debug text usefulness, native-mode stability, and obvious FPS regressions.

For PR4.8, repeat the PR4.6 scenes and confirm the debug readout distinguishes `fresh`, `stable`, and `retained`; stable visible edges should flicker less, retained segments should disappear quickly, and no ghost segment should persist after the scene changes.

For PR4.9, validate `normal`, `mass`, `lines`, and `mixed` in portrait, landscape-left, and landscape-right against keyboard, screen, window, table, empty wall, cluttered scene, and visible diagonal scenes. Confirm normal mode is clean, visual mass and line segment spike can be inspected separately, labels do not cover important edges or capture controls, the grid remains visible, and scoring plus auto-capture remain unchanged.

Manual calibration not performed in this coding pass: `adb devices` returned no attached device/emulator.
