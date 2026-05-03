#!/usr/bin/env python3
from __future__ import annotations

import argparse
import shutil
from datetime import date
from pathlib import Path


ROOT = Path(__file__).resolve().parent.parent

WIKI_DIRS = [
    "archive",
    "concepts",
    "design",
    "entities",
    "howto",
    "meta",
    "outputs",
    "product",
    "sources",
    "strategy",
    "tasks",
    "tech",
]

VAULT_LLMS = """# Norma Camera Wiki Vault

> This vault uses Norma Camera Wiki for LLM-active memory, durable knowledge, and careful agent-driven mutations.

This file is an agent discovery entrypoint for the initialized vault. It is not the write-time source of truth.

Use this order:
1. Read `WIKI_SCHEMA.md` for neutral discovery and path conventions.
2. Read `AGENTS.md` if your agent uses AGENTS instructions.
3. Read `CLAUDE.md` for canonical write-time rules, mutation rules, and verification.
4. Read `wiki/hot.md` first for active memory.
5. Read `wiki/index.md`, then only the relevant canonical pages.

Keep the write path simple:
- `CLAUDE.md` is the canonical write-time contract.
- `wiki/index.md` and `wiki/log.md` are mandatory after mutations.
- `wiki/hot.md` is a non-canonical cache and must stay under 500 words.
- `rawinput/` is staging; `raw/` is immutable after ingest.
- Prefer updating or superseding an existing durable page over creating duplicates.

## Agent Entry Points

- [WIKI_SCHEMA.md](WIKI_SCHEMA.md): neutral vault schema, paths, and retrieval priority.
- [AGENTS.md](AGENTS.md): compatibility shim for Codex and other AGENTS-aware agents.
- [CLAUDE.md](CLAUDE.md): canonical write-time operating contract.
- [skills/ingest-wiki/SKILL.md](skills/ingest-wiki/SKILL.md): ingest, direct-update, lint, and save-output workflow.
- [wiki/hot.md](wiki/hot.md): active-memory cache; read first for project context.
- [wiki/index.md](wiki/index.md): canonical retrieval map.
- [wiki/log.md](wiki/log.md): mutation history.
"""


def write_if_missing(path: Path, content: str) -> None:
    if path.exists():
        return
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(content, encoding="utf-8")


def copy_file(src: Path, dst: Path) -> None:
    dst.parent.mkdir(parents=True, exist_ok=True)
    if dst.exists():
        return
    shutil.copy2(src, dst)


def system_page(title: str, category: str, body: str) -> str:
    today = date.today().isoformat()
    return f"""---
title: "{title}"
category: {category}
status: current
created: {today}
updated: {today}
---

{body}
"""


def init_vault(target: Path, with_sample: bool) -> None:
    target.mkdir(parents=True, exist_ok=True)

    copy_file(ROOT / "WIKI_SCHEMA.md", target / "WIKI_SCHEMA.md")
    write_if_missing(target / "llms.txt", VAULT_LLMS)
    copy_file(ROOT / "CLAUDE.md", target / "CLAUDE.md")
    copy_file(ROOT / "AGENTS.md", target / "AGENTS.md")
    copy_file(
        ROOT / "skills" / "ingest-wiki" / "SKILL.md",
        target / "skills" / "ingest-wiki" / "SKILL.md",
    )

    (target / "rawinput").mkdir(exist_ok=True)
    (target / "raw" / "assets").mkdir(parents=True, exist_ok=True)
    (target / ".claude-plugin").mkdir(exist_ok=True)

    for name in WIKI_DIRS:
        (target / "wiki" / name).mkdir(parents=True, exist_ok=True)

    write_if_missing(
        target / "wiki" / "hot.md",
        system_page(
            "Hot Cache",
            "overview",
            """# Hot Cache

Active memory cache for agents. Keep this page under 500 words.

## Current Focus
- This vault uses Norma Camera Wiki: read `wiki/index.md`, then only the relevant canonical pages.

## Retrieval Map
- Project overview: `wiki/overview.md`
- Canonical page catalog: `wiki/index.md`
- Mutation history: `wiki/log.md`

## Guardrails
- This page is a cache, not canonical truth.
- Update durable pages first; update this page only to keep near-term retrieval cheap.
""",
        ),
    )

    write_if_missing(
        target / "wiki" / "overview.md",
        system_page(
            "Overview",
            "overview",
            """# Overview

This vault was initialized with Norma Camera Wiki.

## Current State
Add the durable project summary here after the first ingest or direct update.
""",
        ),
    )

    write_if_missing(
        target / "wiki" / "index.md",
        system_page(
            "Index",
            "overview",
            """# Index

## Retrieval Map
- Active cache: `wiki/hot.md`
- Overview: `wiki/overview.md`
- Log: `wiki/log.md`

## Durable Pages
No durable pages yet.

## Sources
No sources yet.

## Outputs
No outputs yet.
""",
        ),
    )

    write_if_missing(
        target / "wiki" / "log.md",
        system_page(
            "Log",
            "overview",
            f"""# Log

## {date.today().isoformat()}
- Initialized Norma Camera Wiki vault structure.
""",
        ),
    )

    write_if_missing(
        target / "rawinput" / "README.md",
        """# rawinput

Drop new source files here, then ask an agent to run the `ingest-wiki` ingest workflow.
""",
    )

    if with_sample:
        write_if_missing(
            target / "rawinput" / "norma-camera-wiki-sample.md",
            """# Norma Camera Wiki Sample Source

Norma Camera Wiki should make wiki retrieval cheap enough that agents check the vault before asking broad context questions.

Key points:
- `wiki/hot.md` is the first active-memory read.
- `wiki/index.md` remains the canonical retrieval map.
- `raw/` is immutable after ingest.
- Durable pages should be updated instead of duplicated.
""",
        )


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Initialize a Norma Camera Wiki-compatible wiki vault."
    )
    parser.add_argument("target", help="Target vault directory to create or update.")
    parser.add_argument(
        "--with-sample",
        action="store_true",
        help="Add a small markdown source to rawinput/ for smoke testing.",
    )
    args = parser.parse_args()

    target = Path(args.target).expanduser().resolve()
    init_vault(target, args.with_sample)
    print(f"Initialized Norma Camera Wiki vault at {target}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
