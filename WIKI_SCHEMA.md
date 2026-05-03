# WIKI_SCHEMA.md

This file is the neutral discovery contract for the hybrid wiki/coding-agent project.

Keep this file stable and tool-agnostic.
Use it for discovery, path conventions, and retrieval order.
Use `CLAUDE.md` for write-time behavior, mutation rules, and execution discipline.

## Vault contract

A valid hybrid vault has:

- `wiki/hot.md`
- `wiki/index.md`
- `wiki/log.md`
- `wiki/overview.md`
- `rawinput/`
- `raw/`
- `CLAUDE.md`

Optional:

- `wiki/timeline.md`
- `wiki/tasks/`
- `WIKI_SCHEMA.md`
- `llms.txt`
- `skills/`
- `.claude-plugin/`

## Read order

1. `WIKI_SCHEMA.md` if present
2. `CLAUDE.md` if present
3. `wiki/hot.md` if present
4. `wiki/overview.md`
5. `wiki/index.md`
6. recent entries from `wiki/log.md`
7. inspect `rawinput/` when ingest, lint, or repo-health work is relevant

## Write rule

- Read-only tooling may operate with `WIKI_SCHEMA.md` alone.
- Mutating workflows must also read `CLAUDE.md`.
- If both exist, `WIKI_SCHEMA.md` defines neutral vocabulary and `CLAUDE.md` defines operational behavior.

## System files

- `wiki/hot.md` — short active memory cache for LLM retrieval; non-canonical and overwrite-only
- `wiki/index.md` — catalog of active and planned pages
- `wiki/log.md` — chronological mutation log
- `wiki/overview.md` — current project summary
- `wiki/timeline.md` — optional project timeline
- `rawinput/` — staging area for new sources
- `raw/` — immutable ingested source library

## Page classes

### Durable pages

| Category | Directory |
| --- | --- |
| `entity` | `wiki/entities/` |
| `concept` | `wiki/concepts/` |
| `design` | `wiki/design/` |
| `product` | `wiki/product/` |
| `strategy` | `wiki/strategy/` |
| `tech` | `wiki/tech/` |
| `howto` | `wiki/howto/` |
| `meta` | `wiki/meta/` |

### Support pages

| Category | Directory | Purpose |
| --- | --- | --- |
| `source` | `wiki/sources/` | summary of an ingested source |
| `output` | `wiki/outputs/` | saved answer, audit, analysis, or report |
| `task` | `wiki/tasks/` | operational backlog and execution tracking |
| `overview` | system files | control-plane and navigation pages |

## Path rules

- Durable pages use a category directory and a kebab-case slug.
- Source pages use `wiki/sources/YYYY-MM-DD-<slug>.md`.
- Output pages use `wiki/outputs/YYYY-MM-DD-<slug>.md`.
- Archived pages mirror the live path under `wiki/archive/`.

## Retrieval priority

0. `wiki/hot.md` for active context and candidate canonical pages
1. Durable pages with `status: current`
2. Durable pages with `status: planned` when the question is future-oriented
3. Source pages for corroboration or newly ingested details not yet merged
4. Output pages only when the user asks for prior analyses or audits
5. Archived or deprecated pages only for historical questions

Do not duplicate workflows, examples, or behavioral rules here.
