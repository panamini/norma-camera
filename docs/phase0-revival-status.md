# Phase 0 — Toolchain Revival Status (2026-10-10)

Repo dormant since 2026-06-11 (`1c3e3d6`, PR4.10 merge). Revival executed on a clean worktree.

## What still builds

- `npm install`: clean, 669 packages, no peer conflicts (one benign deprecation warning: transitive `uuid@7`).
- `npm test`: **169/169 pass** across 21 files (vitest 4.1.5, 417 ms).
- `npm run typecheck`: clean (tsc 5.9, strict).
- `npx expo config --type introspect`: exits 0, config valid (Expo SDK 55, new architecture enabled).

## What rotted

Nothing. No dependency, config, or API rot detected. The June lockfile resolves and the full validation trio from `docs/v1-engine-validation.md` is green.

## Environment readiness (USB dev-client flow)

- `adb` 37.0.0 on PATH (`/opt/homebrew/bin/adb`), daemon starts.
- Android SDK present at `~/Library/Android/sdk` (build-tools, ndk, cmake). `ANDROID_HOME` is unset — not a blocker: `scripts/u.sh` falls back to the default SDK path and `expo run:android` auto-detects it.
- JDK 17 (Homebrew OpenJDK 17.0.19).
- `scripts/u.sh` / `scripts/d.sh` reviewed: correct, robust (device selection, port 8081 cleanup, adb reverse).
- `android/` is gitignored (CNG): `npm run android` regenerates it and embeds `modules/frame-analysis`.

## Exact blockers

Only the physical-device steps, which are the owner's:

1. Plug the Pixel in (USB debugging on, state `device` in `adb devices`).
2. `npm run android` once to rebuild the dev-client with the native module.
3. Run the manual checklist in `docs/v1-engine-validation.md` (§ Manual Android checks).

Everything else is prepared; no environment fix is required before those steps.
