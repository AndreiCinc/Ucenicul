# Repository Structure

## Why this structure

The repository is organized to be immediately understandable to someone seeing it for the first time on GitHub. Each directory has a clear purpose, and every directory contains a README explaining what belongs there.

## Directory guide

### Root files

- `README.md` — Project overview, setup, architecture summary
- `CLAUDE.md` — Instructions for Claude Code when working in this repo
- `.env.example` — Template for environment variables (never real values)
- `.gitignore` — Excludes secrets, build artifacts, personal settings

### `.claude/skills/`

Claude skill definitions used during development. These are project-scoped skills that enforce architectural consistency, quality standards, and development workflow.

There are two categories:
- **Development skills** (12): orchestrator, system-architect, business-analyst, sql-architect, n8n-architect, n8n-workflow-builder, pgvector-architect, prompt-engineer, telegram-architect, railway-devops, gdpr-advisor, integration-validator
- **Repo utility skills** (4): repo-architect, n8n-auditor, readme-writer, env-sanitizer

### `src/brain/`

The brain contract and parser — the core logic that governs how the LLM's output is validated and processed.

- `brain_contract.json` — Single source of truth for all intents, fields, and rules
- `parse_contract.js` — Validation logic that runs in n8n after the LLM call

### `workflows/`

Exported n8n workflow JSON files. All workflows are sanitized before commit (credentials replaced, execution data removed). See `workflows/README.md` for naming conventions and documentation guidelines.

### `migrations/`

SQL migration files, numbered sequentially. Run in order against PostgreSQL.

### `db/`

Database documentation: schema descriptions, migration guides, and design notes. Not the actual SQL files (those are in `migrations/`).

### `testing/`

Test suites for workflow validation, cross-artifact consistency, and Telegram pipeline simulation. Plain Node.js — no test framework.

### `docs/`

Project documentation for human readers: architecture decisions, this file, and portfolio presentation notes.

## Adding new files

When adding a new file, follow this checklist:

1. Does it belong to an existing directory? Put it there.
2. Does it contain secrets? It goes in `.env.example` as a placeholder, the real value in `.env` (gitignored).
3. Is it an n8n workflow export? Sanitize first, then put in `workflows/`.
4. Is it a SQL migration? Number it and put in `migrations/`.
5. Is it documentation? Put in `docs/`.
6. Is it generated or temporary? Add to `.gitignore`.

## What not to commit

- `.env` files with real credentials
- n8n workflow JSON with real credential IDs
- Personal Claude settings or plugin files
- Database dumps or backups
- Node modules or build artifacts
- Internal working documents (PROJECT_MASTER.md, PROGRESS_LOG.md, DECISIONS.md)
