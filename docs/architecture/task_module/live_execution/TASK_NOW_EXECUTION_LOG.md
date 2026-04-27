# TASK_NOW Execution Log — task_module live execution

> **Mission:** `TASK-MODULE-LIVE-EXECUTION-USER-READY`
> **Doc status:** mission-local working log. Subordinate to
> `docs/architecture/Architecture_Spec_v3_Ucenicul.md` and the canonical pack
> brought in via `ucenicul_task_module_user_ready_claude_pack.zip`.
> Authoritative writeback lives in
> `docs/architecture/task_module/live_execution/TASK_MODULE_CLOSEOUT.md`.

---

## 1. Run identity

| Field | Value |
|---|---|
| Start timestamp (session) | 2026-04-25 (per `<env>` `currentDate`) |
| Repo root (host) | `C:\Users\andre\Projects\Ucenicul` |
| Repo root (sandbox) | `/sessions/clever-magical-wozniak/mnt/Ucenicul` |
| Git state | not a git repo (no `.git`); changes tracked by file edits + audit log |
| Operator memory baseline | `MEMORY.md` 2026-04-25 anchor (V2-028 apply channel; WF-ME-01 9d1da628 / 49n / 67c / active) |

## 2. Pack files read (Layer 0)

All read in mandated order from
`outputs/claude_pack/ucenicul_task_module_user_ready_claude_pack/`:

- `00_TASK_NOW_FOR_CLAUDE.md`
- `01_CONTEXT_BUDGET_AND_READING_ORDER.md`
- `02_BASELINE_AND_SCOPE_LOCK.md`
- `03_CANONICAL_REPO_DISCOVERY_CHECKLIST.md`
- `04_TASK_MODULE_USER_READY_CONTRACT.md`
- `05_SCHEMA_PREFLIGHT_AND_DB_POLICY.md`
- `06_PL_ROUTING_AND_INPUT_EXTRACTION.md`
- `07_ME_IMPLEMENTATION_PLAN.md`
- `08_PATCHING_AND_APPLY_POLICY.md`
- `09_TEST_STRATEGY_USER_READY.md`
- `tests/task_module_user_ready_test_matrix.json` (50 unit + 50 runtime + 50 SQL)
- `10_RUNTIME_E2E_PHASE_PLAN.md`
- `11_WRITEBACK_AND_DOC_SYNC_POLICY.md`
- `12_FAILURE_RECOVERY_AND_STOP_RULES.md`
- `13_FINAL_REPORT_TEMPLATE.md`
- `14_ACCEPTANCE_CHECKLIST_USER_READY.md`
- `15_SINGLE_PROMPT_TO_GIVE_CLAUDE.md`

## 3. Canonical Layer-1 docs read

- `docs/architecture/Module_Spec_Task.md` — module contract
- `docs/architecture/Module_Registry_Ucenicul.md` — module surface (compact read on access)
- `docs/architecture/n8n_Workflow_Mapping.md` — apply policy + WF-ME-01 mapping
- `docs/architecture/decisions/ADR-REMINDER-AS-TASK-LAYER.md` — reminder→task ADR (accepted 2026-04-25)
- `docs/architecture/memory/MEMORY_V2_DECISION_LEDGER.md` (V2-025..V2-034) — apply channel V2-028 confirmation, Memory V2 implementation pattern reference

## 4. Live state captured via SELECT-only Postgres MCP

### 4.1 Active canonical workflows

| Workflow | id | versionId | nodes | active |
|---|---|---|---|---|
| WF-TR-01 Thread Resolver | `wI8hpSROxQI0zC9f` | `89b783f8-510a-4275-999e-4853490c580a` | 24 | yes |
| WF-EC-01 | `v9jih4jqeXpOJOiH` | `78569035-997d-4514-bdfe-6c6679b78795` | 11 | yes |
| WF-OR-01 | `KhGmNpi0ZDmrnz8W` | `2d37a1f3-e30a-4279-a952-2e4b1c7297fa` | 13 | yes |
| WF-PL-01 | `RwToPLa1ErHl2tUi` | `54be9d1d-f7bc-4ae6-b22e-d72003796096` | 16 | yes |
| WF-DI-01 | `abqYINcXr3JAhGGk` | `8b10a865-39c4-4aa6-bee0-4ec75468ebed` | 16 | yes |
| WF-ME-01 Module Execution | `uq26nh1grIpnHju0` | `9d1da628-f9fd-44dc-8f62-fda571a7bc23` | 49 (67 conn) | yes |
| WF-RA-01 Result Aggregator | `5RcNLtxNjAHJsZPE` | `4a2be8b4-08d1-43b4-9adf-376b6c30c18a` | 16 | yes |
| WF-SU-01 State Updater | `ENiYNfL3ul8AmmCB` | `4e7bc0d1-65fa-4f62-b96a-7035a99d4308` | 18 | yes |
| WF-RC-01 Response Composer | `TClXgmO8H8zsSwMb` | `6d3f5208-c963-4a02-811d-5a0d12d7ac6a` | 18 | yes |
| WF-MO-01 Output Gateway | `OooZdC0DgsDR6gm0` | `4e0163b2-e176-40ad-ac33-a8438d7c2147` | 18 | yes |

The WF-ME-01 baseline matches `MEMORY.md` (49n / 67c / active=true / versionId=9d1da628).

### 4.2 Legacy non-target workflows present (DO NOT touch / do not duplicate)

- `WF-03 Task Capture` (`96d0gcCSxbim8OUX`, 7n, **inactive**) — legacy MVP; not the canonical task module.
- `WF-04 Reminder Create` (`QSJtVfwzjJiOK6Qy`, 2n, **inactive**) — legacy MVP; superseded by ADR-REMINDER-AS-TASK-LAYER.
- `WF-06 Memory Write`, `WF-11 General Response`, `WF-00 Morning Briefing`, etc. — legacy.

No new copies will be created. No `WF-ME-01-fixed`, no `v2_copy`, no parallel folders.

### 4.3 Schema preflight — `public.tasks`

Table EXISTS. Live shape (information_schema):

| column | type | nullable | default |
|---|---|---|---|
| id | uuid | NO | `gen_random_uuid()` |
| tenant_id | uuid | NO | — (FK→`tenants.id`) |
| business_id | uuid | YES | — (FK→`businesses.id`) |
| entity_id | uuid | YES | — (FK→`entities.id`) |
| title | text | NO | — |
| description | text | YES | — |
| priority | `task_priority_enum` | NO | `'normal'` |
| due_type | `due_type_enum` | NO | `'flexible'` |
| due_date | date | YES | — |
| due_at | timestamptz | YES | — |
| status | `task_status_enum` | NO | `'open'` |
| source | text | YES | — |
| metadata | jsonb | NO | `'{}'::jsonb` |
| created_at | timestamptz | NO | `now()` |
| updated_at | timestamptz | NO | `now()` |
| completed_at | timestamptz | YES | — |

Enums: `task_priority_enum {low,normal,high,urgent}`, `task_status_enum {open,done,cancelled}`, `due_type_enum {flexible,date,datetime}`.

Indexes: `(tenant_id,due_at)`, `(tenant_id,due_date)`, `(tenant_id,status)`, `business_id`, `entity_id`, `tasks_pkey`.

**No `idempotency_key` column or unique index** — idempotency will use a metadata-based marker (`metadata->>'idempotency_key'`) with a SELECT-before-INSERT CTE pattern. Documented as a fallback per pack `05_SCHEMA_PREFLIGHT_AND_DB_POLICY.md` §Idempotency. No schema migration is required and none will be requested.

### 4.4 `public.reminders` invariant

Table EXISTS, currently 1 legacy row (pre-mission, untouched). Per ADR-REMINDER-AS-TASK-LAYER and pack `02_BASELINE_AND_SCOPE_LOCK.md`, **no current-stage write** to `reminders` will be made by the patched chain. SQL invariants will assert `count(*)` and per-row hash unchanged.

### 4.5 Task module surface in WF-ME-01 (current = stub)

| Node | Type | Role | State |
|---|---|---|---|
| `ME_Route_Module_Name` | switch | dispatch by `step.module_name` | OK (memory + task + reminder + improvement + watcher routes; reuse) |
| `ME_Route_Task_Action` | switch | dispatch by `step.inputs.action` | OK (5 outputs: create/list/update/complete/delete + fallback) — wires straight to `_Result` stubs today |
| `ME_Task_Create_Result` | code | build envelope | **PURE STUB** — no DB write; `domain_writes_performed:false` |
| `ME_Task_List_Result` | code | build envelope | **PURE STUB** |
| `ME_Task_Update_Result` | code | build envelope | **PURE STUB** |
| `ME_Task_Complete_Result` | code | build envelope | **PURE STUB** |
| `ME_Task_Delete_Result` | code | build envelope | **PURE STUB** |

### 4.6 Task routing in WF-PL-01

`PL_Build_Planner_Input.intentMap` and `actionToModule` route the 5 task actions correctly to `task_module`. Reminder actions route to `reminder_module` and `extractInputsForAction` produces `remind_at` (reminder-table column) — this conflicts with ADR-REMINDER-AS-TASK-LAYER, which mandates current-stage `create_reminder → task_module.create_task` with `due_at`/`due_type`. Patch is required in `PL_Build_Planner_Input` only.

`store_memory` is missing from `intentMap` (memory note F14). **Out of scope** for this mission per pack `02_BASELINE_AND_SCOPE_LOCK.md` ("Do not reopen memory unless your own patch causes a real regression").

## 5. Apply channel (per V2-028)

**Canonical authorized channel:** local agent-run
`node .claude/pipelines/ucenicul-pipeline/notes/tools/n8n-patch/n8n-patch.mjs replace <workflow_id> <file.json>`

The CLI:
- enforces `PUT_BODY_KEYS = ['name','nodes','connections','settings']`,
- filters `settings` to the OpenAPI-allowed whitelist,
- snapshots before/after under
  `.claude/pipelines/ucenicul-pipeline/notes/tools/n8n-patch/snapshots/`,
- appends to `.audit.jsonl`.

**Forbidden by default:** Path 5; duplicate workflow imports; MCP `patch_workflow_nodes` (sub-B unfixed for WF-ME-01 per V2-028).

## 6. Current blocker hypothesis (pre-patch)

`task_module` cannot perform DB writes because all five `ME_Task_*_Result` nodes are pure stubs (no Prep, no Postgres node). Result: every task-related corridor in the canonical chain returns `domain_writes_performed: false` regardless of intent — F13 in
`docs/architecture/e2e/results/F9_F13_F14_DOMAIN_WRITES_BLOCKER_REPORT.md`.

Secondary blocker: PL routes reminder-like requests to a `reminder_module` whose handlers are also stubs and which would, even if implemented, write to `public.reminders` against ADR-REMINDER-AS-TASK-LAYER.

## 7. No-duplicate-workflow confirmation

Confirmed at run start:
- WF-ME-01 = single canonical workflow `uq26nh1grIpnHju0`. No `*-fixed`, no `*_v2`, no `*-new` copies will be created.
- WF-PL-01 = single canonical workflow `RwToPLa1ErHl2tUi`. Same rule.
- Snapshots / rollbacks will be written under
  `docs/architecture/task_module/live_execution/artifacts/` and the n8n-patch
  pack's `snapshots/`, never as parallel canonical workflows.

## 8. Phase plan (from pack 10)

0. Preflight + design freeze ← in progress
1. Unit/local contract tests
2. Patch PL + ME (single replace per workflow)
3. Runtime smoke
4. Full runtime matrix
5. SQL invariants
6. Targeted E2E bridge (no full 240-matrix)
7. Compact writeback + final report

Final marker (issued only if all acceptance criteria are met):

`TASK_MODULE_LIVE_EXECUTION_READY_FOR_E2E = TRUE`
