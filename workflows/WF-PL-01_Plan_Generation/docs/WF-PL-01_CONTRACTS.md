# WF-PL-01_CONTRACTS

Derived-from-evidence contract surface for WF-PL-01 Plan Generation.

Sources (all on-disk, no fabrication):
- `docs/WF-PL-01_NODE_MAP.md` (13 nodes)
- `docs/WF-PL-01_CONNECTION_MAP.md` (13 connections)
- `scripts/pl_logic.py`
- `reports/CLOSURE_REPORT__WF-PL-01.md`
- `sql/` (6 files)

---

## 1. Identity

- **Workflow code**: WF-PL-01
- **Role**: Plan Generation — receives validated OR (Orchestrator) handoff, returns canonical plan envelope or canonical error envelope.
- **Version**: `wf-pl-01-source-pack-v1.1-live-fix`
- **Tier**: CRITICAL
- **Upstream caller**: WF-OR-01 Orchestration (via Execute Workflow node or manual/chat trigger)
- **Downstream consumer**: WF-DI-01 Dispatcher (caller receives envelope back through the Execute Workflow response)

---

## 2. Input contract (OR handoff envelope)

Required top-level fields on input payload (ref `pl_logic.validate_or_handoff`, lines 104–161):

| Field | Type | Required value |
|---|---|---|
| `status_kind` | string | must equal `"success"` |
| `result_type` | string | must equal `"handoff"` |
| `payload` | object | see §2.a |

### 2.a `payload`

| Field | Type | Required state |
|---|---|---|
| `tenant_id` | string | non-empty |
| `thread_id` | string | non-empty |
| `execution_id` | string | non-empty |
| `trigger_message_id` | string | non-empty |
| `idempotency_key` | string | non-empty |
| `execution_status` | string | must equal `"initialized"` |
| `planning_allowed` | bool | must be `true` |
| `allowed_next_stage` | string | must equal `"WF-PL-01"` |
| `orchestrator_input` | object | required (may be empty) |
| `planner_context` | object | see §2.b |
| `warnings` | array | optional — defaults to `[]` |

### 2.b `planner_context`

Determines availability of goal and requested_actions. At least one of the following must be non-empty:

| Field | Type | Requirement |
|---|---|---|
| `goal` | string | if empty, fallback to `user_message_text` to construct goal |
| `user_message_text` | string | fallback source for goal if goal is empty |
| `primary_intent` | string | if provided, mapped to action via `INTENT_TO_ACTION` lookup |
| `requested_actions` | array | see §2.c; required if `goal` exists and `primary_intent` cannot be mapped |
| `inputs` | object | optional — action-specific input overrides |

### 2.c `requested_actions`

Array of action objects. Each action MUST have:

| Field | Type | Requirement |
|---|---|---|
| `action` | string | must be a key in `ACTION_TO_MODULE` (e.g., `create_task`, `list_tasks`, `create_reminder`, `store_memory`, `observe`) |
| `module_name` | string | optional — auto-resolved from `action` via `ACTION_TO_MODULE` if omitted |
| `purpose` | string | optional — defaults to `f"Execute {action_name}"` |
| `inputs` | object | optional — action-specific inputs |
| `depends_on` | array | optional — defaults to `[]` |
| `execution_mode` | string | optional — defaults to `"sequential"` |
| `expected_outputs` | array | optional — defaults to `[]` |
| `replan_if` | array | optional — defaults to `["failed"]` |
| `failure_policy` | string | optional — defaults to `"continue_with_notice"` |

---

## 3. Output contracts

### 3.a Success envelope (`plan`)

Returned by `PL_Return_Result`:

```
{
  "status_kind": "success",
  "result_type": "plan",
  "module_name": "plan_generation",
  "payload": {
    "plan_id": "plan:{execution_id}:v1",
    "execution_id": ...,
    "thread_id": ...,
    "goal": "...",
    "primary_intent": "..." | "multi_action_request",
    "reasoning_summary": "Generated N bounded step(s) from the validated orchestrator handoff.",
    "steps": [
      {
        "step_id": "step_01_...",
        "module_name": "task_module" | "reminder_module" | "memory_module" | "improvement_module" | "watcher_module_basic",
        "purpose": "...",
        "inputs": {...},
        "depends_on": [],
        "execution_mode": "sequential" | "parallel",
        "expected_outputs": [],
        "replan_if": ["failed"],
        "failure_policy": "continue_with_notice",
        "status": "pending"
      }
    ],
    "allowed_next_stage": "WF-DI-01",
    "dispatcher_input": {
      "dispatch_allowed": true,
      "module_execution_started": false,
      "response_generation_allowed": false,
      "domain_writes_performed": false
    },
    "warnings": [...]
  }
}
```

### 3.b Error envelope (`error`)

Returned by `PL_Return_Error`:

```
{
  "status_kind": "failed",
  "result_type": "error",
  "module_name": "plan_generation",
  "error": {
    "code": <one of CANONICAL_ERROR_CODES>,
    "message": "...",
    "missing_fields": [...]
  }
}
```

`CANONICAL_ERROR_CODES` (ref `pl_logic.py`:334–344):
- `INVALID_HANDOFF_INPUT` — missing top-level / payload fields; wrong status_kind/result_type; planning_allowed=false; allowed_next_stage≠WF-PL-01; execution_status≠initialized
- `CONTEXT_MISMATCH` — execution context row not found; tenant/thread/execution_id mismatch; execution_status does not match
- `INSUFFICIENT_PLANNING_CONTEXT` — missing goal AND no user_message_text; missing requested_actions AND primary_intent unmappable
- `PLAN_BUILD_FAILED` — could not resolve module for a requested action (action not in `ACTION_TO_MODULE`)

---

## 4. Routing invariants

1. `status_kind` on success output MUST be `"success"` (ref line 311); on error output MUST be `"failed"` (ref line 336).
2. `result_type` on success MUST be `"plan"`; on error MUST be `"error"`.
3. `module_name` on success MUST be `"plan_generation"`; on error MUST be `"plan_generation"`.
4. `allowed_next_stage` on success MUST be `"WF-DI-01"` (ref line 322).
5. `dispatcher_input` on success MUST include all four guard flags (dispatch_allowed=true, module_execution_started=false, response_generation_allowed=false, domain_writes_performed=false) (ref lines 323–328).
6. Cross-tenant guard: if `PL_Load_Execution_Context` returns a row, it MUST match `tenant_id`/`thread_id`/`execution_id` from handoff (ref `verify_context_match`, lines 192–199). Mismatch → `CONTEXT_MISMATCH`.
7. Context verification MUST fail-close first before evaluating planner_context completeness (ref `build_planner_input`, line 220).
8. Steps MUST be generated in order (step_01, step_02, ...) with step_id = `f"step_{idx:02d}_{action_name or 'action'}"` (ref line 298).

---

## 5. Error codes (full enumeration)

| Code | Triggered by |
|---|---|
| `INVALID_HANDOFF_INPUT` | Input is not dict; missing top-level fields (status_kind, result_type, payload); payload not dict; missing payload fields (tenant_id, thread_id, execution_id, trigger_message_id, idempotency_key, execution_status, planning_allowed, allowed_next_stage, orchestrator_input); status_kind≠"success"; result_type≠"handoff"; planning_allowed=false; allowed_next_stage≠"WF-PL-01"; execution_status≠"initialized" |
| `CONTEXT_MISMATCH` | `PL_Verify_Context_Match` returns ok=false; row is None in strict mode; execution_id/tenant_id/thread_id mismatch; status mismatch |
| `INSUFFICIENT_PLANNING_CONTEXT` | goal is empty AND user_message_text is empty; requested_actions is empty AND primary_intent is not mappable via `INTENT_TO_ACTION` |
| `PLAN_BUILD_FAILED` | Could not resolve module_name from action or explicit module_name in requested_actions[i] |

---

## 6. DB interactions (ref `sql/`)

Read paths:
- `01_schema_inspect.sql` — inspect `public.execution_contexts` schema
- `02_load_execution_context.sql` — load execution context by `execution_id`, `tenant_id`, `thread_id`
- `03_load_execution_context_by_idempotency.sql` — load execution context by `idempotency_key`

Fixtures:
- `10_fixtures_create.sql` — create test execution_contexts rows
- `11_fixtures_cleanup.sql` — cleanup test rows

Probes:
- `20_read_path_probe.sql` — verify read path after V1/V4/V5 execution

Write paths: **None — WF-PL-01 is read-only with respect to `execution_contexts`.**

---

## 7. Known non-contract invariants (from closure)

- 650/650 off-node test harness green (13 families × 50 tests).
- V1 shell integrity, V2 invalid handoff, V3 happy paths, V4 context mismatch, V5 cross-tenant isolation, V6 DB drift — all PASS per `docs/WF-PL-01_TEST_MATRIX.md` + closure evidence.
- Live runtime proof: exec 712 (V1 PASS), exec 713 (V4 PASS), exec 714 (V5 PASS).
- Upstream signal from WF-OR-01 carry-forward envelope confirmed correct in V1.

---

## 8. Versioning

- Contract surface locked at `wf-pl-01-source-pack-v1.1-live-fix`.
- Change control: any new error code, action type, or module_name MUST update this file AND the test matrix.
