# V0.3B-0 Frame-output readiness

Status: **readiness plumbing only**.

This step prepares Norma Camera for future native Android luminance analysis without implementing luminance metrics yet.

## Scope in this PR

- Adds the VisionCamera worklets dependency required by `useFrameOutput`.
- Wires a no-op frame output path for `native-heuristic` mode.
- Keeps `photoOutput` active so photo capture remains unchanged.
- Disposes each frame immediately.
- Keeps all existing candidate modes intact:
  - manual
  - auto-placeholder
  - simulated-detector
  - native-heuristic unavailable/fallback
- Preserves the existing quality fallback:
  - native sharpness/exposure only override stub values when both numbers exist
  - otherwise `useFrameQualityStub.ts` remains the quality source

## Non-goals

This PR intentionally does **not** add:

- luminance metrics
- sharpness / edge-energy computation
- exposure computation
- object detection
- face/person detection
- horizon detection
- ML Kit
- OpenCV
- cloud AI
- backend
- semantic labels
- JavaScript pixel loops
- image buffers crossing the JS bridge

## Runtime behavior

When `detectionMode !== 'native-heuristic'`, the camera uses the existing photo output only.

When `detectionMode === 'native-heuristic'`, the camera attaches the no-op frame output alongside `photoOutput`. The frame callback is a worklet, reads no pixels, performs no analysis, and disposes the frame immediately.

The existing `NativeModules.NormaFrameAnalysis?.getLatestAnalysis()` polling path is unchanged. Because no native analyzer exists yet, native mode should continue to report unavailable/fallback unless a future native module supplies compact analysis results.

## Native-code tracking strategy

The repository currently ignores generated native folders:

```txt
android/
ios/
```

For V0.3B-1, prefer one of these tracked strategies instead of committing generated folders wholesale:

1. A tracked local Expo module / native package outside ignored `android/` and `ios/`.
2. A tracked Expo config plugin that injects only the required Android module registration/build changes.
3. If unavoidable, explicitly force-add only the specific native Android files needed for `NormaFrameAnalysis` and document why.

Do **not** commit the entire generated `android/` or `ios/` folder.

## V0.3B-1 next implementation boundary

The next step should implement Android-only native luminance metrics:

```text
VisionCamera frame
  -> native Android analyzer/plugin
  -> read Y plane only
  -> downsample luminance
  -> exposure metrics
  -> sharpness / edge-energy metrics
  -> compact NativeFrameAnalysisResult
  -> existing JS polling + quality gates
```

V0.3B-1 should still avoid semantic detection. A contrast visual-mass candidate can come after exposure and sharpness are proven stable.

## Local validation required

After pulling this PR branch locally, run:

```bash
npm test
npm run typecheck
npx expo config --type introspect
```

Because `react-native-vision-camera-worklets` is a native dependency, rebuild and launch the Android dev client before claiming runtime success.
