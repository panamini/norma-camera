# V0.3B-0 Frame-output readiness

Status: **historical note, superseded by the current Android frame-analysis module**.

This document records the earlier readiness-only step. It is not the current runtime state.

## What was true for V0.3B-0

- The app prepared the VisionCamera frame-output path.
- The native analyzer was not implemented yet.
- Native mode was expected to report unavailable/fallback.
- Existing candidate modes stayed intact:
  - manual
  - auto-placeholder
  - simulated-detector
  - native-heuristic unavailable/fallback

## Current state after later PRs

The repository now contains `modules/frame-analysis`, a local Android-only Expo module with:

- live Y-plane luminance analysis
- exposure metrics
- sharpness / edge-energy metrics
- native visual-mass candidate
- horizontal-line signal
- compact result polling through `NormaFrameAnalysis.getLatestAnalysis()`
- a worklet-safe Nitro analyzer object used by the VisionCamera frame path

Native mode may still report unavailable when the installed Android dev-client was not rebuilt with this module, when the runtime is not Android, or when the frame analyzer cannot access a supported frame object.

## Non-goals that still apply

The current implementation still intentionally avoids:

- object detection
- face/person detection
- semantic labels
- horizon detection claims
- ML Kit
- OpenCV
- cloud AI
- backend inference
- JavaScript pixel loops
- image buffers crossing the JS bridge during live analysis

## Validation now required

Use the current release-candidate validation chain:

```bash
npm test
npm run typecheck
npx expo config --type introspect
npm run android
```

Because the frame analyzer is native Android code, `npm run android` or an equivalent rebuilt dev-client is required before claiming native runtime success.
