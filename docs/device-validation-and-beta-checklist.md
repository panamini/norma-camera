# Device Validation + Internal Beta Checklist (owner steps)

Everything below needs the Pixel. The toolchain is ready
(see `phase0-revival-status.md`); start at step 1.

## 1. Rebuild the dev-client (new native deps: haptics, sharing, file-system)

```bash
adb devices            # state must be `device`
npm run android        # regenerates android/, embeds modules/frame-analysis
```

Then the usual two-terminal flow: `npm run u` / `npm run d`.

## 2. Engine regression (unchanged behavior, from v1-engine-validation.md)

- app opens; camera preview opens
- MANUAL tap works; AUTO shows native visual mass or the honest
  `unavailable · manual fallback` state
- visual mass box appears when native candidate is active
- line signal stable enough; no stale candidate stuck forever
- ARM behavior unchanged, capture works
- background/foreground and camera reopen do not crash
- `···` → placeholder and sim detector still reachable; debug presets
  (normal / mass / lines / mixed) and panels still work

## 3. Harmony viewfinder (new, PR5)

- ten-second test: hand the phone to someone fresh — do they understand the
  lines, the glowing points, and the arc without explanation?
- canon switching: Thirds · Phi · Root 2 · Diagonals redraw correctly in
  portrait and both landscapes; selection haptic ticks
- nodes glow as the subject approaches; full lock lights the node, fills the
  arc past the ready ramp, and ticks once (no repeat ticking while held)
- status strip: canon tag, honest state word, score, WHY? opens the sheet;
  instruction line shows when there is no candidate
- why sheet: reading, breakdown, nearest guide, evidence wording, canon
  description, subjectivity note — all render; CLOSE and back both dismiss
- ARM on: conservative armed copy appears under the strip; auto-capture still
  gates exactly as before
- subject marker eases (no 4 fps jumping); arc fills smoothly
- FPS: no visible stutter on the camera preview with nodes + arc active

## 4. Capture flow (new, PR6)

- capture → toast `CAPTURED · <score>`; thumbnail appears bottom-left
- gallery: grid, newest first, canon glyph + score tags, empty state before
  first capture, privacy line visible
- review: photo contain-fitted; CANON toggle draws the construction exactly
  over the image (check portrait and landscape captures — EXIF rotation!)
- SHARE hands the original to the share sheet
- `+ CANON` renders and shares the burned copy (inspect: lines + ticks drawn,
  readable, original untouched); repeated use re-renders without error
- CONSTRUCT opens norma.science with canon/score/label/captured_at_ms in the
  URL and nothing else

## 5. Stability session (Phase 3 gate)

- 20-minute continuous viewfinder session in AUTO, ARM off: watch for FPS
  collapse, thermal warning, battery drain outliers; note start/end battery %
- 10 captures + 5 burn-in shares in one session: no memory crash

## 6. Play internal track (decisions + steps, owner)

- **DECIDE: application id.** `com.anonymous.normacamera` is permanent after
  first upload. Recommended: change `android.package` (e.g.
  `science.norma.camera`) BEFORE the first Play upload — this invalidates the
  installed dev-client once (one extra `npm run android`).
- Host `docs/privacy-policy.md` at a public URL (e.g.
  norma.science/camera/privacy) and link it in the listing.
- Play Console: create app, internal testing track, Play App Signing,
  upload an `.aab` (`eas build -p android --profile production` or
  `cd android && ./gradlew bundleRelease` after prebuild), listing copy from
  `store-listing.md`, data-safety answers from the same file.
- Testers: add by email, roll out.

## Current automated status (pre-device)

- `npm test` 202/202 · `npm run typecheck` clean · `npx expo config --type
  introspect` passes (2026-10-10, PR5.0–PR6.3).
