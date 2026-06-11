# norma-camera detection roadmap

## Current target: PR4.0 Production Hardening

The feature stack is complete for this release candidate:

- live luminance metrics
- live sharpness / edge-energy metrics
- native visual-mass candidate
- native confidence readout
- guide score
- horizontal-line signal as a secondary composition contribution
- composition breakdown
- line signal stabilization
- conservative capture-readiness copy

PR4.0 is a hardening pass. It must not add a detector, a new scoring formula, a new frame pipeline, a new native bridge, or any auto-capture behavior change.

## Native implementation status

The repository now contains a local Android-only Expo module in `modules/frame-analysis`.

Runtime entry points:

```ts
requireNativeModule('NormaFrameAnalysis').getLatestAnalysis()
NitroModules.createHybridObject('NormaFrameAnalyzer').analyze(frame)
```

If the app is running outside Android, or if the installed dev-client was built without this local module, Native mode remains honest:

```txt
NATIVE VISUAL MASS · unavailable
Manual fallback active.
No recognition is used.
```

That unavailable state is a runtime/build condition, not proof that the source module is missing.

## Current native pipeline

```txt
VisionCamera frame
  -> worklet-safe Nitro analyzer
  -> Android Y plane read
  -> native downsample to 32x24
  -> exposure metrics
  -> sharpness / edge energy
  -> contrast visual-mass candidate
  -> horizontal-line signal
  -> compact normalized result to JS
  -> existing composition scoring
  -> existing auto-capture gates
```

No raw pixels or luminance grids cross into JS during live analysis.

## Signal contract

### Exposure

```ts
type NativeExposureMetrics = {
  exposureScore: number;
  meanLuma: number;
  clippedHighlightsRatio: number;
  crushedShadowsRatio: number;
};
```

### Sharpness / edge energy

```ts
type NativeSharpnessMetrics = {
  sharpnessScore: number;
  edgeEnergy: number;
};
```

### Visual-mass subject candidate

```ts
type NativeSubjectCandidate = {
  center: NormalizedPoint;
  bounds: NormalizedRect;
  confidence: number;
  source: 'native-heuristic';
};
```

This is a contrast candidate. It is not object, person, face, scene, or AI detection.

### Horizontal-line signal

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

The line signal is secondary. It can add a small tested contribution to composition scoring only when a subject candidate exists. It must not make a no-subject frame ready.

## Stability guardrails

- Android first only.
- Latest-frame-only native analysis.
- Analyze at about 4 fps (`MIN_ANALYSIS_INTERVAL_MS = 250`).
- Drop/return latest result while busy; never queue frames.
- Mark live analysis stale after 1500 ms.
- Hold visual mass briefly for transient weak frames, but active candidates still require active confidence.
- Expose line signal only after coherent recent observations.
- Retain a stable line briefly, without renewing retention from the retained value.
- Avoid logs every frame.
- Keep manual fallback.
- Keep Manual, Auto Placeholder, and Simulated Detector modes available.

## GrapheneOS strategy

GrapheneOS-first means:

- no Google Play Services dependency by default
- no cloud model delivery
- no backend
- no hard dependency on ML Kit
- no OpenCV dependency
- no JavaScript pixel loops
- manual fallback always available

Sandboxed Google Play may exist on GrapheneOS, but norma-camera must not require it for the default detection path.

## Validation checklist

Run before release candidate handoff:

```bash
npm test
npm run typecheck
npx expo config --type introspect
npm run android
```

If `npm run android` blocks locally, document the concrete blocker:

- `ANDROID_HOME` missing
- `android/local.properties` missing
- no Android device/emulator available
- device unauthorized or offline
- ADB daemon/socket failure
- Gradle/native build failure

Manual Android checks:

- app opens
- camera preview opens
- manual mode works
- auto-placeholder works
- simulated detector works
- native-heuristic works or reports unavailable honestly
- visual mass box appears when native candidate is active
- score visible
- composition breakdown visible
- line signal stable enough
- readiness text conservative
- ARM behavior unchanged
- capture works
- no obvious FPS collapse
- no stale line/candidate stuck forever
- background/foreground does not crash
- camera reopen does not crash

## Explicit non-goals

Do not add:

- new detector
- new composition heuristic
- new scoring formula
- OpenCV
- ML Kit
- AI model
- object/person/face detection
- new Nitro bridge
- new frame pipeline
- JS pixel processing
- backend/cloud inference
- auto-capture behavior change
