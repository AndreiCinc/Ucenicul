# ME Module Expansion — Stable Design Doc

> **Canonicality: LEVEL 2 — CANONICAL SUBORDINATE**
> Subordinate to `docs/architecture/Architecture_Spec_v3_Ucenicul.md` and
> `docs/architecture/Module_Registry_Ucenicul.md`.
> This doc is the authoritative description of how `WF-ME-01` (Module Execution) is
> expanded from its MVP task-only implementation to support all modules that PL's live
> registry declares.

---

## 1. Motivation

`WF-ME-01` originally dispatches only `task_module` actions. The live Planner
(`WF-PL-01`) already knows how to map user intents onto `reminder_module`,
`memory_module`, `improvement_module`, and `watcher_module_basic`, but ME's router
(`ME_Route_Module_Name`) falls through to `UNSUPPORTED_MODULE` for anything other than
`task_module`. That gap (tracked as blocker `B10-DI-UNSUPPORTED-ACTION-AND-MODULE` in
Phase-10 rerun) prevents the TR-originated primary chain from reaching MO for any
non-task intent.

This doc specifies the **minimum additive** change to `WF-ME-01` (plus one colocated
one-line fix in `WF-PL-01`) that makes the full primary chain reach MO for every intent
PL's live registry supports, without introducing new infrastructure, new tables, or
new schema.

## 2. Scope & non-goals

### In scope (MVP)

Implemented **exactly** the capabilities declared in the live `PL_Load_Module_Registry`:

| module_name            | capabilities (live)                                                               |
|------------------------|-----------------------------------------------------------------------------------|
| `task_module`          | `create_task`, `list_tasks`, `update_task`, `complete_task`, `delete_task` (already live) |
| `reminder_module`      | `create_reminder`, `list_reminders`, `update_reminder`, `cancel_reminder`         |
| `memory_module`        | `store_memory`, `search_memory`                                                   |
| `improvement_module`   | `capture_feedback`                                                                |
| `watcher_module_basic` | `produce_observation` (PL intent `observe`)                                       |

### Explicitly out of scope (deferred, `status: planned` in Module Registry)

Spec-defined but **not** in the live PL registry: `trigger_reminder`, `recall_memory`,
`promote_memory`, `supersede_memory`, `log_improvement_request`, `list_improvements`.
These remain in `docs/architecture/Module_Spec_*.md` as planned capabilities; no ME
handler is added for them until PL declares them in its registry.

### Hard constraints

1. No new DB tables.
2. No new schema migrations.
3. No changes to downstream workflows (RA, SU, RC, MO, DI).
4. No regression of the existing 50 synthetic + 10 runtime tests for `task_module`,
   the 10 edge-6 runtime tests, or the Phase-6 DI-originated smokes.
5. All new ME handlers follow the same **plan-describer** pattern already used by
   `ME_Task_*_Result` nodes — they build a `module_result` envelope describing the
   intended operation but **do not write to domain tables** (`domain_writes_performed:
   false`). DB writes remain RA/SU's responsibility.

## 3. Canonical PL ↔ ME action mapping

PL's `intentMap` (live, copied verbatim from `PL_Build_Planner_Input` for transparency):

```text
create_task        → create_task         → task_module
list_tasks         → list_tasks          → task_module
update_task        → update_task         → task_module
complete_task      → complete_task       → task_module
delete_task        → delete_task         → task_module
create_reminder    → create_reminder     → reminder_module
list_reminders     → list_reminders      → reminder_module
update_reminder    → update_reminder     → reminder_module
cancel_reminder    → cancel_reminder     → reminder_module
search_memory      → search_memory       → memory_module
save_suggestion    → capture_feedback    → improvement_module
observe            → observe             → watcher_module_basic
```

`cancel_reminder` is a **distinct** action from `update_reminder`. ME has two options:
either (a) provide a dedicated `ME_Reminder_Cancel_Result` handler, or (b) route
`cancel_reminder` and `update_reminder` into a single handler that branches on action.
This design chooses (a) — one handler per action — because it mirrors the existing
task handler pattern and keeps per-action assertions simple in tests.

`save_suggestion` is an intent, not an action. PL maps it to the action
`capture_feedback`, which is what ME sees.

`observe` is both the intent and the action-equivalent token — watcher has no
multi-action surface. ME treats this as a single-handler path.

## 4. Required PL colocated fix (one-line)

Problem: `PL_Generate_Plan` pushes plan steps that retain `module_name`, `inputs`, etc.,
but **drop the `action` field** — the action name is only present on the
`requested_actions[i].action` input, and never propagated onto the emitted step. ME's
`ME_Route_Task_Action` reads `step.inputs.action`, so every TR-originated execution
fails with `UNSUPPORTED_ACTION: Unsupported task_module action: undefined` (observed
in Phase-10 rerun).

Smallest canonical fix: in `PL_Generate_Plan`, inject `action` into `step.inputs`:

```javascript
// before: inputs: action.inputs || {}
inputs: Object.assign({ action: actionName }, action.inputs || {})
```

Preserves backward compatibility with any caller that already sets `inputs.action`
(they win via the spread order — actually the opposite: `Object.assign` overwrites left
keys with right-hand ones, so existing `inputs.action` wins). Zero blast radius on the
task_module Phase-6 smoke (which injected `inputs.action` explicitly in test fixtures).

No further PL changes.

## 5. ME topology after expansion

Starting from the current topology (task_module only), the additions are:

```
ME_Route_Valid ──[valid]→ ME_Load_Execution_Context
                       ── ME_Check_Context_Match
                       ── ME_Route_Context_OK
                       ──[context_ok]→ ME_Route_Module_Name  (UPDATED)
                                        │
                                        ├──[task_module]──→ ME_Load_Task_Candidates
                                        │                    └→ ME_Route_Task_Action
                                        │                        ├─ ME_Task_Create_Result
                                        │                        ├─ ME_Task_List_Result
                                        │                        ├─ ME_Task_Update_Result
                                        │                        ├─ ME_Task_Complete_Result
                                        │                        └─ ME_Task_Delete_Result
                                        │
                                        ├──[reminder_module]──→ ME_Route_Reminder_Action   (NEW)
                                        │                        ├─ ME_Reminder_Create_Result   (NEW)
                                        │                        ├─ ME_Reminder_List_Result     (NEW)
                                        │                        ├─ ME_Reminder_Update_Result   (NEW)
                                        │                        └─ ME_Reminder_Cancel_Result   (NEW)
                                        │
                                        ├──[memory_module]──→ ME_Route_Memory_Action       (NEW)
                                        │                        ├─ ME_Memory_Store_Result      (NEW)
                                        │                        └─ ME_Memory_Search_Result     (NEW)
                                        │
                                        ├──[improvement_module]──→ ME_Improvement_Capture_Result (NEW)
                                        │
                                        ├──[watcher_module_basic]──→ ME_Watcher_Observe_Result   (NEW)
                                        │
                                        └──(fallback)──→ ME_Return_Error (UNSUPPORTED_MODULE)
```

All new handler nodes and the existing task handlers converge onto the existing
`ME_Return_Result` → `ME_Dispatch_To_RA_01_SUBCALL` sequence. **No changes to
downstream wiring.**

Key topology choice: **only the task branch goes through `ME_Load_Task_Candidates`**.
The other branches bypass task-candidate loading entirely because they are not
task-specific. This preserves existing task-branch behavior without side-effects.

## 6. Handler contracts (per node)

All handlers emit a **module_result envelope** with the same top-level shape currently
emitted by `ME_Task_Create_Result`:

```json
{
  "status_kind": "success",
  "result_type": "module_result",
  "execution_context_id": "<env.execution_context_id>",
  "thread_id": "<env.thread_id>",
  "tenant_id": "<env.tenant_id>",
  "module_result": {
    "module_name": "<module>",
    "step_id": "<step.step_id>",
    "result_type": "execution | analysis",
    "status": "success",
    "summary": "...",
    "observations": [],
    "proposals": [],
    "actions_executed": [ { "action": "<action>", "details": { ... } } ],
    "artifacts": [ { "type": "<kind>", "value": "..." } ],
    "confidence": 1.0,
    "needs_followup": false,
    "followup_requests": []
  },
  "module_execution_started": true,
  "domain_writes_performed": false,
  "response_generation_allowed": false
}
```

If inputs are incomplete, the handler returns `{ _error: true, error_code:
'MISSING_REQUIRED_FIELDS', error_message, missing_fields: [...] }`, which
`ME_Return_Result` already converts into the standard `module_error` envelope.

### 6.1 reminder_module handlers

| Handler                       | Action            | Required inputs                     | Key action details (non-exhaustive)                                      |
|-------------------------------|-------------------|-------------------------------------|--------------------------------------------------------------------------|
| `ME_Reminder_Create_Result`   | `create_reminder` | `description`                       | `{reminder_id, title?, description, due_date?, time?, remind_at?, recurrence?}` |
| `ME_Reminder_List_Result`     | `list_reminders`  | — (all optional)                    | `{timeframe: all|today|week|month, status, limit}`                       |
| `ME_Reminder_Update_Result`   | `update_reminder` | `reminder_id` OR `title_match`; at least one mutable field in patch | `{reminder_id?, title_match?, patch:{title?,description?,remind_at?,status?,recurrence?}}` |
| `ME_Reminder_Cancel_Result`   | `cancel_reminder` | `reminder_id` OR `title_match`      | `{reminder_id?, title_match?, new_status:'cancelled'}`                   |

Artifact on create: `{type: 'reminder_id', value: reminder_id}`. Idempotency key:
`execution_context_id + step_id`; the handler derives a deterministic `reminder_id`
(`reminder:{tenant_id}:{step_id}`) so replays produce identical output.

### 6.2 memory_module handlers

| Handler                    | Action          | Required inputs                 | Key action details                                                    |
|----------------------------|-----------------|---------------------------------|-----------------------------------------------------------------------|
| `ME_Memory_Store_Result`   | `store_memory`  | `content`, `memory_type`        | `{memory_id, content, memory_type, source_context?, durability?}`     |
| `ME_Memory_Search_Result`  | `search_memory` | `query`                         | `{query, timeframe?, memory_type?, limit?, recall_results:[]}`         |

`memory_type` allowed (mirrors `Memory_Model_Spec`): `fact`, `observation`, `pattern`,
`inference`, `preference`, `constraint`. Handler validates membership; unknown →
`MISSING_REQUIRED_FIELDS` with `missing_fields: ['memory_type']`.

`ME_Memory_Search_Result` returns `recall_results: []` at plan-describer level — the
real vector query is deferred to RA/SU. `module_result.result_type` is `analysis` for
search and `execution` for store.

### 6.3 improvement_module handlers

| Handler                             | Action               | Required inputs        | Key action details                       |
|-------------------------------------|----------------------|------------------------|------------------------------------------|
| `ME_Improvement_Capture_Result`     | `capture_feedback`   | `feedback_content`     | `{improvement_id, feedback_content, category?, severity?}` |

Artifact: `{type: 'improvement_id', value: improvement_id}`. `improvement_id` is
deterministic: `improvement:{tenant_id}:{step_id}`.

### 6.4 watcher_module_basic handler

| Handler                           | Action    | Required inputs                                     | Key action details                               |
|-----------------------------------|-----------|-----------------------------------------------------|--------------------------------------------------|
| `ME_Watcher_Observe_Result`       | `observe` | — (all optional: `thread_summary`, `recent_memory_context`, `module_results_so_far`) | `{trigger: 'passive', inputs_digest:{...}}`     |

`module_result.result_type` is `analysis`. `observations: []`, `proposals: []`,
`anomaly_signals: []` populated with placeholders (watcher is a plan-describer too —
actual pattern detection is deferred). Never fails: any malformed input produces a
`summary: 'Watcher observation returned empty result set.'` `module_result` with
`status: success` and empty arrays (non-blocking per spec).

## 7. Switch node rule changes

**`ME_Route_Module_Name`** — extend from 1 rule + fallback to 5 rules + fallback. All
rules read the same expression (`$('ME_Validate_Dispatcher_Result').first().json.step.module_name`):

| rightValue             | outputKey              | target                         |
|------------------------|------------------------|--------------------------------|
| `task_module`          | `task_module`          | `ME_Load_Task_Candidates` (unchanged) |
| `reminder_module`      | `reminder_module`      | `ME_Route_Reminder_Action`     |
| `memory_module`        | `memory_module`        | `ME_Route_Memory_Action`       |
| `improvement_module`   | `improvement_module`   | `ME_Improvement_Capture_Result`|
| `watcher_module_basic` | `watcher_module_basic` | `ME_Watcher_Observe_Result`    |
| (fallback `extra`)     | —                      | `ME_Return_Error` (unchanged)  |

**`ME_Route_Reminder_Action`** — 4 rules + fallback, read
`step.inputs.action`:

| rightValue          | target                         |
|---------------------|--------------------------------|
| `create_reminder`   | `ME_Reminder_Create_Result`    |
| `list_reminders`    | `ME_Reminder_List_Result`      |
| `update_reminder`   | `ME_Reminder_Update_Result`    |
| `cancel_reminder`   | `ME_Reminder_Cancel_Result`    |
| (fallback)          | `ME_Return_Error` (UNSUPPORTED_ACTION) |

**`ME_Route_Memory_Action`** — 2 rules + fallback:

| rightValue       | target                     |
|------------------|----------------------------|
| `store_memory`   | `ME_Memory_Store_Result`   |
| `search_memory`  | `ME_Memory_Search_Result`  |
| (fallback)       | `ME_Return_Error`          |

Improvement and watcher skip per-action switches (single action each).

## 8. Test matrix

### 8.1 Regression (must not break)

- Phase-2 workflow-local: 50 synthetic + 10 runtime for `task_module` — unchanged.
- Phase-5 edge-6 runtime (ME→RA): 10 cases — unchanged.
- Phase-6 DI-originated smoke: 3 cases — unchanged.

### 8.2 New workflow-local synthetic tests (per-handler contract)

Target: ≥10 synthetic cases per new handler × 8 handlers = **80 cases**.

Layout per handler: 6 success cases (varied inputs), 2 missing-field cases, 1
malformed-envelope case, 1 idempotency replay case.

Fixture file: `tests/generated/workflows/synthetic/me_expansion_synthetic.json`.

Oracle: JSON-shape assertions on the handler's output — `status_kind`, `result_type`,
`module_result.module_name`, `module_result.actions_executed[0].action`,
`module_result.artifacts[]`, `domain_writes_performed === false`.

### 8.3 New workflow-local runtime tests (per-handler live execution)

Target: ≥3 runtime cases per new handler × 8 handlers = **24 cases**. Fire via the
chatTrigger precursor on ME or via direct `executeWorkflowTrigger` input; walk the
execution run data to assert terminal `ME_Return_Result` emits the expected envelope.

### 8.4 New edge-integration runtime tests (DI→ME per module)

Target: ≥3 runtime cases per new module × 4 new modules = **12 cases**. Fire via DI
harnesses (reuse the Phase-5 edge-5 DI harness pattern but with `step.module_name`
varied). Assert the child ME execution returns `status_kind: success, result_type:
module_result`.

### 8.5 Full-chain TR→MO smoke (Phase 11)

Target: ≥5 TR-originated smokes (one per active intent family): `create_task` +
`create_reminder` + `search_memory` + `save_suggestion` + `observe`. Each must reach
MO with a terminal envelope in the workflow's run data. This supersedes the Phase-10
smoke (which terminated at DI on 4/4 cases).

### 8.6 Aggregate target

**Regression: 73 cases pass (unchanged).** **New: 80 synthetic + 24 runtime + 12 edge
+ 5 full-chain = 121 new cases.**

## 9. Rollout & snapshots

Naming convention (existing): `_patch_<wf>_<phase>.mjs` under
`tests/generated/workflows/snapshots/`. Output snapshots (`..._pre.json` /
`..._put.json`) adjacent to the patch script.

Phases:

1. `_patch_pl_propagate_action_phase11.mjs` — PL one-line fix (Section 4). Emits
   `WF-PL-01_phase11_pre.json` / `WF-PL-01_phase11_put.json`.
2. `_patch_me_module_expansion_phase11.mjs` — ME additive patch (Sections 5–7).
   Emits `WF-ME-01_phase11_pre.json` / `WF-ME-01_phase11_put.json`.
3. Synthetic test runner: `tests/generated/workflows/_run_me_expansion_synthetic.mjs`.
4. Runtime test runner: `tests/generated/workflows/_run_me_expansion_runtime.mjs`.
5. Full-chain rerun: `tests/generated/workflows/snapshots/_walk_phase11_chains.mjs`.

Every patch script preserves credentials verbatim (reuses the existing cred id
`z9nKgToNWvIW7P8f`) and uses the standard `GET → deactivate → PUT → activate → GET`
flow already used by the Phase-10 patches.

## 10. Acceptance gate

All of the following must hold to declare ME expansion complete:

1. PL emits steps whose `inputs.action` is the canonical action name (verified by
   reading `PL_Generate_Plan`'s output in a Phase-11 smoke).
2. `ME_Route_Module_Name` has 5 explicit rules matching all live module_names; only
   genuinely unknown modules fall through to `UNSUPPORTED_MODULE`.
3. The 8 new handlers exist, each reachable from `ME_Route_Module_Name`, each
   converging on `ME_Return_Result`.
4. No regression: Phase-2 (50+10), Phase-5 edge-6 (50+10), Phase-6 smoke (3) all pass.
5. 80 new synthetic + 24 new runtime + 12 new edge cases pass (aggregate pass
   threshold: 100% for synthetic/runtime, ≥80% for edge integration in first attempt).
6. TR→MO full-chain smoke: ≥5 cases reach MO with terminal `status_kind: success`.
7. No schema migration performed; no new DB tables; no changes to RA/SU/RC/MO/DI
   workflow definitions.
8. This doc, `PHASE_11_ME_EXPANSION_RECORD.md`, and `phase11_expansion_results.json`
   all exist and are consistent.

## 11. Out-of-scope / follow-ups

- Domain writes (tasks/reminders/memory/improvements persistence): currently RA/SU's
  concern. When that responsibility is refactored, ME handlers remain unchanged.
- `recall_memory` / `promote_memory` / `supersede_memory`: added to PL registry and ME
  in a future phase; this doc already specifies their contracts at the spec level.
- `trigger_reminder`: deferred (PL doesn't dispatch it; it's a scheduler-originated
  action handled outside ME's normal inbound path).
- Embedding generation for `rag_memories.embedding` — deferred with memory_module
  write path (stays in the plan-describer mode).

---

*Last updated: 2026-04-20 — Phase 11 planning.*
