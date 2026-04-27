# CLAUDE.md — Ucenicul Pipeline

This file is auto-loaded by Claude Code at session start. It teaches Claude
about our live n8n instance, the canonical pipeline, and the tools available
to modify workflows autonomously.

---

## Project identity

**Ucenicul** — disciplined AI assistant built in n8n + PostgreSQL.
Canonical pipeline:

```
Message In → Thread Resolver → Execution Context Init → Orchestrator
  → Plan Builder → Dispatcher → Module Execution → Result Aggregator
  → State Update → Response Composer → Message Out
```

Five canonical modules: `task`, `reminder`, `memory`, `improvement`,
`response_support`.

Principles (non-negotiable):
- **Contract-first.** Every stage declares explicit input/output.
- **Closure-first.** No stage advances without 10/10 live-proof + audit.
- **Audit-first.** Every change recorded. No silent writes.
- **Relational DB = operational source of truth.** Semantic memory only for
  context — never replaces task/reminder/thread truth.
- **Planner vs executor.** Separate. Don't collapse them.

See architecture docs: `00_ROUTE_MAP.md` through `21_RESPONSE_COMPOSER_CONTRACT.md`.

---

## Tool: `n8n-patch` — SAFE workflow CRUD

**Location:** `tools/n8n-patch/n8n-patch.mjs`
**Alias (set globally):** `n8n-patch`
**Config:** `tools/n8n-patch/.env` (N8N_URL + N8N_API_KEY)

This is the ONLY sanctioned way to modify live n8n workflows. It encodes
every known trap in the n8n REST API (see `tools/n8n-patch/README.md` for
details). **Never** call `curl .../api/v1/workflows/...` directly.

### Commands

```
n8n-patch list [--active|--inactive] [--limit N]
n8n-patch search <name-pattern-or-/regex/>
n8n-patch get <id> [--out <file>]
n8n-patch import <file.json> [--activate]
n8n-patch replace <id> <file.json> [--reactivate]
n8n-patch patch-node <id> <node-name-or-id>
    --set key=value [--set k=v ...]   OR
    --params <file.json>
    [--reactivate]
n8n-patch activate <id>
n8n-patch deactivate <id>
n8n-patch reactivate <id>
n8n-patch delete <id> --yes
n8n-patch audit [--tail N]
```

### Safety invariants (already baked into the tool)

- Never uses PATCH — always GET → mutate → PUT.
- PUT body is exactly `{name, nodes, connections, settings}`.
- `settings` filtered to n8n OpenAPI whitelist.
- Activate/deactivate are separate endpoints, never fields.
- `reactivate` cycles deactivate → sleep → activate — mandatory after any
  change to workflows that contain webhook/telegram/form/mcp triggers.
- Every mutation creates before+after snapshots + appends to `.audit.jsonl`.

---

## MANDATORY discipline when modifying a workflow

This is the Ucenicul closure-first, audit-first discipline applied to
workflow edits. **Do not skip steps. Do not improvise.**

### The 4-phase edit protocol

1. **Discover.**
   - `n8n-patch list` (or `search`) — confirm target exists, note if it's
     active, check for duplicates.
   - If duplicates exist → stop and ask the user which one is canonical.
     Never edit when identity is ambiguous.

2. **Backup.**
   - `n8n-patch get <id> --out snapshots/<id>_pre-<taskname>-<timestamp>.json`
   - Print the path to the user. This is the rollback artefact.

3. **Patch.**
   - Prefer `patch-node` for single-node changes (surgical, low-risk).
   - Use `replace` only when the change touches structure (adding/removing
     nodes, rewiring connections). Never use `replace` without a backup in
     step 2.
   - If the workflow has a webhook/telegram/form/mcp trigger → add
     `--reactivate`.

4. **Verify.**
   - `n8n-patch get <id> --out snapshots/<id>_post-<taskname>-<timestamp>.json`
   - Diff the two snapshots (`diff` or `jq` structural compare) and show the
     user exactly which fields changed.
   - `n8n-patch audit --tail 3` to confirm the write is in the audit log.
   - If the workflow had a runtime test contract (V1–V6 style), run the
     relevant test and confirm pass. Do not claim done otherwise.

### Output format for every edit

After step 4, always report:

```
Workflow: <name> (<id>)
Change: <what>
Snapshots:
  before: <path>
  after:  <path>
Diff: <summary of changed fields>
Reactivate: <yes/no + why>
Audit entry: <last hash from .audit.jsonl>
```

### Forbidden without explicit user permission

- `delete <id> --yes`
- `replace` on an active production workflow
- Editing two workflows in parallel (always serialize; one at a time)
- Editing a workflow that contains unsaved draft changes in the n8n UI
  (if unsure, ask; PUT will overwrite the draft silently)

---

## Stage of work currently

Run `cat CURRENT_STAGE.md` at the start of any workflow-editing task to
see which stage is active. Do not edit workflows that are the concern of
an already-closed stage (RA-01, SU-01) without explicit user authorization
— closed stages are under closure-discipline, changing them voids 10/10.

Active stage (read `CURRENT_STAGE.md` for authoritative state): **WF-EC-01**
Execution Context Init.

---

## Analysis reference

External framework comparison: `ANALYSIS_OpenClaw_n8n_claw_Reuse_Audit.md`
— read before proposing to borrow patterns from `n8n-claw` / OpenClaw.
