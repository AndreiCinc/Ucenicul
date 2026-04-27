# F9 / F13 / F14 — DOMAIN WRITES MODE BLOCKER REPORT

Mission: E2E-DOMAIN-WRITES-MODE-DISCOVERY-AND-FIX
Date: 2026-04-25
Verdict: **`E2E_DOMAIN_WRITES_MODE_PRODUCT_DECISION_REQUIRED`**

---

## 1. Where `plan_only` is set (the F9 trace)

**Hardcoded** in `WF-OR-01_blueprint.json`, node `OR_Build_Handoff_Payload` (jsCode), line 166:

```js
return [{ json: {
  status_kind: 'success',
  result_type: 'handoff',
  module_name: 'orchestrator_input_handoff',
  payload: {
    ...
    orchestrator_input: {
      planning_mode: 'plan_only',
      module_execution_allowed: false,
      response_generation_allowed: false,
      domain_writes_allowed: false
    },
    warnings: []
  }
}}];
```

**Per OR's own contract** (`workflows/WF-OR-01_Orchestrator/docs/WF-OR-01_CONTRACTS.md` §4):

> §4.1 No Planning — OR stage produces no plan steps
> §4.2 No Module Dispatch — `module_execution_allowed: false`
> §4.3 No Response Generation — `response_generation_allowed: false`
> §4.4 No Domain Writes — `domain_writes_allowed: false`

These flags describe **OR's own behavior** ("during the OR stage, we don't plan / dispatch
/ respond / write").  They are emitted into the handoff payload as `orchestrator_input.*`
for downstream stages to **read**, but they are **NOT enforced gates** that prevent ME from
writing.  ME's handler code makes no reference to these flags.

So F9, as originally framed in the prior reconciliation, is **not the actual blocker**.

## 2. The actual blockers — F13 + F14

### F13 — ME's task / reminder / improvement handlers are pure stubs

`ME_Task_Create_Result` (n8n-nodes-base.code) — this is the entire handler:

```js
const env = $('ME_Validate_Dispatcher_Result').first().json;
const step = env.step;
const inputs = step.inputs || {};
const missing = ['description'].filter(f => !inputs[f]);
if (missing.length) return [{ json: { _error:true, error_code:'MISSING_REQUIRED_FIELDS', ... }}];
const taskId = `task:${env.tenant_id}:${step.step_id}`;
return [{ json: {
  status_kind: 'success',
  result_type: 'module_result',
  ...
  module_result: {
    module_name: 'task_module',
    actions_executed: [{ action: 'create_task', details: { task_id: taskId, ... } }],
    ...
  },
  module_execution_started: true,
  domain_writes_performed: false,                ← explicit
  response_generation_allowed: false
}}];
```

**It returns a synthetic `task_id` and a "success" envelope.  It does NOT INSERT INTO `tasks`.**
Same shape applies to `ME_Reminder_Create_Result` and `ME_Improvement_Capture_Result`
(verified inline).

Only `memory_module` has actual DB write nodes (`ME_Memory_Store_DB`, `ME_Memory_Supersede_DB`,
`ME_Memory_Recall_DB` — Memory V2 implementation work).  Search is read-only by design.

### F14 — PL's intentMap doesn't include `store_memory` / `supersede_memory` / `recall_memory`

`WF-PL-01` / `PL_Build_Planner_Input` v1.3, the canonical intent → action map:

```js
const intentMap = {
  create_task: 'create_task',  list_tasks: 'list_tasks',  update_task: 'update_task',
  complete_task: 'complete_task',  delete_task: 'delete_task',
  create_reminder: 'create_reminder',  list_reminders: 'list_reminders',
  update_reminder: 'update_reminder',  cancel_reminder: 'cancel_reminder',
  search_memory: 'search_memory',  save_suggestion: 'capture_feedback'
};
```

`store_memory`, `supersede_memory`, and `recall_memory` are **absent**.  PL cannot route
the chain to the only ME handlers that actually write (memory_module's store/supersede/recall).
Memory V2 closure validated those handlers via direct ME invocation (`f31_runner.mjs`,
`f6a_local_runner.mjs`), bypassing TR/EC/OR/PL/DI.

## 3. Empirical proof — F13 confirmed live

Probe fire: TR exec **7428** with `messages.intent='create_task'`.

- TR last_node `_debug_summary`: `rollup_status: 'success'`, `module_results_count: 1`,
  `returned_step_ids: ['step_01_create_task']`
- DB after fire: `SELECT count(*) FROM tasks WHERE tenant_id='eee0e2e0-...000001'` = **0**
- Globally in last 5 minutes: `SELECT count(*) FROM tasks WHERE created_at >= NOW()-'5m'` = **0**

Chain reports execution success, **zero rows persisted**.  Confirms F13.

## 4. Same gap explains Phase 12.3

Phase 12.3 (2026-04-20) reported "TR→MO 4/4 green" on `create_task / create_reminder /
search_memory / save_suggestion`.  All 4 module success messages.  But:

```
Phase-12.3 window 2026-04-20T16:30..16:35Z:
  tasks=0  reminders=0  memory_items=0  outbound_delivery_ledger=0
```

**Phase 12.3 wrote nothing either.**  The "green" verdict was about envelope shape, not
DB persistence.  The prior reconciliation captured this in F9 but framed the gate as the
orchestrator_input flags; the actual cause is F13 (stubs) + F14 (missing intent route).

## 5. Decision — Option C (product blocker)

| Option | Why not |
|---|---|
| A: harness/fixture flag | No flag exists in input that gates writes — F13 stubs are unconditional |
| B: small canonical workflow patch | "Patch task_module / reminder_module / improvement_module to actually INSERT, plus extend PL.intentMap with store_memory/supersede_memory/recall_memory plus authoring `extractInputsForAction` extractors for memory store inputs" is a multi-workflow product change.  Fails the "small / isolated / contract-backed / immediately validatable" test. |
| C: product blocker | Selected. |

**No workflow patched.  No duplicate created.  No schema change.  No Path 5.  No MCP write.**

## 6. Mandatory harness fixes — applied

### Fix 1: SQL invariant rescoping (F10 follow-on)

Updated `harness/e2e_sql_invariants.mjs`:
- `assert_no_memory_write_for_case` → scope by `tenant_id + source_thread_id + created_at >= fire_iso`
- `assert_memory_row_exists` → same
- `assert_no_domain_write` → tenant + window for tasks/reminders, tenant + thread + window for memory_items
- `assert_thread_id_reused` → tenant + thread + window
- `assert_new_thread_id` → tenant + thread + window (count of execution_contexts)
- `assert_execution_context_new_but_same_thread` → same as `assert_thread_id_reused`
- `assert_no_cross_thread_execution_state_resume` → tenant + thread + window (count execution_contexts)

Validation against existing C9-L1-V3 p0_v2 chain:

```
assert_new_thread_id (rescoped)              : c=1   ✅ (was c=0 with old idempotency_key scoping)
assert_no_memory_write_for_case (rescoped)   : c=0   ✅
assert_no_domain_write (rescoped, e2e tenant): tasks=0 reminders=0 memory_items=0 outbound=0   ✅
```

### Fix 2: Sequential fire mode

Agent context drives MCP `execute_workflow` synchronously (call returns when chain completes
or fails).  Sequence is implicit when fires are issued one per agent message.  No runner
change needed.  Documented in walker logic: timestamp-fallback collisions only matter for
truly parallel fires; we don't fire in parallel.

The walker's timestamp-proximity fallback for DI's `mode='each'` splitter remains the same
— it's only triggered when sub-execution metadata is missing, and within sequential fires
the window is uncluttered.

## 7. What changed this mission

| File | Change |
|---|---|
| `harness/e2e_sql_invariants.mjs` | Rescoped 6 invariants from `idempotency_key LIKE 'e2e:%'` → `tenant_id + thread_id + created_at >= fire_iso` |
| `harness/e2e_oracle.mjs` | (unchanged this mission) |
| `harness/intent_mapping.mjs` | (unchanged this mission) |
| `harness/seed_fixtures.mjs` | (unchanged this mission) |
| `results/F9_F13_F14_DOMAIN_WRITES_BLOCKER_REPORT.md` | NEW (this file) |
| `PROJECT_E2E_RICH_MATRIX_RECONCILIATION.md` | (will be updated) |

**No workflow files modified.  No DB schema modified.**

DB writes (additive, e2e tenant lane only):
- `threads` 1 row (probe `a1111111-aaaa-...`)
- `messages` 1 row (probe `a2222222-bbbb-...` with `intent='create_task'`)
- 0 rows in any side-effect table

## 8. Counts

- Workflow mutations: 0
- Duplicate workflows / parallel folders: 0
- Schema changes: 0
- Path 5 / MCP write: 0
- TR exec IDs (this mission): 7427 (UUID parse fail), 7428 (create_task probe)
- SQL invariant rescopings: 6 invariants updated
- SQL invariant validation: 1 case (C9-L1-V3) confirmed rescope works

## 9. What needs to happen for the matrix to be runnable

1. **Decide product priority** for completing module implementations:
   - `task_module.create_task` → INSERT INTO tasks
   - `reminder_module.create_reminder` → INSERT INTO reminders
   - `improvement_module.capture_feedback` → INSERT INTO improvement_log (or wherever)
2. **Extend PL intent map** to support memory writes:
   - Add `store_memory / supersede_memory / recall_memory` keys
   - Author `extractInputsForAction` extractors (need: content, memory_type, category,
     source_thread_id from goal text)
3. **Or** redesign matrix tests to validate plan-shape rather than DB side-effects (much
   weaker but unblocks immediate runs).

After (1) and (2): re-run Phase 0 v3 sequentially with the rescoped invariants.  Expect
real side-effects.  Then proceed Phase 1 P0.

## 10. Verdict line

**`E2E_DOMAIN_WRITES_MODE_PRODUCT_DECISION_REQUIRED`**

- F9 root cause traced (hardcoded in OR; not enforced gate).
- F13 + F14 identified as actual blockers (module stubs + missing PL routes).
- Empirical proof collected (TR 7428 create_task → 0 task rows).
- Harness mandatory fixes applied (SQL rescoping + sequential-by-design).
- No workflow patch; not in safe-fix envelope.
