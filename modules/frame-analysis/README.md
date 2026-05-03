# norma-camera frame analysis roadmap

## Current V0.2A status

V0.2A does **not** read camera pixels. It adds an honest candidate layer so the product flow can be tested before native frame analysis exists:

- manual fallback candidate from user tap
- heuristic placeholder candidate at a useful guide position
- simulated detector candidate that cycles across left third, center, and right third

The placeholder and simulated candidates are not object detection. The UI must keep saying this clearly.

## Why real detection is native

VisionCamera frames are in-memory native buffers. Real subject, horizon, and line analysis should run in a Native Frame Processor Plugin or a local native module. The app should not copy full frames into JavaScript and should not run JS pixel loops.

Any native analyzer should use latest-frame-only semantics:

- throttle analysis to about 4–10 fps
- drop frames when busy
- never create a backlog
- return compact normalized candidates only

## ML Kit object detection option

ML Kit can detect and track objects on-device and return bounding boxes/tracking IDs. Model packaging matters:

- Bundled model: works offline/immediately after install, but increases app size.
- Unbundled model: smaller app, but model delivery can rely on Google Play Services/model download behavior.

For GrapheneOS-first compatibility, unbundled model delivery is not ideal as a default. GrapheneOS supports sandboxed Google Play, but norma-camera should not require it by default.

An optional experimental branch can test a bundled ML Kit object detector, as long as the app keeps a manual fallback and detector-unavailable UI.

## Preferred V0.3 GrapheneOS-first path

Build a small native heuristic frame-analysis plugin:

1. Downsample luminance only.
2. Compute a coarse edge/gradient map.
3. Find contrast/saliency blobs as subject candidates.
4. Estimate horizon or strong construction lines with Hough-like or line-segment heuristics.
5. Return normalized candidates:
   - subject center/bounds/confidence
   - horizon line/confidence
   - strong line segments/confidence
6. Keep analysis throttled and latest-frame-only.

## Expected V0.3 files

```text
src/detection/
  types.ts
  candidateLabels.ts
  selectCompositionCandidate.ts
  scoreDetectedComposition.ts
  useNativeFrameAnalysisCandidate.ts

modules/frame-analysis/
  android/
  ios/ optional later
  README.md
```

## V0.3 acceptance criteria

- Real native frame analysis runs without backend/cloud.
- Manual tap remains fallback.
- Detector status is visible.
- No JS full-frame pixel processing.
- No frame queue/backlog.
- Auto-capture uses real detected candidates only when confidence is high enough.
