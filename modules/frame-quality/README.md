# norma-camera frame analysis module plan

## V0.1/V0.2A status

The app currently uses `useFrameQualityStub()` for quality gates and V0.2A placeholder/simulated candidates for automatic composition UX. V0.2A does **not** read pixels and does **not** perform real object, horizon, or construction-line detection.

## Quality analysis plan

The intended native quality module should:

- Process downsampled luminance only, not full-resolution RGB frames.
- Estimate exposure from mean luminance plus clipped highlight and clipped shadow ratios.
- Estimate sharpness with variance of Laplacian on grayscale/luminance data.
- Estimate motion from gyro/accelerometer data or thumbnail-to-thumbnail difference.
- Return normalized scores from `0..100`:
  - `sharpnessScore`
  - `exposureScore`
  - `motionScore` where lower is better
  - `sceneChangedScore`
- Run natively through a VisionCamera Native Frame Processor Plugin or an Expo local module using Swift/Kotlin/C++.
- Throttle analysis to roughly 4–10 fps.
- Drop frames when work is already in progress.
- Never create a queue or backlog of frames.
- Keep latest-frame-only semantics.

## Detection V0.3 plan

Real object/horizon/line detection also needs native frame analysis. VisionCamera frames are in-memory buffers and should be processed by Native Frame Processor Plugins, not JavaScript pixel loops.

GrapheneOS-first recommendation:

- native heuristic frame-analysis plugin
- downsample luminance
- edge/gradient map
- coarse saliency blob detection
- Hough/line-like horizon estimates
- return normalized subject/horizon/line candidates

Optional experimental branch:

- ML Kit bundled object detector
- keep model bundled/offline if tested
- do not require Google Play Services as the default product path

ML Kit can detect/track objects on-device and return bounding boxes/tracking IDs, but model installation choice matters. A bundled model works offline/immediately but increases app size. An unbundled model relies on Google Play Services/model delivery, which is not ideal for GrapheneOS-first behavior. GrapheneOS supports sandboxed Google Play, but norma-camera should not require it by default.
