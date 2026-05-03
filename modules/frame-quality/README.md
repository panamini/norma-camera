# frame-quality future module

V0.3A keeps frame quality stubbed unless a native frame-analysis module is present.

Current app behavior:

- `useFrameQualityStub()` still provides default quality values.
- Native Heuristic mode can display real sharpness/exposure only if a future Android module returns them.
- Motion remains stubbed in this pass.

Future implementation should live in `modules/frame-analysis` and return:

- `sharpnessScore` from downsampled luminance edge energy / variance of Laplacian
- `exposureScore` from mean luminance plus highlight/shadow clipping ratios
- `motionScore` from sensors or frame-to-frame thumbnail deltas in a later pass

Constraints:

- process luminance only
- throttle to 4–10 fps
- drop frames when busy
- no JS full-frame pixel loops
- no frame backlog
- no backend
- no cloud AI
