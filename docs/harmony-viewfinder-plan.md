# Phase 1 — Harmony Viewfinder Implementation Plan (2026-10-10)

Product gate: a stranger understands the viewfinder in 10 seconds. Positioning: subjectivity is the product — Norma's canons are openly editorial, classical opinions, visually explained. Pitch protected on every screen: *"Point your camera — Norma shows you when the frame sings, and why."*

## Constraints honored (from `docs/detection-roadmap.md` / `docs/v1-engine-validation.md`)

- No new detector, no scoring-formula churn: `scoreDistanceToGuide` (linear falloff over 0.12), thresholds 82/45, max line contribution +8, centered special case — all unchanged. Canons change **which guides are active** (geometry selection), not how distance becomes score.
- No ML Kit / OpenCV / cloud / JS pixel loops. New UI deps limited to `expo-haptics` (Expo-native, no Play Services, GrapheneOS-safe).
- Latest-frame-only ~4fps analysis untouched. Honest fallback states and conservative readiness copy stay. Manual tap stays first-class. Auto-shutter stays opt-in (ARM default off).

## Engine seam (verified)

The scoring currency is `GuideKind[]` end-to-end (`scoreFrameComposition`, `scoreDetectedComposition`, `scoreHorizontalLineAgainstGuides`, debug text). No test references `OverlayMode`. Extension = widen the `GuideKind` union + extend `ALL_GUIDES` + teach `scorePointAgainstGuides` segment distance with the same formula.

## Canon set (v1) — geometry in normalized frame space

| Canon | Kind | Lines | Nodes (power points) | Exactness |
|---|---|---|---|---|
| Thirds | `third` | x,y at 1/3, 2/3 | 4 intersections | exact |
| Phi | `phi` | x,y at φ⁻² ≈ 0.381966, φ⁻¹ ≈ 0.618034 | 4 intersections | exact |
| Root 2 | `root2` | x,y at 1−1/√2 ≈ 0.292893, 1/√2 ≈ 0.707107 | 4 intersections | exact |
| Diagonals | `diagonal` | both full-frame diagonals (segments) | center + 4 points where diagonals cross the thirds (armature eyes) | canonical (normalized space) |

Line-signal contribution: unchanged formula; it scores the native horizontal line against the active canon's **y-axis** guides — thirds/phi/root2 horizontals participate, diagonals contribute nothing (honest: a horizon is not part of that canon).

Diagonal scoring distance = point-to-segment distance in normalized space, same linear falloff. Documented as normalized-space (aspect-folded) geometry — consistent with every existing normalized-distance decision in the engine.

## PR ladder (each lands with `npm test` + `npm run typecheck` green)

### PR5.0 — Canon engine model
- `src/composition/types.ts`: widen `GuideKind` with `'phi' | 'root2' | 'diagonal'`; add `SegmentGuide` (`axis: 'segment'`, start/end) into `CompositionGuide` union (existing axis shape untouched); add `CanonId`, `CanonNode`, `CanonDefinition`.
- `src/composition/canons.ts` (new): the 4 canon definitions (lines, nodes, display name, glyph, editorial description + honest subjectivity note), `canonById`, `guideKindsForCanon`, `CANON_ORDER`.
- `src/composition/guides.ts`: add `PHI_GUIDES`, `ROOT2_GUIDES`, `DIAGONAL_GUIDES`; extend `ALL_GUIDES`; `guidesForKinds` unchanged in behavior for existing kinds.
- `src/composition/scorePointAgainstGuides.ts`: segment branch — perpendicular/clamped distance to segment, same `scoreDistanceToGuide`.
- `src/composition/scoreExplanation.ts` + `labels.ts`: display names + best-hit labels for new guides; `formatGuideHit` branches on segment guides.
- `src/state/cameraUiStore.ts`: add `canonId` (+ setter), default `'thirds'`; `overlayMode` kept until UI swap (PR5.1/5.2).
- Tests (new): canon geometry values (φ, √2 identities, diagonal endpoints, node positions), segment distance scoring parity, store default, labels.

### PR5.1 — Harmony overlay (replace debug-first rendering)
- `src/overlay/CanonLines.tsx` (new, replaces `GuideLines` usage): Skia polylines for axis + segment guides, always-faint paper hairlines; no amber bar highlight (nodes carry the feedback).
- `src/overlay/CanonNodes.tsx` (new): nodes as small Skia marks that **light up** when the subject shared values sit within guide tolerance — `useDerivedValue` → Skia props (proven Shopify/react-native-skia Reanimated idiom; no React re-render per frame).
- `src/overlay/SubjectMarker.tsx`, `CandidateBounds.tsx`: restyle to brand (thin graphite/paper strokes, mono micro-labels); behavior unchanged.
- `src/overlay/CompositionOverlay.tsx` + `src/camera/CameraScreen.tsx`: wire canon instead of overlay mode; keep debug line/heatmap layers behind existing debug presets untouched.
- Remove `OverlayMode` / `guideKindsForOverlayMode` once nothing references them.

### PR5.2 — Canon selector + resonance arc + branded controls
- `src/camera/CanonSelector.tsx` (new): horizontal lens chips `THIRDS · PHI · ROOT 2 · DIAGONALS` (mono micro-labels, glyphs ⅓ φ √2 ╳), driven by `canonId`.
- `src/overlay/ResonanceArc.tsx` (new): score as an arc around the shutter (Skia path trim `start/end` driven by `compositionScore` shared value); score numeral small + mono inside the "why" affordance.
- `src/camera/CameraControls.tsx`: rebrand (paper/graphite scrim, mono), detection-mode row compacted, ARM stays opt-in with conservative copy, debug presets collapse behind a `·· dev` toggle.
- `src/overlay/ScoreBadge.tsx`: unchanged, but only rendered when debug panels are shown (it becomes the dev readout; the branded UI is the default).

### PR5.3 — "Why" sheet
- `src/overlay/WhySheet.tsx` (new): one tap on the arc/score opens a slide-up panel (Reanimated, no new dep) surfacing `scoreExplanation.ts` output: score breakdown, nearest guide + distance, line contribution, candidate explanation (honest contrast-evidence wording), canon editorial description, and the fixed subjectivity line: *"Norma's canons are editorial choices — classical opinions, openly held. Not objective truth."*

### PR5.4 — Haptic tick + copy audit + docs
- `expo-haptics` dependency; single light tick on node-lock rising edge (score crosses ready threshold with candidate), rate-limited, never on retained/fallback states.
- Copy audit: all states keep conservative wording from the engine docs.
- `docs/detection-roadmap.md`-style PR note + README viewfinder section update.

## Research directive log

- Shopify/react-native-skia `apps/example` (active, first-party): confirmed Reanimated idiom — pass `SharedValue`/`useDerivedValue` directly as Skia props; no `useAnimatedStyle` for canvas work.
- mrousavy/react-native-vision-camera v5 `apps/simple-camera`: current official example app layout (screens/components/hooks split); camera + outputs usage in this repo already matches v5 API.
- Arc: Skia `Path` trim (`start`/`end`) with shared values — standard pattern from Skia docs/examples; no chart lib needed.

## Phase-gate check against the 10-second rule

First open: camera + faint canon lines + 4 glowing-capable nodes + one mono word (canon name) + shutter. Tap canon name → next canon. Subject hits a node → node lights, arc fills, tick. One tap on the arc → why. Nothing else on screen by default.
