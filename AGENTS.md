# AGENTS.md - Norma Camera Wiki compatibility shim

This repository keeps its canonical write-time contract in `CLAUDE.md`.

Read `WIKI_SCHEMA.md` first for neutral discovery.
Then read `CLAUDE.md` for mutation rules, verification, and the hybrid wiki/code overlay.
For any task that needs project context, treat `wiki/hot.md` as the first active-memory cache before opening broader wiki pages when that file exists.
In package/template contexts where `wiki/hot.md` is absent, continue with `WIKI_SCHEMA.md` and `CLAUDE.md`.

This file exists for tools that bootstrap from `AGENTS.md`.
It intentionally adds no competing rules beyond routing to the canonical contract.
