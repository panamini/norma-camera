# Norma Camera Wiki

A portable hybrid wiki contract for LLM-active memory, durable knowledge bases, and careful agent-driven mutations.

## What this project is

This package is built from two source systems:

- **twoweeks-wiki**: strong at durable knowledge architecture, ingest/lint/save-output workflows, index/log discipline, and retrieval order
- **forrestchang/andrej-karpathy-skills**: strong at behavioral execution — think before coding, simplicity first, surgical changes, and goal-driven verification

Norma Camera Wiki keeps the twoweeks control plane, adds the Karpathy behavior shim, and introduces a lightweight active-memory entrypoint through `wiki/hot.md`.

## Start here

When installing Norma Camera Wiki into a vault:

1. Initialize a vault:

   ```bash
   python3 scripts/init_vault.py /path/to/vault
   ```

2. Read `WIKI_SCHEMA.md` for neutral discovery.
3. Read `AGENTS.md` or `CLAUDE.md` for write-time mutation and verification rules.
4. For project context, read `wiki/hot.md` first, then `wiki/index.md`, then only the relevant canonical pages.
5. Keep `wiki/hot.md` under 500 words. It is a cache, not a journal.

Smoke-test a new vault with a staged markdown file:

```bash
python3 scripts/init_vault.py /tmp/norma-camera-wiki-vault --with-sample
```

Then ask your agent:

```text
Use the ingest-wiki skill. Ingest rawinput/norma-camera-wiki-sample.md into this vault.
```

Agent prompt:

```text
Use the wiki as memory. For project context, check wiki/hot.md first, then wiki/index.md, then only the relevant canonical pages.
```

## Agent-ready entrypoints

Norma Camera Wiki ships one compact entrypoint per agent family:

| Agent | Start file | Purpose |
| --- | --- | --- |
| Codex and AGENTS-aware tools | `AGENTS.md` | Routes to the canonical contract without duplicating rules. |
| Claude Code | `CLAUDE.md` | Canonical write-time contract for mutations and verification. |
| Generic LLM agents | `llms.txt` | Short discovery map with the highest-value files and commands. |

`llms.txt` is intentionally small. It points agents to the real contracts; it does not create a second source of truth.
Vaults initialized with `scripts/init_vault.py` receive a vault-specific `llms.txt` that only links to files present in that vault.

## Minimal vault shape

Norma Camera Wiki is a contract package, not a pre-filled vault. A user vault should contain:

```text
vault/
├── WIKI_SCHEMA.md
├── llms.txt
├── CLAUDE.md
├── AGENTS.md
├── rawinput/
├── raw/
├── skills/
│   └── ingest-wiki/
│       └── SKILL.md
└── wiki/
    ├── hot.md
    ├── overview.md
    ├── index.md
    ├── log.md
    ├── sources/
    ├── outputs/
    └── archive/
```

`wiki/hot.md` should be created as an overwrite-only cache under 500 words. It should point agents to canonical pages; it should not become a second source of truth.

## Why this merge works

The two source projects solve different problems:

| Layer | twoweeks | Karpathy repo | Hybrid result |
| --- | --- | --- | --- |
| Discovery/schema | Strong | Minimal | Strong |
| Mutation workflow | Strong | Minimal | Strong |
| Ambiguity handling | Weak | Strong | Strong |
| Simplicity guardrails | Weak | Strong | Strong |
| Surgical diffs | Medium | Strong | Strong |
| Verification loop | Medium | Strong | Strong |
| Examples/onboarding | Minimal | Strong | Strong |
| Plugin portability | Minimal | Strong | Strong |

## Delivered files

- `CLAUDE.md` — merged operating contract
- `AGENTS.md` — compatibility shim for agents that bootstrap from AGENTS.md
- `llms.txt` — compact discovery map for generic LLM agents
- `WIKI_SCHEMA.md` — neutral discovery contract
- `skills/ingest-wiki/SKILL.md` — upgraded skill with explicit preflight and verification
- `scripts/init_vault.py` — initializes a clean Norma Camera Wiki-compatible vault
- `EXAMPLES.md` — hybrid examples adapted to wiki mutations
- `.claude-plugin/` — plugin metadata for portability
- `audit/` — benchmark matrix, audit report, validation output
- `references/` — preserved baseline files from both source projects
- `diffs/` — text diffs from twoweeks baseline to the hybrid

## Quick recommendation

Use the hybrid if your goal is not just “store project knowledge,” but “operate on project knowledge like a careful senior engineer.”
