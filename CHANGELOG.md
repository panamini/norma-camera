# CHANGELOG

## 2026-05-02

### Added
- Active-memory retrieval contract using `wiki/hot.md` as the first lightweight context cache.
- Query modes: `quick`, `standard`, and `deep`.
- `AGENTS.md` compatibility shim for agents that bootstrap from `AGENTS.md`.
- `.claude-plugin/plugin.json` and `.claude-plugin/marketplace.json` files expected by the validator.
- README agent prompt for using the wiki as memory.
- `scripts/init_vault.py` to initialize a Norma Camera Wiki-compatible vault and optional sample source.
- `llms.txt` as a compact discovery map for generic LLM agents.

### Changed
- Updated `WIKI_SCHEMA.md`, `CLAUDE.md`, and `skills/ingest-wiki/SKILL.md` to read `wiki/hot.md` before broader wiki retrieval.
- Mutation verification now includes updating `wiki/hot.md` after persistent wiki changes.
- README now documents the initialization command and smoke-test flow.
- Initialized vaults now receive `llms.txt` alongside `WIKI_SCHEMA.md`, `AGENTS.md`, and `CLAUDE.md`.

### Not changed
- `CLAUDE.md` remains the write-time source of truth.
- `wiki/index.md` and `wiki/log.md` remain canonical control-plane files.
- `wiki/hot.md` is explicitly non-canonical and must stay under 500 words.

## 2026-04-17

### Added
- Hybrid `CLAUDE.md` that preserves twoweeks workflow rules and adds Karpathy behavior gates.
- Hybrid `WIKI_SCHEMA.md` that keeps discovery neutral and points behavior to `CLAUDE.md`.
- Upgraded `skills/ingest-wiki/SKILL.md` with preflight, ambiguity handling, minimal-change rules, and mode-specific verification.
- `EXAMPLES.md` with wiki-specific examples for the four Karpathy principles.
- `.claude-plugin/plugin.json` and `.claude-plugin/marketplace.json` for portability.
- `audit/hybrid-audit-report.md` with benchmark findings and implementation notes.
- `audit/benchmark-matrix.csv` with weighted scoring.
- `scripts/validate_hybrid.py` and `scripts/score_benchmark.py` for reproducibility.
- `references/` folder containing the baseline source materials used for comparison.
- `diffs/` folder with unified diffs.

### Changed
- Reframed twoweeks from a pure mutation contract into a mutation contract plus execution discipline layer.
- Added explicit completion criteria to all operational modes.
- Added a “smallest safe change” rule to avoid unnecessary page creation or cleanup.

### Not changed
- Core twoweeks taxonomy, page frontmatter contract, retrieval order, archive model, and index/log requirements.
- Core Karpathy four-principle model.
