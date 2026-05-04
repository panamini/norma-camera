# norma-camera detection roadmap

## Current target: V0.3B Native Visual-Mass Subject Candidate

V0.3B keeps the app honest while preparing the first real Android image signal.

This branch wires the TypeScript adapter, candidate selection, UI copy, tests, and documentation for **Native Visual Mass**:

```text
NATIVE VISUAL MASS
Real luminance analysis.
No semantic object detection yet.
```

Important honesty:

- V0.3B is **not** semantic object detection.
- It must never claim object, person, face, or AI detection.
- It does not use ML Kit, Google Play Services, OpenCV, Apple Vision, cloud AI, or a backend.
- Manual, Auto Placeholder, and Simulated Detector modes remain available.
- Manual tap remains the fallback and can override a native candidate.

## Native implementation status in this package

The runtime JS now expects a compact native module contract:

```ts
NativeModules.NormaFrameAnalysis?.getLatestAnalysis()
```

If that module is unavailable, the app shows:

```text
NATIVE VISUAL MASS · unavailable
Manual fallback active.
No semantic object detection yet.
```

The native Android frame processor itself is **not added in this package** because it must be built against the exact installed VisionCamera 5.0.8 native APIs and validated with an Android dev build. If those APIs are ambiguous locally, do not invent a plugin implementation. Keep this unavailable state and add the native code in the next validated pass.

## Intended native V0.3B pipeline

```text
VisionCamera frame
  -> native Android frame-analysis plugin
  -> read Y plane / luminance only
  -> downsample to 96x72, or 128x96 after performance validation
  -> exposure statistics
  -> sharpness / edge energy
  -> contrast visual-mass candidate
  -> compact normalized result to JS
  -> existing composition scoring
  -> existing auto-capture gates
```

## Signals

### Real exposure

Return:

```ts
type NativeExposureMetrics = {
  exposureScore: number;
  meanLuma: number;
  clippedHighlightsRatio: number;
  crushedShadowsRatio: number;
};
```

Suggested formula:

```text
base = 100 - abs(meanLuma - 0.52) * 180
penalty = clippedHighlightsRatio * 80 + crushedShadowsRatio * 70
exposureScore = clamp(base - penalty, 0, 100)
```

### Real sharpness / edge energy

Return:

```ts
type NativeSharpnessMetrics = {
  sharpnessScore: number;
  edgeEnergy: number;
};
```

Start with a simple gradient energy on downsampled luminance:

```text
gx = abs(luma[x+1,y] - luma[x-1,y])
gy = abs(luma[x,y+1] - luma[x,y-1])
energy = gx + gy
```

### Visual-mass subject candidate

Return:

```ts
type NativeSubjectCandidate = {
  center: NormalizedPoint;
  bounds: NormalizedRect;
  confidence: number;
  source: 'native-heuristic';
};
```

Heuristic:

1. Ignore the outer 8–12% border.
2. Compute local gradient/contrast energy per downsampled cell.
3. Suppress clipped cells where luma `< 0.05` or `> 0.95`.
4. Use adaptive threshold `meanEnergy + 0.75 * stdEnergy`.
5. Compute weighted centroid from active high-energy cells.
6. Compute bounds from active cells.
7. Reject tiny, huge, border-heavy, weak-energy, or poorly exposed candidates.
8. Use confidence threshold `0.35`.

This is only a **contrast candidate**. It is not an object label.

### Horizon / line diagnostic deferred

V0.3B should not fold horizon/line candidates into the score. V0.3C can add a separate diagnostic:

```ts
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

## GrapheneOS strategy

GrapheneOS-first means:

- no Google Play Services dependency by default
- no cloud model delivery
- no backend
- no hard dependency on ML Kit
- manual fallback always available
- latest-frame-only native analysis
- no JS pixel loops

Sandboxed Google Play may exist on GrapheneOS, but norma-camera should not require it for the default detection path.

## Native implementation requirements

- Android first only.
- Read luminance/Y plane natively.
- Downsample before analysis.
- Analyze 4–8 fps, not every preview frame.
- Drop frames while busy.
- No queue/backlog.
- Return compact JS objects only.
- Avoid logs every frame.
- Keep manual fallback.

## Validation checklist

- Native mode visible.
- Native unavailable/low-confidence/ready states are displayed honestly.
- Manual mode still works.
- Auto Placeholder still works.
- Simulated Detector still works.
- If native candidate is ready, bbox/center/confidence/score are visible.
- ARM ON uses native candidate only when confidence and score pass.
- Sharpness/exposure are labeled real only if native values exist.
- Motion and scene change remain stubbed.

## V0.3C recommended next step

After V0.3B is validated, add a separate native horizon / strong-line diagnostic:

```text
downsampled luminance
  -> edge map
  -> horizontal/near-horizontal accumulator
  -> diagnostic line candidate
```

Keep it diagnostic until the final scoring formula is explicit and tested.

## ML Kit branch, not default

A bundled ML Kit object detector can be explored separately, but not as the GrapheneOS-first default path.

Reasons:

- it adds model/dependency complexity
- it introduces semantic-ish detection
- unbundled/model-delivery options are not ideal for GrapheneOS-first

If tested later, keep it as an optional Android experiment and label it clearly in the UI.
