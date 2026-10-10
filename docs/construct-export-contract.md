# Norma Construct Export Contract (PR6)

The camera's `CONSTRUCT` action opens a URL on `https://norma.science/app` so
Construct can offer a photo import primed with canon context. The photo file
itself never rides the URL — it travels only through the system share sheet,
chosen by the user. Nothing is uploaded by norma-camera.

## URL shape

```txt
https://norma.science/app
  ?construct_import=1
  &canon=<thirds|phi|root2|diagonals>
  &score=<0..100 integer>
  &label=<url-encoded state label, e.g. SUBJECT%20ON%20LEFT%20PHI>
  &captured_at_ms=<unix epoch milliseconds>
```

Source of truth: `src/capture/constructExport.ts` (`constructExportUrl`),
covered by `src/capture/__tests__/constructExport.test.ts`.

## What norma-square needs to implement (separate repo)

On `construct_import=1`: show an import affordance (file picker / drop zone),
pre-select the armature matching `canon`, and surface `score` + `label` as the
capture's provenance note. Canon id mapping to armature catalogue ids:

| camera canon | norma-square armature |
|---|---|
| `thirds` | `rule-of-thirds` |
| `phi` | `golden-ratio` |
| `root2` | `root-2-rectangle` |
| `diagonals` | `cross-diagonal` |

## Shared-file metadata

Burned-in shares are named `norma-<canon>-<score>-<capturedAtMs>.jpg`
(`burnInFileName`), so the canon context survives the share even without the
URL hand-off.
