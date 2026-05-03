# norma-camera detection roadmap

## Current V0.2A state

V0.2A does **not** read camera pixels and does **not** detect real objects, horizons, or construction lines.

The current detection layer has three honest candidate sources:

1. `manual`
   - User taps the preview.
   - The tapped normalized point becomes the composition candidate.

2. `heuristic-placeholder`
   - Used by **AUTO V0.2 · PLACEHOLDER** mode.
   - Creates a fixed, useful normalized candidate near the left third.
   - This proves the automatic scoring and ARM flow without claiming real object detection.

3. `simulated-detector`
   - Used by **SIMULATED DETECTOR** mode.
   - Cycles a deterministic bounding box across left third, center, and right third.
   - This is only for testing auto-capture UX and stability/cooldown behavior.

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
