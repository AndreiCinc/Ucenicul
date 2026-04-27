# CANONICAL_ENTRYPOINTS.md — Ucenicul_REBUILT

> **Purpose.** Single source-of-truth mapping from *question type* to *canonical file to open first*. An AI agent or a human contributor should be able to answer "where does the truth for X live?" by reading only this document.
>
> **Scope.** This is a routing index. It does not grant authority; it points to where authority already lives.
>
> **Status.** Accepted as part of the canonical baseline on 2026-04-19.

---

## 1. How to use this document

1. Find the row matching your question or task domain in Section 3.
2. Open the file listed under **Canonical entrypoint**.
3. If the question crosses domains, open the highest-authority file first (see Section 2), then the domain-specific one.
4. Never use a NOT-source-of-truth file to answer a question about the domain it does not own (Section 4).

## 2. Authority hierarchy (repeated here for convenience)

1. `docs/architecture/Architecture_Spec_v3_Ucenicul.md` — architecture truth (HIGHEST)
2. `docs/migration/Migration_Plan_Ucenicul.md` — migration truth
3. Level-2 subordinate specs under `docs/architecture/` (Module Registry, Module Specs, Thread Resolution, Memory Model, Workflow Mapping)
4. `CLAUDE.md` — repo-level instructions for Claude
5. `README.md` — human orientation only

All other documents are subordinate. `brain_contract.json` is authoritative **only** for intent/field validation inside the brain layer.

## 3. Entrypoint map

### 3.1 Architecture, system shape, target design

| Question | Canonical entrypoint |
|---|---|
| What is the target architecture of Ucenicul? | `docs/architecture/Architecture_Spec_v3_Ucenicul.md` |
| What is the overall message flow? | `docs/architecture/Architecture_Spec_v3_Ucenicul.md` (Flow section) |
| What are the privacy principles? | `docs/architecture/Architecture_Spec_v3_Ucenicul.md` (Privacy section) |
| What is the target DB schema? | `docs/architecture/Architecture_Spec_v3_Ucenicul.md` (Schema Gap Register) + `db/README.md` Section B |

### 3.2 Modules

| Question | Canonical entrypoint |
|---|---|
| What modules exist, and what contracts do they honor? | `docs/architecture/Module_Registry_Ucenicul.md` |
| How does the task module work? | `docs/architecture/Module_Spec_Task.md` |
| How does the reminder module work? | `docs/architecture/Module_Spec_Reminder.md` |
| How does the memory module work? | `docs/architecture/Module_Spec_Memory.md` |
| How does the response module work? | `docs/architecture/Module_Spec_Response.md` |
| How does the watcher module work? | `docs/architecture/Module_Spec_Watcher.md` |

### 3.3 Thread resolution and memory model

| Question | Canonical entrypoint |
|---|---|
| How is thread identity computed from an inbound message? | `docs/architecture/Thread_Resolution_Spec.md` |
| What are the memory tiers and promotion rules? | `docs/architecture/Memory_Model_Spec.md` |

### 3.4 n8n execution and workflow layout

| Question | Canonical entrypoint |
|---|---|
| How do n8n workflows wire together at execution time? | `docs/architecture/n8n_Workflow_Mapping.md` |
| What is the PostgreSQL query policy inside n8n? | `docs/architecture/n8n_Workflow_Mapping.md` (Section 5) |
| What workflows exist in this repo? | `workflows/README.md` |
| How is a specific workflow structured? | `workflows/WF-<CODE>-01_<Name>/README.md` |

### 3.5 Migration and transitional state

| Question | Canonical entrypoint |
|---|---|
| How do we move from legacy intent-first monolith to target architecture? | `docs/migration/Migration_Plan_Ucenicul.md` |
| What is the current transitional implementation? | `README.md` (Current Implementation Status) |

### 3.6 Database

| Question | Canonical entrypoint |
|---|---|
| What does the implemented schema look like today? | `db/README.md` (Section A) |
| What schema additions does the target architecture require? | `db/README.md` (Section B) — cross-referenced with architecture spec |
| Where is the schema SQL kept? | `db/schema/README.md` (documentation-only in baseline) |
| What Phase-2 privacy tables are placeholders? | `db/README.md` (Section C) |

### 3.7 Repo navigation and operational state

| Question | Canonical entrypoint |
|---|---|
| What is the top-level map of the repo? | `PROJECT_MASTER.md` |
| What is the running structural/architectural log? | `PROGRESS_LOG.md` |
| What ADR-style decisions have been made beyond spec scope? | `DECISIONS.md` |
| How should Claude behave inside this repo? | `CLAUDE.md` |
| What is this project in plain English? | `README.md` |

### 3.8 Verification and operations

| Question | Canonical entrypoint |
|---|---|
| How do we verify documentation compliance? | `docs/operations/Documentation_Verification_Checklist_Ucenicul.md` |

### 3.9 AI context routing (meta)

| Question | Canonical entrypoint |
|---|---|
| What should an AI load implicitly? | `HOT_CONTEXT_FILES.md` |
| What should an AI load only on demand? | `COLD_CONTEXT_FILES.md` |
| What files should an AI load for a specific task type? | `AI_CONTEXT_LOADING_RULES.md` |
| Is the repo in an accepted baseline state? | `FINAL_CANONICAL_BASELINE.md` |

### 3.10 History, audits, and reorganization provenance

| Question | Canonical entrypoint |
|---|---|
| How did the 2026-04-19 dual-root reconciliation happen? | `inventory/final_reorganization_report.md` |
| What was audited and fixed in the structural closure pass? | `inventory/DOCUMENT_STRUCTURE_DOUBLE_CHECK_POST_FIX.md` + `inventory/DOCUMENT_STRUCTURE_FIXES_DELTA.md` |
| What is the machine-readable reconciliation state? | `inventory/RECONCILIATION_STATE.json` + `inventory/RECONCILIATION_STATE_FINAL.json` |
| What is the final executive closeout summary? | `inventory/ABSOLUTE_CLOSEOUT_REPORT.md` |

## 4. NOT source of truth — do not cite for these domains

| Domain | Do NOT cite | Cite instead |
|---|---|---|
| System architecture | `CLAUDE.md`, `README.md`, `brain_contract.json` | `docs/architecture/Architecture_Spec_v3_Ucenicul.md` |
| Module contracts | Inline code comments | `docs/architecture/Module_Registry_Ucenicul.md` + `docs/architecture/Module_Spec_*.md` |
| Thread resolution | Legacy workflow notes | `docs/architecture/Thread_Resolution_Spec.md` |
| Memory model | Free-text discussion, chat history | `docs/architecture/Memory_Model_Spec.md` |
| n8n wiring | Legacy workflow notes | `docs/architecture/n8n_Workflow_Mapping.md` |
| DB target schema | Legacy DB docs alone | `docs/architecture/Architecture_Spec_v3_Ucenicul.md` Section X + `db/README.md` |
| Intent/field validation | Architecture spec alone | `brain_contract.json` (scoped to brain layer only) |

## 5. Obsolete and environmental residue — do not cite at all

- `Ucenicul/` (root-level subfolder) — obsolete source-A stub
- `workflows/_ARCHIVED_Executor_Closer_stub/` — Phase-3R naming-mismatch stub
- `.claude/_removed_test.txt`, `.claude/_sandbox_vestige_root.tmp`, `inventory/_test_write.tmp` — sandbox vestiges

These files exist only because the mount cannot delete them. They are documented transparently but MUST NOT be used as authoritative sources for anything.

## 6. When this map changes

This document must be updated in the same session/commit as any of the following:

- A new Level-1 or Level-2 canonical spec is added or renamed.
- A root-level canonical doc is added, renamed, or retired.
- A module is added or renamed.
- A workflow is added, renamed, or retired.
- The authority hierarchy in `CLAUDE.md` changes.

No other change requires updating this document.

---

> **Subordinate to `docs/architecture/Architecture_Spec_v3_Ucenicul.md`.** Last updated: 2026-04-19.
