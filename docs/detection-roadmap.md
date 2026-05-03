# norma-camera detection roadmap

## Current state: V0.3A scaffold

V0.3A adds a **Native Heuristic** mode and typed adapters for a future Android frame-analysis module.

Important honesty:

- V0.3A in this branch does **not** read camera pixels yet.
- It does **not** perform semantic object detection.
- It does **not** use ML Kit, Google Play Services, OpenCV, Apple Vision, cloud AI, or a backend.
- The app remains runnable because no unvalidated native module or Gradle change was added.

The new UI mode says:

```text
NATIVE HEURISTIC · UNAVAILABLE
Tap subject or switch mode.
```

Manual, Auto Placeholder, and Simulated Detector modes remain available.

## Why V0.3A is scaffold-only here

The correct real implementation path is a VisionCamera Native Frame Processor Plugin / Nitro Module or a local Android analysis module. That must be built against the exact installed VisionCamera native APIs and validated with an Android dev build.

Without local `node_modules` and without validating the generated Android project, adding native Kotlin/Gradle files would be risky and could break the already-working GrapheneOS app. This pass therefore adds:

- native heuristic TypeScript result types
- native-analysis-to-candidate adapter
- native quality adapter shape
- UI mode and unavailable state
- tests for unavailable/native candidate behavior
- documentation for the exact native implementation plan

## V0.3A intended native pipeline

```text
VisionCamera frame
  -> native Android frame-analysis plugin
  -> read Y plane / luminance only
  -> downsample to small grid, e.g. 96x72 or 128x96
  -> exposure statistics
  -> sharpness / edge energy
  -> coarse contrast/saliency mass center
  -> optional horizontal line estimate
  -> compact normalized result to JS
  -> existing composition scoring
  -> existing auto-capture gates
```

## Signals

### Real exposure, once plugin exists

Return:

```ts
type NativeExposureMetrics = {
  exposureScore: number;
  meanLuma: number;
  clippedHighlightsRatio: number;
  crushedShadowsRatio: number;
};
```

Scoring:

- good if mean luminance is around 0.45–0.6
- penalize clipped highlights
- penalize crushed shadows

### Real sharpness, once plugin exists

Return:

```ts
type NativeSharpnessMetrics = {
  sharpnessScore: number;
  edgeEnergy: number;
};
```

Implementation can use either:

- variance of Laplacian on downsampled luminance
- simple Sobel/gradient edge energy

### Coarse subject candidate, once plugin exists

Return:

```ts
type NativeSubjectCandidate = {
  center: NormalizedPoint;
  bounds: NormalizedRect;
  confidence: number;
  source: 'native-heuristic';
};
```

Candidate heuristic:

- compute gradient magnitude / local contrast
- suppress borders slightly
- find weighted visual-mass center
- estimate coarse bbox from high-energy cells
- return no candidate when confidence is low

This is **not** object detection. It is only a visual-interest candidate.

### Optional line / horizon candidate

Do this in V0.3B only if the subject/quality pipeline is stable.

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

A safe first version should only expose it as a diagnostic. Do not fold it into the final score until the formula is explicit and tested.

## GrapheneOS strategy

GrapheneOS-first means:

- no Google Play Services dependency by default
- no cloud model delivery
- no backend
- no hard dependency on ML Kit
- manual fallback always available
- latest-frame-only native analysis
- no JS pixel loops

Sandboxed Google Play can exist on GrapheneOS, but norma-camera should not require it for the default detection path.

## Native implementation requirements

- Android first only.
- Read luminance/Y plane natively.
- Downsample before analysis.
- Analyze 4–10 fps, not every preview frame.
- Drop frames while busy.
- No queue/backlog.
- Return compact JSON/object only.
- Avoid logs every frame.
- Keep manual fallback.

## V0.3B recommended next step

Build the real Android module/plugin after inspecting installed native APIs.

1. Inspect `node_modules/react-native-vision-camera` for the exact VisionCamera 5.0.8 frame-output/plugin API.
2. Choose either:
   - VisionCamera Native Frame Processor Plugin / Nitro Module, preferred if API is clear.
   - Local Expo/React Native Android module that receives throttled frame data only if the camera API path is safe.
3. Implement luminance downsample and stats first.
4. Return exposure and sharpness first.
5. Add coarse candidate after metrics are stable.
6. Add optional line diagnostic later.

## ML Kit branch, not default

A bundled ML Kit object detector can be explored separately, but not as the GrapheneOS-first default path.

Reasons:

- it adds model/dependency complexity
- it is semantic-ish detection, while V0.3A is meant to be deterministic heuristic analysis
- unbundled/model-delivery options are not ideal for GrapheneOS-first

If tested later, keep it as an optional Android experiment and label it clearly in the UI.

No backend, cloud AI, Google service, OpenCV, Apple Vision, native frame processor, or JavaScript pixel loop is used in V0.2A.

## Why real detection needs native frame analysis

VisionCamera frames are in-memory camera buffers. For performance and battery safety, image analysis should happen in a native frame-analysis layer, not by copying full frames into JavaScript and looping over pixels.

A future native frame analyzer should use latest-frame-only semantics:

- throttle analysis to roughly 4–10 fps
- process a downsampled representation
- drop frames while busy
- never queue a backlog
- return compact normalized geometry only

Example returned data:

```ts
type FrameAnalysisResult = {
  subjectCandidates: Array<{
    bounds: NormalizedRect;
    center: NormalizedPoint;
    confidence: number;
    source: 'native-heuristic' | 'mlkit-bundled';
  }>;
  horizonCandidates: Array<{
    angleDeg: number;
    y: number;
    confidence: number;
  }>;
  constructionLines: Array<{
    x1: number;
    y1: number;
    x2: number;
    y2: number;
    confidence: number;
  }>;
};
```

## ML Kit notes

ML Kit can detect and track objects on-device and return bounding boxes and tracking IDs, but model installation choice matters.

- **Bundled ML Kit model**
  - Works offline/immediately after install.
  - Increases app size.
  - Better for GrapheneOS-first behavior because model delivery is not deferred to Google services.

- **Unbundled ML Kit model**
  - Smaller app package.
  - Historically depends on Google Play Services / model delivery.
  - Not ideal as the default path for GrapheneOS-first users.

GrapheneOS supports sandboxed Google Play, but norma-camera should not require sandboxed Google Play by default.

## Preferred V0.3 GrapheneOS-first path

Build a native heuristic frame-analysis plugin first:

- downsample luminance
- compute edge/gradient map
- find coarse saliency or contrast blobs
- estimate horizon / line-like structures with simple Hough-style or segment heuristics
- return normalized subject, horizon, and line candidates
- run at low FPS with busy-frame dropping

This keeps the product offline-first, deterministic, and independent of Google Play Services.

## Optional experimental branch

Create a separate ML Kit bundled object-detector experiment:

- Android only
- bundled on-device model
- no cloud mode
- no unbundled model as a required dependency
- clear fallback to manual/placeholder if unavailable

## V0.3 acceptance criteria

- Camera opens and detector status is visible.
- Real native frame analysis returns at least one normalized candidate when available.
- Manual tap remains fallback.
- UI clearly says whether detection is native heuristic, ML Kit bundled, unavailable, or manual.
- ARM ON can auto-capture from a real native candidate.
- No backend.
- No cloud AI.
- No JavaScript full-frame pixel processing.
- No frame backlog.
