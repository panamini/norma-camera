# frame-quality future module

V0.3B can use real native sharpness/exposure only when `NativeModules.NormaFrameAnalysis.getLatestAnalysis()` returns them.

Current fallback behavior:

- `useFrameQualityStub()` still provides default quality values when native analysis is unavailable.
- Native Visual Mass mode labels sharpness/exposure as `real luminance` only when native values exist.
- Motion remains stubbed.
- Scene change remains stubbed.

Future implementation should live in `modules/frame-analysis` and return:

- `sharpnessScore` from downsampled luminance edge energy / variance of Laplacian
- `exposureScore` from mean luminance plus highlight/shadow clipping ratios
- `motionScore` from sensors or frame-to-frame thumbnail deltas in a later pass

Constraints:

- process luminance only
- throttle to 4–8 fps
- drop frames when busy
- no JS full-frame pixel loops
- no frame backlog
- no backend
- no cloud AI
