# norma-camera detection roadmap

## Current target: PR4.5 Native Line Segment Detection Spike

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
- explicit native evidence coordinate mapping for overlay/debug
- compact visual-mass heatmap/debug explanation
- general camera evidence model for raw-frame, preview-mapped, scoring, and debug-only evidence
- debug-only native line segment spike candidates

PR4.5 is a controlled native spike. It adds compact line segment candidates for debug learning only. It must not change scoring, readiness text, capture triggers, auto-capture behavior, the frame pipeline, or the native bridge.

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
  -> compact contrast/luminance debug cells and candidate summaries
  -> horizontal-line signal
  -> debug-only no-dependency line segment spike candidates
  -> native frame/grid/orientation/mirroring metadata
  -> compact normalized result to JS
  -> explicit raw-frame to preview-coordinate mapping for overlay/debug
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

### Visual-mass debug payload

```ts
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

This payload explains coarse contrast/luminance mass only. It can show where the native analyzer found high visual energy, which raw candidate it selected, and which candidate was stabilized. It does not know what the object is and does not perform object detection.

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

### Native line segment spike

```ts
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

type NativeFrameAnalysisResult = {
  lineCandidate?: NativeLineCandidate | null;
  lineSegments?: NativeLineSegmentCandidate[];
};
```

`lineSegments` is separate from the legacy `lineCandidate`. It is debug-only evidence from a no-dependency Kotlin prototype over the existing 32x24 luma grid. It is not used for scoring, readiness text, capture triggers, or auto-capture.

## Coordinate calibration contract

Native visual mass is contrast/luminance evidence, not object detection. Horizontal line signal is geometric evidence, not semantic composition.

PR4.1 keeps raw and mapped evidence available side by side:

```txt
rawLineCandidate
mappedLineCandidate
rawVisualMassBounds
mappedVisualMassBounds
rawVisualMassCenter
mappedVisualMassCenter
rawVisualMassDebug
mappedVisualMassDebug
```

The tested mapping layer is:

```txt
native frame normalized coordinates
  -> VisionCamera Frame.orientation / Frame.isMirrored correction
  -> presented frame coordinates
  -> preview layout coordinates with resizeMode cover crop offsets
```

Installed VisionCamera types define orientation as `'up' | 'right' | 'down' | 'left'`. Installed `PreviewView` types define resize mode as `'cover' | 'contain'` and default to `cover`; norma-camera sets `cover` explicitly.

For PR4.1, overlay/debug uses mapped evidence. Scoring remains on the existing raw native candidate inputs, so the scoring formula and auto-capture behavior are unchanged. If a later PR changes scoring inputs to mapped coordinates, the PR must state: `Scoring formula unchanged, but native candidate input coordinates are corrected from raw-frame space to preview/composition space.`

For PR4.2, non-normal debug quality modes can render a mapped visual-mass heatmap labeled `CONTRAST MASS · NOT OBJECT DETECTION`. Normal UI remains unpolluted. The debug copy must say contrast/luminance evidence, not object detection. Visual mass can be wrong in cluttered scenes and can prefer high-contrast black/white regions over subtle objects.

## Camera Evidence Model

Camera evidence is the observed camera-side input that later scoring layers may evaluate. It is not composition scoring, object recognition, or semantic detection.

The PR4.3 TypeScript model keeps evidence explicit by source, shape, coordinate space, and purpose:

- `source`: manual, native visual mass, native line signal, simulated, or placeholder.
- `kind`: point, rect, line segment, or heatmap.
- `space`: raw frame or preview mapped.
- `purpose`: scoring or debug-only.

Manual subject points, native visual-mass centers, native visual-mass bounds, native line signals, and visual-mass heatmap summaries are all evidence. They do not mean that an object, person, face, or scene has been detected. Visual mass remains contrast/luminance evidence. Line signal remains geometric evidence. The evidence snapshot can expose raw and mapped evidence side by side without changing the existing scoring formula or auto-capture gates.

PR4.4 generalizes line evidence as a line segment contract without changing the detector. `CameraLineSegmentEvidence` stores endpoints, derived `angleDeg`, derived `lengthEuclidean`, and visual `orientationKind` (`horizontal`, `vertical`, `diagonal`, or `unknown`). The legacy native `lineKind` remains available for the current horizontal scoring guardrail, but future native line segment detectors should feed the same endpoint-based evidence shape in raw-frame and preview-mapped spaces.

PR4.5 feeds the same evidence model with `source: 'native-line-segment-spike'` and `purpose: 'debug-only'`. Raw and mapped segment evidence are exposed side by side. The debug overlay can show these segments in native debug modes, labeled `LINE SEGMENT SPIKE`.

## PR4.5 dependency decision and limits

Chosen option: no new dependency Kotlin prototype over the existing downsampled luma grid.

Rejected for PR4.5:

- OpenCV Android `HoughLinesP`: requires explicit approval because it affects Android build complexity, Expo/dev-client rebuild expectations, APK size, and maintenance surface.
- Native C++/Nitro/OpenCV path: better evaluated after the no-dependency spike produces device evidence.
- JS pixel processing: violates the live-analysis bridge constraint.

Known limits:

- The 32x24 grid is coarse; endpoints and diagonals are approximate.
- High-contrast texture can produce stronger candidates than real composition lines.
- The spike scans horizontal, vertical, and simple diagonals only; it is not semantic scene understanding.
- Kotlin unit test infrastructure is not currently present in `modules/frame-analysis`; PR4.5 covers TS mapping/evidence/debug guardrails and validates native compilation through Android build.

PR4.3 keeps `CompositionCandidate` and the existing native DTOs in place. The evidence model is a transition layer for clarity and future adapters, including future line segments, future detectors, manual evidence, or a later Norma Core adapter.

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
- native frame/grid/preview geometry visible in debug when available
- raw + mapped line and visual-mass values visible in native debug when available
- horizontal physical edge debug values captured in portrait, landscape-left, and landscape-right
- vertical physical edge debug values captured in portrait, landscape-left, and landscape-right
- mapped overlay line follows the visual edge orientation more closely than raw-only overlay
- visual mass bbox remains on the same visual region after rotation when native evidence is stable
- readiness text conservative
- ARM behavior unchanged
- capture works
- no obvious FPS collapse
- no stale line/candidate stuck forever
- background/foreground does not crash
- camera reopen does not crash

## Explicit non-goals

Do not add:

- new production detector
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
