# PR3 native luma ingestion blocker

Status: **draft / blocked before implementation**.

Base branch: `pr2-luminance`

PR3 target remains unchanged: feed real Android preview-frame luminance into `NormaFrameAnalysisStore.analyzeDownsampledLumaGrid(...)` without JS pixel loops, without full image buffers crossing JS, and without semantic/object/person/face detection.

## What was verified

- `react-native-vision-camera` is pinned to `5.0.8` in this app.
- VisionCamera 5 exposes live frames through `useFrameOutput(...)`.
- `useFrameOutput(...)` supports `pixelFormat: 'yuv'` and requires every received `Frame` to be disposed promptly.
- VisionCamera's JS-facing `Frame` contract exposes planar access through `frame.getPlanes()` and plane bytes through `plane.getPixelBuffer()`.
- PR2 exposes the compact Android native module APIs:
  - `getLatestAnalysis()`
  - `reset()`
  - `analyzeDownsampledLumaGrid(values, width, height, createdAtMs)`

## Blocker

The only confirmed way to read the live Y plane from the `useFrameOutput` worklet is to call `frame.getPlanes()` / `plane.getPixelBuffer()` from JavaScript and loop over those bytes there.

That path violates PR3 constraints:

- no JS camera-frame pixel loops
- no full frame/image buffers passed through JS
- no JS-side RGB or pixel conversion

The current PR2 Android module is an Expo module exposing bridge-style/debug/polling functions. I did not verify a worklet-safe native VisionCamera/Nitro entrypoint that can receive the VisionCamera `Frame` object directly, read the Android Y plane natively, downsample it, and return before `frame.dispose()`.

Because that native accepts-`Frame` path is not verified, implementing PR3 through the available JS plane APIs would fake compliance. This branch intentionally does not do that.

## Do not do

- Do not call `frame.getPlanes()` and downsample in JS just to make the counter move.
- Do not feed synthetic/debug luma grids and label them as live frame analysis.
- Do not pass full pixel arrays or image buffers through JS.
- Do not add ML Kit, OpenCV, semantic labels, object/person/face detection, or visual-mass boxes.

## Next smallest step

On the local checkout, inspect the installed `node_modules/react-native-vision-camera@5.0.8`, `react-native-vision-camera-worklets`, and Nitro generated Android APIs. PR3 can proceed only after confirming a native module/plugin route that:

1. is callable from the VisionCamera frame-output worklet,
2. accepts the live `Frame` without JS pixel extraction,
3. reads/downsamples the Android Y plane natively,
4. calls `NormaFrameAnalysisStore.analyzeDownsampledLumaGrid(...)`, and
5. releases all frame/native-buffer references before the JS worklet disposes the frame.

If no such route exists in the installed API, PR3 should remain blocked until a proper VisionCamera/Nitro frame plugin integration is added or the constraints are explicitly changed.