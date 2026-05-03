# modules/frame-analysis

Status in this branch: **scaffold only**.

The app includes TypeScript contracts and UI wiring for `native-heuristic` mode, but no native Android frame processor is compiled yet.

## Intended V0.3A native heuristic

```text
frame
  -> native Android frame-analysis plugin
  -> Y plane / luminance only
  -> downsample to 96x72 or 128x96
  -> exposure stats
  -> sharpness / edge energy
  -> contrast/saliency candidate
  -> optional horizontal line diagnostic
  -> compact normalized result to JS
```

## Output contract

```ts
type NativeFrameAnalysisResult = {
  status: 'unavailable' | 'ready' | 'low-confidence' | 'error';
  createdAtMs: number;
  subject: NativeSubjectCandidate | null;
  lineCandidate?: NativeLineCandidate | null;
  exposure: NativeExposureMetrics | null;
  sharpness: NativeSharpnessMetrics | null;
  explanation: string;
  analysisFps?: number;
};
```

## Safety constraints

- latest-frame-only
- throttle to 4–10 fps
- drop frame if analyzer is busy
- never queue frames
- no full-frame copy into JS
- no JS pixel loops
- no backend
- no cloud AI
- no ML Kit in V0.3A
- no Google Play Services dependency

## Suggested Android algorithm

1. Read Y plane from the camera frame.
2. Downsample luminance into a small grid.
3. Exposure:
   - mean luminance
   - clipped highlight ratio
   - crushed shadow ratio
   - score 0–100
4. Sharpness:
   - variance of Laplacian or Sobel-like edge energy
   - score 0–100
5. Subject candidate:
   - local contrast / gradient magnitude
   - center-weighted visual mass
   - coarse bbox from high-energy cells
   - confidence from energy concentration and bbox size
6. Optional line diagnostic:
   - horizontal-gradient accumulator
   - return only if confidence is meaningful

## Native module name expected by JS scaffold

The current JS hook looks for:

```ts
NativeModules.NormaFrameAnalysis?.getLatestAnalysis()
```

That is intentionally a future adapter contract. It is not present in this scaffold branch.
