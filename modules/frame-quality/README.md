# norma-camera frame-quality module plan (V0.1)

V0 deliberately uses `useFrameQualityStub()` so the first app remains small, offline, and runnable without a native analysis plugin.

The intended V0.1 native quality module should:

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
- Avoid backend calls, cloud AI, object detection, face detection, ML Kit, Apple Vision, OpenCV, or generative AI.
