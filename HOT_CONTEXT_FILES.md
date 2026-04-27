# HOT_CONTEXT_FILES.md — Ucenicul_REBUILT

> **Purpose.** Declares the canonical set of files an AI agent (Claude or any other) is expected to load *implicitly* at the start of any substantive task in this repo. These are the minimum-viable context for reasoning about architecture, product state, or implementation direction.
>
> **Scope.** This document is a *routing contract*, not architectural authority. It does not add requirements; it only tells the loader which existing canonical files to prefer.
>
> **Status.** Accepted as part of the canonical baseline on 2026-04-19.

---

## 1. What belongs in HOT context

A file is HOT if **all** of the following are true:

1. It is a canonical, populated document (not a placeholder, not audit residue).
2. It is small enough that loading it by default is cheap in tokens.
3. Missing it would cause an AI agent to reason from incorrect assumptions about repo state, architecture, or authority.

Audit artifacts, manifests, deltas, fix logs, per-file JSON dumps, and historical closure narratives are **not** HOT. They live in `COLD_CONTEXT_FILES.md`.

## 2. HOT context — always loaded

These are loaded at the start of every non-trivial task, regardless of task type.

| File | Role | Authority level |
|---|---|---|
| `README.md` | Human orientation | Level 3 — subordinate |
| `CLAUDE.md` | Repo-level instructions for Claude | Level 3 — subordinate |
| `PROJECT_MASTER.md` | Top-level navigation and status map | Level 3 — subordinate |
| `DECISIONS.md` | ADR-style decisions beyond spec scope | Level 3 — subordinate |
| `docs/architecture/Architecture_Spec_v3_Ucenicul.md` | Architecture truth | Level 1 — HIGHEST |
| `docs/migration/Migration_Plan_Ucenicul.md` | Migration truth | Level 1 — canonical |

Rationale: these six files define "what Ucenicul is", "who has authority over what", and "how we got here". No task should proceed without them.

## 3. HOT context — architecture tasks

Loaded additionally when the task touches architecture, module contracts, thread resolution, memory, or n8n execution layout.

| File | When to load |
|---|---|
| `docs/architecture/Module_Registry_Ucenicul.md` | Any module-related task |
| `docs/architecture/Module_Spec_Task.md` | Task module work |
| `docs/architecture/Module_Spec_Reminder.md` | Reminder module work |
| `docs/architecture/Module_Spec_Memory.md` | Memory module work |
| `docs/architecture/Module_Spec_Response.md` | Response composition work |
| `docs/architecture/Module_Spec_Watcher.md` | Watcher module work |
| `docs/architecture/Thread_Resolution_Spec.md` | Any thread-resolution or message-ingress work |
| `docs/architecture/Memory_Model_Spec.md` | Any memory-tier / promotion / RAG work |
| `docs/architecture/n8n_Workflow_Mapping.md` | Any n8n workflow wiring or query policy work |

## 4. HOT context — workflow tasks

Loaded additionally when the task touches a specific n8n workflow.

| File | When to load |
|---|---|
| `workflows/README.md` | Any workflow task |
| `workflows/WF-<CODE>-01_<Name>/README.md` | Only for the specific workflow being touched |
| `docs/architecture/n8n_Workflow_Mapping.md` | Always co-loaded with workflow work |

Non-workflow entries such as `_ARCHIVED_Executor_Closer_stub/` are NOT in HOT context and should be ignored by workflow-planning tasks.

## 5. HOT context — DB tasks

| File | When to load |
|---|---|
| `db/README.md` | Any DB task |
| `db/schema/README.md` | Any schema-level DB task |
| `docs/architecture/Architecture_Spec_v3_Ucenicul.md` | Always co-loaded (target schema lives there) |

## 6. HOT context — operational / verification tasks

| File | When to load |
|---|---|
| `docs/operations/Documentation_Verification_Checklist_Ucenicul.md` | Any verification or compliance task |
| `PROGRESS_LOG.md` | Any task that extends or audits structural state |

## 7. HOT context — pipeline / Claude-autonomy tasks

| File | When to load |
|---|---|
| `.claude/README.md` | Any task involving Claude's orchestration pipeline |
| `.claude/pipelines/LAYOUT.md` | Any task planning the pipeline shape |

Note: `.claude/pipelines/ucenicul-pipeline/` is currently an empty read-only placeholder. There is nothing to load from it.

## 8. What is explicitly NOT in HOT context

The following must **never** be auto-loaded as part of HOT context, even if the task feels large:

- Any file under `inventory/` (all audit / manifest / delta / JSON artifacts)
- Any file under `archive/`
- Any file under `docs/archive/`
- Any file under `docs/audits/` (except on direct user request)
- `Ucenicul/OBSOLETE.md` and anything under `Ucenicul/` (obsolete stub)
- `workflows/_ARCHIVED_Executor_Closer_stub/` (obsolete stub)
- `.claude/_removed_test.txt`, `.claude/_sandbox_vestige_root.tmp` (environmental residue)
- Any `*_test_*.tmp`, `_removed_*`, `_sandbox_*` files

These belong in COLD context and are loaded only on explicit demand.

## 9. Loading priority when context budget is tight

If an agent cannot afford to load all HOT files, priority is:

1. `docs/architecture/Architecture_Spec_v3_Ucenicul.md` (always first)
2. `CLAUDE.md`
3. `PROJECT_MASTER.md`
4. `docs/migration/Migration_Plan_Ucenicul.md`
5. Task-specific Level-2 spec (per Section 3)
6. `README.md`
7. `DECISIONS.md`

## 10. Maintenance rule

HOT context composition changes only when:

- A new Level-1 or Level-2 canonical spec is added under `docs/architecture/` or `docs/migration/`
- A root-level canonical doc (README, CLAUDE, PROJECT_MASTER, DECISIONS, PROGRESS_LOG) is renamed, retired, or added
- A workflow root structure changes (unlikely post-baseline)

Changes to HOT composition must be reflected here and in `AI_CONTEXT_LOADING_RULES.md` in the same commit / session.

---

> **Subordinate to `docs/architecture/Architecture_Spec_v3_Ucenicul.md`.** Last updated: 2026-04-19.
