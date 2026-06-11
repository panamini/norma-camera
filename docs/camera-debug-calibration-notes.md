# Camera Debug Calibration Notes

PR4.10 records real-device observations after PR4.9 debug overlay preset tuning. This is a calibration report only: it does not change algorithms, native code, overlay behavior, scoring, readiness text, capture triggers, dependencies, or the frame pipeline.

## Current Debug Presets

### `normal`

- Shows: the clean camera composition surface, without heavy debug evidence.
- Hides: visual mass heatmap, legacy `LINE SIGNAL`, `LINE SEGMENT SPIKE`, and native debug text.
- Use: normal camera review and non-debug composition checks.
- Misinterpretation risk: if an issue only appears in debug evidence, `normal` may look correct because the noisy evidence is intentionally hidden.

### `mass`

- Shows: mapped visual-mass heatmap, visual-mass candidate context, and native debug text.
- Hides: legacy `LINE SIGNAL` and `LINE SEGMENT SPIKE`.
- Use: isolating contrast/luminance mass without line overlays covering the same scene.
- Misinterpretation risk: visual mass is not object detection. The label must remain `CONTRAST MASS · NOT OBJECT DETECTION`, and broad heatmap regions should not be treated as recognized subjects.

### `lines`

- Shows: legacy `LINE SIGNAL`, mapped `LINE SEGMENT SPIKE`, and native debug text.
- Hides: visual mass heatmap.
- Use: calibrating line evidence against visible physical edges without mass heatmap interference.
- Misinterpretation risk: legacy line signal and line segment spike are separate evidence sources. They can disagree, and a visible segment does not mean the frame has a valid subject or should become capture-ready.

### `mixed`

- Shows: visual mass, legacy line signal, line segment spike, and native debug text together.
- Hides: no major debug overlay family.
- Use: explicit combined inspection when comparing debug evidence sources.
- Misinterpretation risk: the view is intentionally dense. It is useful for comparison, not for normal composition review, and must not become the default mode.

## Device Observations

### Lines Preset

- `LINE SEGMENT SPIKE` can follow simple real edges.
- Useful observed targets include keyboard edges, table edges, books, screens, and window frames.
- The overlay remains noisy in cluttered scenes.
- Legacy `LINE SIGNAL` remains visually distinct and can still dominate the view in blue.
- Some spike segments are good calibration evidence; others are opportunistic high-contrast runs.

### Mass Preset

- The heatmap explains contrast and luminance concentration.
- It is useful debug evidence, but it is not an object, person, face, or scene detector.
- The heatmap can be large and coarse.
- The `CONTRAST MASS · NOT OBJECT DETECTION` label should stay visible because this preset is easy to overread as semantic detection.

### Mixed Preset

- The preset is useful for comparing mass, legacy line signal, and line segment spike in one frame.
- It is expected to feel visually loaded.
- It should remain an explicit debug mode and should not be used as the normal composition default.

## What Is Working

- Raw-to-mapped calibration evidence is usable for debug inspection.
- Line segment overlay is visible enough to judge against real device screenshots.
- Debug modes are separated well enough to inspect mass and lines independently.
- Android launch works for the tested post-PR4.9 device flow.
- PR4.9 did not require scoring, readiness, or auto-capture behavior changes.

## Known Limits

- The system has no semantic understanding.
- There is no object, person, face, or scene detection.
- The native luma grid is only 32x24, so subtle objects and exact geometry can be missed.
- Legacy `LINE SIGNAL` and `LINE SEGMENT SPIKE` can disagree.
- Visual mass can miss subtle objects or prefer broad high-contrast regions.
- Noisy scenes produce noisy evidence.
- The no-dependency line segment spike is not OpenCV, HoughLinesP, ML Kit, or a production detector.

## Decision

The no-dependency native line segment spike is useful enough to keep as a debug and calibration tool.

It is not ready to drive scoring, readiness text, capture triggers, or auto-capture.

Do not add OpenCV or HoughLinesP until more calibration evidence shows the no-dependency approach is structurally insufficient, or until the product explicitly needs stronger line detection despite the build and maintenance cost.

## Next Recommendations

1. PR4.11 - Line Segment Debug Preset Polish
   Use only if labels, opacity, or readability still interfere with calibration.
2. PR4.11 - Evaluate OpenCV/HoughLinesP Integration
   Use only if stronger line detection becomes necessary and the no-dependency spike is proven insufficient.
3. PR5.0 - Norma Core Boundary Skeleton
   Use if the camera prototype is stable enough to pause CV iteration and return to the core architecture boundary.

## Validation

Docs-only validation target:

```bash
npm test
npm run typecheck
npx expo config --type introspect
git diff --check
```

Android is not required for this docs-only PR.
