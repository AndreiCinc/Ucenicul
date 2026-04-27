# WF-ME-01_CONTRACTS

Derived-from-evidence contract surface for WF-ME-01 Module Execution.

Sources (all on-disk, no fabrication):
- `workflow/WF-ME-01_Module_Execution.json` (v1.3 cross-tenant guard)
- `docs/WF-ME-01_NODE_MAP.md` (18 nodes)
- `docs/WF-ME-01_CONNECTION_MAP.md` (24 edges)
- `scripts/me_logic.py`
- `reports/CLOSURE_REPORT__WF-ME-01.md`
- `sql/01..21` (13 files)

---

## 1. Identity

- **Workflow code**: WF-ME-01
- **Role**: Module Execution — executes dispatcher-approved `task_module` step, returns canonical module_result or canonical module_error.
- **Version**: `wf-me-01-source-pack-v1.3-cross-tenant-guard`
- **Tier**: CRITICAL
- **Upstream caller**: WF-DI-01 Dispatcher (via Execute Workflow node `ME_Input`)
- **Downstream consumer**: WF-RA-01 Result Aggregator (caller receives envelope back through the Execute Workflow response)

---

## 2. Input contract (dispatcher envelope)

Required top-level fields on input payload (ref `me_logic.validate_dispatch_envelope`, lines 62–119):

| Field | Type | Required value |
|---|---|---|
| `status_kind` | string | must equal `"success"` |
| `result_type` | string | must equal `"dispatch"` |
| `execution_context_id` | string | non-empty |
| `thread_id` | string | non-empty |
| `tenant_id` | string | non-empty |
| `dispatcher_input` | object | see §2.a |
| `idempotency_key` | string | optional — defaults to `"dispatch:{step.step_id}"` |

### 2.a `dispatcher_input`

| Field | Type | Required state |
|---|---|---|
| `dispatch_allowed` | bool | must be `true` |
| `module_execution_started` | bool | must be `false` (fail-closed if already true) |
| `response_generation_allowed` | bool | must be `false` (fail-closed if true) |
| `domain_writes_performed` | bool | must be `false` (fail-closed if already true) |
| `step` | object | see §2.b |

### 2.b `step`

| Field | Type | Required |
|---|---|---|
| `step_id` | string | yes |
| `module_name` | string | yes — only `"task_module"` is supported in live mode |
| `purpose` | string | yes |
| `inputs` | object | yes — shape depends on `inputs.action` |
| `execution_mode` | string | yes |

### 2.c `step.inputs.action` routing

| Action | Required fields | Ref |
|---|---|---|
| `create_task` | `description` | me_logic.build_task_create_result |
| `list_tasks` | none (defaults: timeframe=all, status=open, limit=20) | build_task_list_result |
| `update_task` | one of `task_id` OR `title_match`, AND at least one patchable field (`title`/`description`/`priority`/`due_date`/`due_at`/`status`) | build_task_update_result |
| `complete_task` | one of `task_id` OR `title_match` | build_task_complete_result |
| `delete_task` | one of `task_id`, `title_match`, or `scope` | build_task_delete_result |

---

## 3. Output contracts

### 3.a Success envelope (`module_result`)

Returned by `ME_Return_Result`:

```
{
  "status_kind": "success",
  "result_type": "module_result",
  "execution_context_id": ...,
  "thread_id": ...,
  "tenant_id": ...,
  "module_result": {
    "module_name": "task_module",
    "step_id": ...,
    "result_type": "execution" | "analysis",
    "status": "success",
    "summary": "...",
    "observations": [],
    "proposals": [],
    "actions_executed": [ { "action": <action>, "details": {...} } ],
    "artifacts": [...],
    "confidence": 1.0,
    "needs_followup": false,
    "followup_requests": []
  },
  "module_execution_started": true,
  "domain_writes_performed": false,
  "response_generation_allowed": false
}
```

### 3.b Error envelope (`module_error`)

Returned by `ME_Return_Error`:

```
{
  "status_kind": "error",
  "result_type": "module_error",
  "error": {
    "code": <one of CANONICAL_ERROR_CODES>,
    "message": "...",
    "missing_fields": [...],
    "details": {...}
  }
}
```

`CANONICAL_ERROR_CODES` (ref `me_logic.py`:7–13):
- `INVALID_DISPATCH_INPUT`
- `CONTEXT_MISMATCH`
- `UNSUPPORTED_MODULE`
- `UNSUPPORTED_ACTION`
- `MISSING_REQUIRED_FIELDS`

Unknown codes are coerced to `INVALID_DISPATCH_INPUT` per `canonical_error()` line 48.

---

## 4. Routing invariants

1. `module_execution_started` MUST flip false→true between input and success output (not output on error).
2. `domain_writes_performed` MUST remain `false` on output. WF-ME-01 never performs domain writes.
3. `response_generation_allowed` MUST remain `false` on output. Response generation belongs to WF-RC-01.
4. Cross-tenant guard (`ME_Check_Context_Match`): loaded execution context's `tenant_id`/`thread_id`/`execution_context_id` MUST match input envelope. Any mismatch → `CONTEXT_MISMATCH` error.
5. Only `module_name == "task_module"` is supported. Any other value → `UNSUPPORTED_MODULE`.
6. Valid actions: `create_task`, `list_tasks`, `update_task`, `complete_task`, `delete_task`. Any other → `UNSUPPORTED_ACTION`.

---

## 5. Error codes (full enumeration)

| Code | Triggered by |
|---|---|
| `INVALID_DISPATCH_INPUT` | Missing required top-level fields; wrong status_kind/result_type; `dispatch_allowed=false`; `module_execution_started=true`; `response_generation_allowed=true`; `domain_writes_performed=true` |
| `MISSING_REQUIRED_FIELDS` | Missing step.* fields; missing action-specific required inputs |
| `CONTEXT_MISMATCH` | `ME_Check_Context_Match` assertion fails |
| `UNSUPPORTED_MODULE` | step.module_name ≠ task_module |
| `UNSUPPORTED_ACTION` | action ∉ {create_task, list_tasks, update_task, complete_task, delete_task} |

---

## 6. DB interactions (ref `sql/`)

Read paths:
- `02_load_execution_context.sql` — tenant+idempotency filtered load
- `03_load_dispatch_request.sql`
- `04_load_task_candidates.sql`

Write paths (canonical; not simulated by `me_logic.py`):
- `05_insert_task.sql`
- `06_update_task.sql`
- `07_complete_task.sql`
- `08_delete_task.sql`

Fixtures:
- `10_fixtures_create.sql`, `11_fixtures_cleanup.sql`

Probes:
- `20_read_path_probe.sql`, `21_write_path_probe.sql`

---

## 7. Known non-contract invariants (from closure)

- 650/650 off-node test harness green (13 families × 50 tests).
- V1 shell integrity, V2 invalid dispatch, V3 happy paths, V4 unsupported module, V5 cross-tenant, V6 DB drift — all PASS per `docs/WF-ME-01_TEST_MATRIX.md` + closure evidence.

---

## 8. Versioning

- Contract surface locked at `wf-me-01-source-pack-v1.3-cross-tenant-guard`.
- Change control: any new error code or action MUST update this file AND the test matrix.
