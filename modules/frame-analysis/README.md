# modules/frame-analysis

Status in this package: **V0.3B typed adapter + documented native implementation; native Android plugin not compiled here**.

The app is wired to look for this future native module:

```ts
NativeModules.NormaFrameAnalysis?.getLatestAnalysis()
```

When unavailable, Native mode remains honest:

```text
NATIVE VISUAL MASS · unavailable
Manual fallback active.
No semantic object detection yet.
```

## Intended V0.3B native visual-mass pipeline

```text
camera frame
  -> native Android VisionCamera frame-analysis path
  -> Y plane / luminance only
  -> downsample to 96x72 first
  -> exposure stats
  -> sharpness / edge energy
  -> contrast visual-mass candidate
  -> compact normalized result to JS
```

No raw pixels or luminance grids should cross the JS bridge.

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
  analysisFps?: number;
};
```

Subject candidate:

```ts
type NativeSubjectCandidate = {
  center: NormalizedPoint;
  bounds: NormalizedRect;
  confidence: number;
  source: 'native-heuristic';
};
```

## V0.3B algorithm

### Exposure

- mean luminance
- clipped highlight ratio
- crushed shadow ratio
- score 0–100

Suggested score:

```text
base = 100 - abs(meanLuma - 0.52) * 180
penalty = clippedHighlightsRatio * 80 + crushedShadowsRatio * 70
exposureScore = clamp(base - penalty, 0, 100)
```

### Sharpness / edge energy

Use a lightweight gradient on the downsampled Y grid:

```text
gx = abs(luma[x+1,y] - luma[x-1,y])
gy = abs(luma[x,y+1] - luma[x,y-1])
energy = gx + gy
```

Normalize `edgeEnergy` into `sharpnessScore` 0–100. Device-specific calibration can come later.

### Visual mass

- ignore outer 8–12% border
- suppress clipped luma cells
- compute gradient/contrast energy
- adaptive threshold: `meanEnergy + 0.75 * stdEnergy`
- weighted centroid from active cells
- bbox from active cells
- reject weak/tiny/huge/border-heavy candidates
- confidence threshold: `0.35`

Label the result as `native visual mass`, not object/person/face detection.

## Safety constraints

- latest-frame-only
- throttle to 4–8 fps
- drop frame if analyzer is busy
- never queue frames
- no full-frame copy into JS
- no JS pixel loops
- no backend
- no cloud AI
- no ML Kit in V0.3B
- no Google Play Services dependency

## Native API decision rule

Before adding Kotlin/Gradle files, inspect the installed `react-native-vision-camera@5.0.8` package and choose a buildable path.

If the native API is unclear:

- do not invent plugin names
- do not break the working camera preview
- keep this adapter unavailable
- document the exact API gap

## V0.3C

Next step after real visual mass is validated:

- horizon / strong horizontal-line diagnostic
- separate from composition score until the formula is tested
