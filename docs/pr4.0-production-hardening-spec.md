# PR4.0 — Production Hardening Spec

Status: planned  
Repository: `panamini/norma-camera`  
Created: 2026-06-11  
Purpose: implementation plan for the next hardening pass after the PR3 feature stack.

---

## 1. Current verified state

PR3 feature work is complete and merged into `main`.

```txt
✅ PR3.3 — Horizontal-line composition contribution
✅ PR3.4 — Composition Breakdown Overlay
✅ PR3.4b — Line Signal Stability Guardrail
✅ PR3.5 — Capture Readiness Calibration
⬜ PR4.0 — Production Hardening
```

GitHub state to verify before starting implementation:

```txt
#18 PR3.4b: closed + merged
#17 PR3.5: closed + merged
```

The current feature stack includes:

```txt
live luminance
live sharpness
native visual mass candidate
candidate confidence
guide score
horizontal-line contribution
composition breakdown
line signal stabilization
capture readiness calibration
```

PR4.0 must not add new product features. It is a release-candidate hardening pass.

---

## 2. PR4.0 objective

Prepare `norma-camera` for a stable release-candidate pass by auditing and hardening the current stack.

The goal is:

```txt
audit
cleanup
stability
UX wording consistency
documentation accuracy
test coverage
release-candidate validation
```

PR4.0 should make the existing system more reliable and easier to trust. It should not change the product direction, detection strategy, composition formula, auto-capture behavior, or native frame pipeline.

---

## 3. Exact scope

Audit and harden these areas:

```txt
native Android frame-analysis code
native result stores
JS/native adapters
composition scoring
line signal retention and scoring
capture readiness copy
overlays
debug paths
docs
tests
stability checklist
Android local validation notes
```

This PR should be limited to:

```txt
cleanup
obvious bugfixes
missing tests
wording consistency
documentation updates
release-candidate validation notes
small stability guardrails only when clearly justified
```

---

## 4. Strict non-goals

Do not add:

```txt
new detector
new composition scoring formula
new guide system
new ratio pack
Norma Core extraction
OpenCV
ML Kit
AI model
object/person/face detection
new Nitro bridge
new VisionCamera frame pipeline
JS pixel processing
backend/cloud inference
auto-capture behavior change
large refactor
new dependency
```

Do not change:

```txt
auto-capture decision semantics
capture trigger behavior
native frame-analysis architecture
composition threshold behavior
line contribution formula
manual fallback behavior
GrapheneOS-first constraints
```

If a finding suggests a large refactor, document it as future work instead of implementing it in PR4.0.

---

## 5. Files to audit

Read at minimum:

```txt
README.md
docs/detection-roadmap.md
modules/frame-analysis/README.md

src/camera/CameraScreen.tsx
src/camera/CameraControls.tsx

src/composition/types.ts
src/composition/guides.ts
src/composition/scoreFrameComposition.ts
src/composition/scoreExplanation.ts
src/composition/scorePointAgainstGuides.ts
src/composition/useCompositionSharedValues.ts

src/detection/types.ts
src/detection/scoreDetectedComposition.ts
src/detection/nativeHeuristicTypes.ts
src/detection/nativeHeuristicAdapter.ts
src/detection/nativeHeuristicDebug.ts
src/detection/nativeLineDiagnosticRetention.ts
src/detection/nativeLineDiagnosticOverlay.ts
src/detection/lineGuideScore.ts
src/detection/useNativeHeuristicCandidate.ts
src/detection/selectCompositionCandidate.ts
src/detection/normaFrameAnalysisPlugin.ts

src/autocapture/decideAutoCapture.ts
src/autocapture/createAutoCaptureController.ts
src/autocapture/captureReadinessText.ts
src/autocapture/types.ts

src/overlay/ScoreBadge.tsx
src/overlay/CompositionOverlay.tsx
src/overlay/GuideLines.tsx
src/overlay/HorizontalLineDiagnostic.tsx
src/overlay/CandidateBounds.tsx
src/overlay/SubjectMarker.tsx

src/state/cameraUiStore.ts

modules/frame-analysis/android/src/main/java/com/normacamera/frameanalysis/**
modules/frame-analysis/android/src/main/cpp/**

package.json
tsconfig.json
app.json
```

If a file does not exist locally, mark it as `to verify` instead of inventing it.

---

## 6. Audit checklist

Check for:

```txt
dead code
obsolete comments
temporary diagnostics
duplicate state
stale docs
inconsistent wording
uncovered edge cases
stale candidate bugs
line retention bugs
ARM/readiness copy mismatch
debug labels saying diagnostic when signal is now active
docs claiming native module unavailable when it now exists
Android local setup docs that no longer match current scripts
outdated roadmap text after PR3.3–PR3.5
```

Also check:

```txt
candidate disappears cleanly when native analysis becomes stale
line signal does not stay stuck forever
retained line cannot keep extending its own retention window
manual fallback still overrides native mode correctly
native unavailable/error states remain honest
quality labels distinguish real native values from stubs
capture readiness copy does not imply capture will happen when gates fail
composition breakdown matches the actual score inputs
```

---

## 7. Known review focus from PR3.5

PR3.5 was merged as a display-only readiness calibration, with no auto-capture, scoring, native pipeline, or trigger behavior changes.

The next hardening pass should specifically review the readiness text branches around idle decision reasons.

Focus areas:

```txt
captureReadinessLine idle decision branches
motion too high
cooldown active
scene unchanged
sharpness below threshold
exposure below threshold
stale native analysis display window
inline import style in autocapture types, if still present
```

Expected PR4.0 action:

```txt
add missing tests if branches are uncovered
fix wording only if misleading
avoid changing decision logic
```

---

## 8. Changes allowed

Allowed changes:

```txt
remove dead code
remove obsolete comments
rename misleading debug copy
update docs
add missing tests
clean obsolete roadmap text
fix tiny bugs found during audit
deduplicate obvious local state only if safe
clarify Android validation limitations
clarify native module status
clarify real-vs-stub quality labels
```

Allowed test additions:

```txt
capture readiness text edge cases
line retention regressions
score explanation formatting
native adapter unavailable/error/stale states
manual fallback behavior
no-candidate behavior
composition breakdown display data
```

Allowed documentation updates:

```txt
README startup flow
detection roadmap current state
modules/frame-analysis status
manual Android checklist
known environment blockers
release-candidate checklist
```

---

## 9. Changes forbidden

Forbidden changes:

```txt
large architecture changes
new scoring formula
native detector rewrite
new native bridge
new dependencies
OpenCV integration
ML Kit integration
object detection claims
face/person/object labels
backend/cloud inference
JS pixel loops
auto-capture trigger rewrite
capture decision semantic changes
Norma Core extraction
ratio-pack system implementation
```

---

## 10. Likely files to modify

Do not modify all audited files by default. Modify only files where the audit finds a concrete issue.

Likely safe modification targets:

```txt
README.md
docs/detection-roadmap.md
modules/frame-analysis/README.md
src/autocapture/captureReadinessText.ts
src/autocapture/__tests__/captureReadinessText.test.ts
src/autocapture/types.ts
src/detection/__tests__/nativeLineRetention.test.ts
src/detection/nativeHeuristicDebug.ts
src/detection/nativeLineDiagnosticRetention.ts
src/overlay/ScoreBadge.tsx
src/camera/CameraScreen.tsx
```

Higher-risk files. Avoid unless there is a clear bug:

```txt
src/autocapture/decideAutoCapture.ts
src/composition/scoreFrameComposition.ts
src/detection/scoreDetectedComposition.ts
src/detection/useNativeHeuristicCandidate.ts
modules/frame-analysis/android/src/main/java/com/normacamera/frameanalysis/**
```

Do not touch without strong reason:

```txt
package.json
package-lock.json
app.json
native build files
VisionCamera frame output wiring
```

---

## 11. Required implementation process

Before editing anything, the implementer must respond with:

```txt
1. exact scope
2. likely files involved
3. what must not change
4. acceptance criteria
5. risks
6. step-by-step plan
```

Then proceed in this order:

```txt
1. Start from main.
2. Create a new branch.
3. Run baseline checks.
4. Audit docs and code.
5. List findings by severity.
6. Patch only in-scope hardening items.
7. Add or update tests.
8. Run validation.
9. Update docs with exact current state.
10. Produce final PR summary and manual checklist.
```

Branch setup:

```bash
git checkout main
git pull --ff-only
git checkout -b pr4.0-production-hardening
```

---

## 12. Required validation

Run:

```bash
npm test
npm run typecheck
npx expo config --type introspect
npm run android
```

If Android validation is blocked, document the exact blocker. Examples:

```txt
ANDROID_HOME missing
android/local.properties missing
Android SDK unavailable
no connected device
adb unauthorized
Gradle cache unavailable
native build blocked by local environment
```

Do not hide Android failures. Distinguish clearly between:

```txt
code failure
environment failure
manual validation not performed
manual validation passed
```

---

## 13. Manual Android release-candidate checklist

Check on device:

```txt
app opens
camera permission flow works
camera preview opens
manual mode works
auto-placeholder works
simulated detector works
native-heuristic mode works
native unavailable state is honest when module unavailable
native low-confidence state is honest when no strong candidate exists
visual mass box appears when candidate exists
subject marker appears when candidate exists
score visible
composition breakdown visible
line signal appears only when stable enough
line signal does not get stuck forever
readiness text stays conservative
ARM behavior unchanged
capture behavior unchanged
capture works
no obvious FPS collapse
no repeated per-frame logs
background/foreground does not crash
camera reopen does not crash
mode switching clears stale state correctly
manual fallback overrides native mode correctly
```

---

## 14. Acceptance criteria

PR4.0 is acceptable when:

```txt
no new feature was added
no scoring behavior changed unless a documented bugfix required it
no auto-capture trigger behavior changed
all tests pass
TypeScript passes
Expo config introspection passes
Android run is either validated or blocked with a precise environment reason
docs reflect the current native/line/readiness state
readiness text has coverage for important branches
line retention invariants remain covered
manual fallback remains safe
native unavailable/error/stale states remain honest
release-candidate checklist is included in PR notes
```

---

## 15. PR summary template

Use this PR description:

```md
# PR4.0 — Production Hardening

## Goal

Release-candidate hardening pass after PR3.3, PR3.4, PR3.4b, and PR3.5.

No new product feature is introduced.

## Scope

- audit docs/code for stale state and misleading wording
- add missing tests for hardening paths
- clean obsolete diagnostics/comments where safe
- clarify native validation state
- preserve current detection/scoring/capture behavior

## Non-goals

- no new detector
- no new scoring formula
- no OpenCV / ML Kit / AI model
- no native pipeline rewrite
- no auto-capture behavior change
- no Norma Core extraction

## Validation

- [ ] npm test
- [ ] npm run typecheck
- [ ] npx expo config --type introspect
- [ ] npm run android, or documented local blocker

## Manual Android checklist

- [ ] app opens
- [ ] camera preview opens
- [ ] manual mode works
- [ ] auto-placeholder works
- [ ] simulated detector works
- [ ] native-heuristic works
- [ ] visual mass box appears when expected
- [ ] score visible
- [ ] composition breakdown visible
- [ ] line signal stable enough
- [ ] readiness text conservative
- [ ] ARM behavior unchanged
- [ ] capture works
- [ ] no obvious FPS collapse
- [ ] no stale line/candidate stuck forever
- [ ] background/foreground does not crash
- [ ] camera reopen does not crash
```

---

## 16. Prompt for implementer

```md
RÔLE
Tu es un senior engineer prudent, release engineer et technical lead.

OBJECTIF
Préparer PR4.0 — Production Hardening pour `panamini/norma-camera`.

Contexte :
PR3.3, PR3.4, PR3.4b et PR3.5 sont mergées dans `main`.

La feature stack est maintenant complète :
- live luminance
- live sharpness
- native visual mass candidate
- confidence
- guide score
- horizontal-line contribution
- composition breakdown
- line signal stabilization
- capture readiness calibration

PR4.0 ne doit pas ajouter de nouvelle feature.
PR4.0 doit transformer le prototype en release candidate stable.

Avant de modifier quoi que ce soit, réponds avec :
1. scope exact
2. fichiers à modifier probables
3. ce qui ne doit pas changer
4. risques
5. critères d’acceptation
6. plan étape par étape

Ensuite seulement, implémente.

Règles strictes :
- ne pas ajouter de détecteur
- ne pas changer le scoring
- ne pas changer les décisions auto-capture
- ne pas changer le trigger capture
- ne pas ajouter OpenCV, ML Kit, AI model, backend ou cloud inference
- ne pas faire de large refactor
- ne pas extraire Norma Core dans ce PR

Validation obligatoire :
- npm test
- npm run typecheck
- npx expo config --type introspect
- npm run android, ou documenter précisément le blocker local
```

---

## 17. Future note: Norma Core

PR4.0 is not the Norma Core extraction PR.

However, during the audit, it is acceptable to document places where future Norma Core extraction will matter, especially:

```txt
src/composition/types.ts
src/composition/guides.ts
src/composition/scorePointAgainstGuides.ts
src/composition/scoreFrameComposition.ts
src/detection/types.ts
src/detection/scoreDetectedComposition.ts
src/overlay/GuideLines.tsx
src/camera/CameraScreen.tsx
```

Do not implement the extraction here.

Future direction:

```txt
src/composition/* should gradually become or delegate to src/norma-core/*
src/detection/* should become camera evidence adapters
src/overlay/* should render guide sets and evidence overlays
src/camera/* should orchestrate the live camera client
```
