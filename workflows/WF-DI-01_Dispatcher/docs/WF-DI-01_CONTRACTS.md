# WF-DI-01_CONTRACTS

Derived-from-evidence contract surface for WF-DI-01 Dispatcher.

Sources (all on-disk, no fabrication):
- `workflow/WF-DI-01_Dispatcher.json` (v1.1 chat-adapter fix)
- `docs/WF-DI-01_NODE_MAP.md` (13 nodes)
- `docs/WF-DI-01_CONNECTION_MAP.md` (13 edges)
- `scripts/di_logic.py`
- `reports/CLOSURE_REPORT__WF-DI-01.md`
- `sql/01..20` (7 files)

---

## 1. Identity

- **Workflow code**: WF-DI-01
- **Role**: Dispatcher — accepts validated plan from WF-PL-01, verifies execution context, resolves module dependencies, builds dispatch envelope with ready groups, returns canonical dispatch result or error to WF-ME-01.
- **Version**: `wf-di-01-source-pack-v1.1-chat-adapter-fix`
- **Tier**: CRITICAL
- **Upstream caller**: WF-PL-01 Plan Generation (via manual trigger, chat trigger, or Execute Workflow)
- **Downstream consumer**: WF-ME-01 Module Execution (receives dispatch payload via Execute Workflow response)

---

## 2. Input contract (plan envelope)

Required top-level fields on input payload (ref `di_logic.validate_plan_result`, lines 52–150):

| Field | Type | Required value |
|---|---|---|
| `status_kind` | string | must equal `"success"` |
| `result_type` | string | must equal `"plan"` |
| `payload` | object | see §2.a |

### 2.a `payload` (top-level)

| Field | Type | Required | Source |
|---|---|---|---|
| `tenant_id` | string | yes | from WF-EC-01 |
| `thread_id` | string | yes | from WF-TR-01 |
| `execution_id` | string | yes | from WF-EC-01 |
| `trigger_message_id` | string | yes | from WF-TR-01 |
| `idempotency_key` | string | yes | from WF-PL-01 or WF-EC-01 |
| `plan_id` | string | yes | from WF-PL-01 |
| `goal` | string | yes | from WF-OR-01 or WF-PL-01 |
| `primary_intent` | string | yes | from WF-OR-01 or WF-PL-01 |
| `steps` | array | yes, non-empty | from WF-PL-01 |
| `dispatcher_input` | object | yes | see §2.b |
| `warnings` | array | optional | from WF-PL-01 |

### 2.b `dispatcher_input` (gate flags)

| Field | Type | Required state |
|---|---|---|
| `dispatch_allowed` | bool | must be `true` (fail-closed if false) |
| `module_execution_started` | bool | must be `false` (fail-closed if already true) |
| `response_generation_allowed` | bool | must be `false` (fail-closed if true) |
| `domain_writes_performed` | bool | must be `false` (fail-closed if already true) |

### 2.c `steps` (array)

Each step object MUST contain:

| Field | Type | Required | Valid values |
|---|---|---|---|
| `step_id` | string | yes | non-empty |
| `module_name` | string | yes | must exist in MODULE_REGISTRY |
| `purpose` | string | yes | non-empty |
| `inputs` | object | yes | shape depends on module_name |
| `depends_on` | array | yes | list of step_id strings that exist in the plan |
| `execution_mode` | string | yes | `"sequential"` or `"parallel"` |
| `expected_outputs` | array | yes | list of strings |
| `replan_if` | array | yes | list of strings |
| `failure_policy` | string | yes | typically `"block_if_main_goal"` or `"continue_with_notice"` |
| `status` | string | yes | must equal `"pending"` |

---

## 3. Output contracts

### 3.a Success envelope (`dispatch` result)

Returned by `DI_Return_Result`:

```json
{
  "status_kind": "success",
  "result_type": "dispatch",
  "module_name": "dispatcher",
  "payload": {
    "tenant_id": "<from input>",
    "thread_id": "<from input>",
    "execution_id": "<from input>",
    "plan_id": "<from input>",
    "dispatch_id": "dispatch:<plan_id>:v1",
    "allowed_next_stage": "WF-ME-01",
    "ready_groups": [ ... ],
    "dispatch_guard": {
      "dispatch_allowed": true,
      "module_execution_started": false,
      "response_generation_allowed": false,
      "domain_writes_performed": false
    },
    "warnings": [ ... ]
  }
}
```

**ready_groups** structure (ref `di_logic.build_ready_steps`, lines 207–278):

```json
[
  {
    "group_id": "group:parallel:001" | "group:sequential:NNN",
    "execution_mode": "parallel" | "sequential",
    "step_ids": [ "step_id_1", "step_id_2", ... ],
    "module_requests": [
      {
        "execution_context_id": "<execution_id>",
        "thread_id": "<thread_id>",
        "step_id": "<step_id>",
        "module_name": "<module_name>",
        "purpose": "<purpose>",
        "inputs": { ... },
        "idempotency_key": "<idempotency_key>:<step_id>:dispatch:v1"
      },
      ...
    ]
  },
  ...
]
```

### 3.b Error envelope

Returned by `DI_Return_Error`:

```json
{
  "status_kind": "failed",
  "result_type": "error",
  "module_name": "dispatcher",
  "error": {
    "code": "<CANONICAL_ERROR_CODE>",
    "message": "<human-readable message>",
    "missing_fields": [ "<field_name>", ... ]
  }
}
```

`CANONICAL_ERROR_CODES` (ref `di_logic.py` lines 48–324):
- `INVALID_HANDOFF_INPUT` — input is not a dict, required top-level fields missing, invalid status_kind/result_type, or dispatcher_input gate flags are in wrong state
- `INVALID_PLAN` — steps array empty or malformed, step status not pending, execution_mode invalid, or step is missing required fields
- `CONTEXT_MISMATCH` — execution context row not found, or tenant_id/thread_id/execution_id mismatch, or status not initialized
- `UNKNOWN_MODULE` — step.module_name is not present in MODULE_REGISTRY
- Any other code is mapped to `INVALID_HANDOFF_INPUT` in error handling.

---

## 4. Routing invariants

1. All input-level gate flags (`dispatcher_input.*`) MUST be in the prescribed state on entry. Any deviation → `INVALID_PLAN` or `INVALID_HANDOFF_INPUT` error before context verification.

2. Execution context re-read (from `public.execution_contexts`): MUST match input on `execution_id`, `tenant_id`, `thread_id`, and status MUST be `initialized`. Mismatch → `CONTEXT_MISMATCH` error (fail-closed).

3. All steps' `module_name` values MUST exist in the static MODULE_REGISTRY. Missing module → `UNKNOWN_MODULE` error.

4. Dependency closure: every step in `depends_on` MUST have a corresponding `step_id` in the plan. Unknown dependency → `INVALID_PLAN` error.

5. Ready-group composition (ref `di_logic.build_ready_steps` lines 249–271):
   - Steps with `execution_mode == "parallel"` AND empty `depends_on` go into `ready_parallel` group.
   - All other steps go into sequential groups, each with `group_id = "group:sequential:NNN"` where NNN is 1-indexed.
   - If any parallel steps exist, they form a single group `"group:parallel:001"`.

6. `dispatch_id` is deterministically computed as `f"dispatch:{plan_id}:v1"` — idempotent on replay.

7. Per-step idempotency key is deterministically computed as `f"{idempotency_key}:{step_id}:dispatch:v1"` — idempotent on replay.

8. Dispatcher is strictly read-only: no writes to `public.execution_contexts` or any other table. V6 proof: zero DB drift (hash identical pre/post).

---

## 5. Error codes (full enumeration)

| Code | Triggered by | Source in di_logic.py |
|---|---|---|
| `INVALID_HANDOFF_INPUT` | Input is not dict; required top-level fields missing; status_kind != `"success"`; result_type != `"plan"`; payload not a dict; required payload fields missing; dispatcher_input gate flags wrong state | validate_plan_result, lines 52–99 |
| `INVALID_PLAN` | steps array empty/not list; step not dict; required step fields missing; step.status != `"pending"`; execution_mode not in `{"sequential", "parallel"}`; dispatcher_input gate flags wrong state | validate_plan_result, lines 86–110 |
| `CONTEXT_MISMATCH` | Execution context row is None/incomplete; execution_id/tenant_id/thread_id mismatch; status != `"initialized"` | verify_context_match, lines 170–196 |
| `UNKNOWN_MODULE` | step.module_name not in MODULE_REGISTRY | build_ready_steps, lines 225–231 |
| `INVALID_PLAN` (again) | step depends on unknown step_ids | build_ready_steps, lines 232–239 |

---

## 6. DB access (read-only)

Dispatcher queries the database for execution context validation only (ref `di_logic.py` line 334 calls `verify_context_match` which expects an optional `row` parameter — the row is hydrated by the n8n SQL node `DI_Load_Execution_Context`).

SQL node (`DI_Load_Execution_Context`):
- Query: `SELECT * FROM public.execution_contexts WHERE execution_id = $1;`
- Binding: `alwaysOutputData: true` (CRITICAL — ensures empty result set is emitted rather than short-circuited)
- Result: passed to `di_logic.verify_context_match(dispatch_input, row, strict_db_check=True)`

No writes performed by WF-DI-01.

---

## 7. MODULE_REGISTRY (static, ref di_logic.py lines 8–34)

```python
[
  { "module_name": "task_module", "module_type": "executor", "capabilities": ["create_task", "list_tasks", "update_task", "complete_task", "delete_task"] },
  { "module_name": "reminder_module", "module_type": "executor", "capabilities": ["create_reminder", "list_reminders", "update_reminder", "cancel_reminder"] },
  { "module_name": "memory_module", "module_type": "executor", "capabilities": ["store_memory", "search_memory"] },
  { "module_name": "improvement_module", "module_type": "executor", "capabilities": ["capture_feedback"] },
  { "module_name": "watcher_module_basic", "module_type": "observer", "capabilities": ["produce_observation"] }
]
```

---

## 8. Chat-input adapter (v1.1 fix, ref 17_STAGE_LOCK__WF-DI-01.md line 75)

The stage-entry validator `DI_Validate_Plan_Result.jsCode` includes a preamble:

```javascript
if (typeof input.chatInput === 'string' && !input.payload) {
  candidate = JSON.parse(input.chatInput);
} else {
  candidate = input.payload || input;
}
```

This ensures that both manual/structured input and chat-trigger wrapped input can be processed by the same validation path.

---

## 9. Contract versioning

- Input contract locked at plan envelope schema version `wf-pl-01-...` (any breaking change to plan output requires coordinated update with WF-PL-01).
- Output contract locked at dispatch envelope schema version `wf-di-01-source-pack-v1.1`.
- A change to CANONICAL_ERROR_CODES or MODULE_REGISTRY is a breaking change against WF-ME-01; requires coordinated version bump + contract update on both sides.
