# AI_CONTEXT_LOADING_RULES.md — Ucenicul_REBUILT

> **Purpose.** Prescribe, for each task type, the exact sequence of files an AI agent loads before reasoning. Combined with `HOT_CONTEXT_FILES.md` (what's cheap to load) and `CANONICAL_ENTRYPOINTS.md` (where truth lives), this document makes agent behavior deterministic across sessions.
>
> **Scope.** Operational routing rules only. Does not extend or override any architectural authority.
>
> **Status.** Accepted as part of the canonical baseline on 2026-04-19.

---

## 1. Universal preamble (applies to every task)

Before any task-specific loading, the agent MUST load the universal HOT set:

1. `docs/architecture/Architecture_Spec_v3_Ucenicul.md`
2. `CLAUDE.md`
3. `PROJECT_MASTER.md`
4. `docs/migration/Migration_Plan_Ucenicul.md`
5. `README.md`
6. `DECISIONS.md`

If token budget forbids all six, drop in reverse order (6, 5, 4, ...), never drop (1).

## 2. Task-type routing

For each task type below, load the universal preamble first, then the additional files listed. Files are listed in load order.

### 2.1 Architecture / design task

"Design a new module", "revise the target architecture", "add a privacy tier", etc.

1. `docs/architecture/Module_Registry_Ucenicul.md`
2. All `docs/architecture/Module_Spec_*.md` relevant to the affected modules
3. `docs/architecture/Thread_Resolution_Spec.md` if ingress is affected
4. `docs/architecture/Memory_Model_Spec.md` if memory is affected
5. `docs/architecture/n8n_Workflow_Mapping.md` if execution layout is affected

### 2.2 Module implementation task

"Implement task_module", "write response composer", etc.

1. `docs/architecture/Module_Registry_Ucenicul.md`
2. `docs/architecture/Module_Spec_<ModuleName>.md` for the target module
3. `docs/architecture/n8n_Workflow_Mapping.md`
4. Relevant `workflows/WF-<CODE>-01_<Name>/README.md`
5. `db/README.md` if the module reads or writes DB

### 2.3 Workflow task

"Add a workflow", "refactor WF-OR-01", etc.

1. `workflows/README.md`
2. `workflows/WF-<CODE>-01_<Name>/README.md` for the specific workflow
3. `docs/architecture/n8n_Workflow_Mapping.md`
4. `docs/architecture/Module_Registry_Ucenicul.md` (to confirm module contracts invoked)

Explicitly SKIP `workflows/_ARCHIVED_Executor_Closer_stub/`.

### 2.4 Database task

"Add a table", "write a migration", "design the secure mapping store", etc.

1. `db/README.md`
2. `db/schema/README.md`
3. `docs/architecture/Architecture_Spec_v3_Ucenicul.md` (Schema Gap Register)
4. `docs/migration/Migration_Plan_Ucenicul.md` for migration ordering
5. `docs/architecture/Memory_Model_Spec.md` if memory_items is touched

### 2.5 Thread resolution / ingress task

"Revise thread resolver", "handle new channel", etc.

1. `docs/architecture/Thread_Resolution_Spec.md`
2. `docs/architecture/Architecture_Spec_v3_Ucenicul.md` (Thread & Entity sections)
3. `workflows/WF-TR-01_Thread_Resolver/README.md`

### 2.6 Memory task

"Add a memory tier", "rewrite RAG retriever", etc.

1. `docs/architecture/Memory_Model_Spec.md`
2. `docs/architecture/Module_Spec_Memory.md`
3. `db/README.md` (memory_items section)
4. `docs/architecture/Architecture_Spec_v3_Ucenicul.md` (privacy tier implications)

### 2.7 Verification / compliance task

"Audit whether the repo matches the spec", "verify doc hierarchy", etc.

1. `docs/operations/Documentation_Verification_Checklist_Ucenicul.md`
2. `PROJECT_MASTER.md`
3. `CLAUDE.md`
4. On demand only: `inventory/DOCUMENT_STRUCTURE_DOUBLE_CHECK_POST_FIX.md`
5. On demand only: `inventory/final_consistency_audit_post.json`

### 2.8 Closure / baseline task

"Declare baseline", "write closeout report", "update reconciliation state", etc.

1. `FINAL_CANONICAL_BASELINE.md`
2. `inventory/ABSOLUTE_CLOSEOUT_REPORT.md`
3. `inventory/RECONCILIATION_STATE.json`
4. `inventory/RECONCILIATION_STATE_FINAL.json`
5. `PROGRESS_LOG.md`

### 2.9 Pipeline / Claude-autonomy task

"Design the Claude orchestration pipeline", "wire up a plugin", etc.

1. `.claude/README.md`
2. `.claude/pipelines/LAYOUT.md`
3. `CLAUDE.md`
4. `docs/architecture/Architecture_Spec_v3_Ucenicul.md` (to preserve authority boundary)

### 2.10 Structural / reorg task

"Move a folder", "rename a doc", "archive a workflow", etc.

1. `PROJECT_MASTER.md`
2. `inventory/DOCUMENT_STRUCTURE_DOUBLE_CHECK_POST_FIX.md`
3. `inventory/DOCUMENT_STRUCTURE_FIXES_DELTA.md`
4. `inventory/final_reorganization_report.md`
5. `DECISIONS.md` (must be updated with the new decision)

### 2.11 General question / orientation

"What is Ucenicul?", "where do I start?", etc.

1. `README.md`
2. `PROJECT_MASTER.md`
3. `CANONICAL_ENTRYPOINTS.md`

## 3. When to escalate to COLD context

Load a file from `COLD_CONTEXT_FILES.md` only if **all** of the following hold:

1. The task is explicitly about history, provenance, or historical state (not current state).
2. The needed fact is not present in any HOT file.
3. The user has asked for a claim that must cite a specific manifest, delta, or audit.

If an agent finds itself reaching for COLD context for a current-state question, stop and reconsider — the answer almost certainly lives in HOT.

## 4. Never-load list

An agent MUST NOT load the following at any time as part of automated routing:

- `Ucenicul/OBSOLETE.md` (obsolete stub)
- `workflows/_ARCHIVED_Executor_Closer_stub/**` (obsolete stub)
- `.claude/_removed_test.txt`, `.claude/_sandbox_vestige_root.tmp`, `inventory/_test_write.tmp`
- Any file matching `*_test_*.tmp`, `_sandbox_*`, `_removed_*`
- Anything under `archive/`, `docs/archive/` unless explicitly named by the user

## 5. Order of operations inside a single task

1. Load universal preamble (Section 1).
2. Identify task type (Section 2).
3. Load task-specific additional files in order.
4. Consult `CANONICAL_ENTRYPOINTS.md` to confirm you have the right authority file for each claim you plan to make.
5. Reason. Write. Cite.
6. If you cited a file as authoritative, verify it was loaded from HOT, not COLD.

## 6. Contradiction-handling rule

If two loaded files disagree:

1. The higher-authority file wins (see `CANONICAL_ENTRYPOINTS.md` Section 2).
2. Note the contradiction in the agent's reply.
3. If a Level-1 spec is contradicted by a Level-3 document, flag for human review before proceeding.

## 7. Maintenance

This document is updated whenever:

- `HOT_CONTEXT_FILES.md` changes
- `CANONICAL_ENTRYPOINTS.md` changes
- A new task type becomes common enough to warrant an explicit route

No other change requires updating this document.

---

> **Subordinate to `docs/architecture/Architecture_Spec_v3_Ucenicul.md`.** Last updated: 2026-04-19.
