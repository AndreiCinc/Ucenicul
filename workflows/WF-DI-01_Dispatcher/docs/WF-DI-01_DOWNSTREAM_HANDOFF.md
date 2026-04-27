# WF-DI-01_DOWNSTREAM_HANDOFF

Chain position (per `docs/architecture/n8n_Workflow_Mapping.md`): TR → EC → OR → PL → **DI → ME** → RA → SU → RC → MO.

---

## Upstream producer — WF-PL-01 Plan Generation

**Invocation**: WF-PL-01 generates a plan and either:
- Returns it directly via API (if called from WF-OR-01), or
- Triggers WF-DI-01 via Execute Workflow node, passing the plan envelope

**Envelope WF-PL-01 must produce (WF-DI-01 input contract; ref `WF-DI-01_CONTRACTS.md` §2)**:
- `status_kind = "success"`
- `result_type = "plan"`
- `payload` with all required fields: `tenant_id`, `thread_id`, `execution_id`, `trigger_message_id`, `idempotency_key`, `plan_id`, `goal`, `primary_intent`, `steps`, `dispatcher_input`, `warnings`
- `dispatcher_input` with flags: `dispatch_allowed = true`, `module_execution_started = false`, `response_generation_allowed = false`, `domain_writes_performed = false`
- `steps` array non-empty, each step with required fields: `step_id`, `module_name`, `purpose`, `inputs`, `depends_on`, `execution_mode`, `expected_outputs`, `replan_if`, `failure_policy`, `status = "pending"`

**Upstream invariants WF-DI-01 relies on**:
1. The plan envelope has passed WF-PL-01's own validation and normalization.
2. All steps' `module_name` values are plausible candidates for execution (though WF-DI-01 re-validates against MODULE_REGISTRY).
3. The execution context row referenced by `execution_id` exists and is owned by `tenant_id` (WF-DI-01 re-asserts via context verification).
4. The idempotency_key is globally unique per execution thread (WF-DI-01 relies on this for deterministic dispatch_id and per-step key construction).

**If any upstream invariant is violated**, WF-DI-01 returns `error` envelope with an appropriate CANONICAL_ERROR_CODE — it never throws; it never loses fail-closed posture.

---

## Dispatcher processing (WF-DI-01 internal contract)

WF-DI-01 performs the following transformations on the plan envelope:

1. **Validation** (`DI_Validate_Plan_Result`): Validates envelope structure, required fields, dispatcher_input gate flags, step schema.
   - On failure → `DI_Return_Error` with code `INVALID_HANDOFF_INPUT` or `INVALID_PLAN`.

2. **Extraction** (`DI_Extract_Dispatch_Input`): Extracts key fields into a dispatcher-internal format for downstream processing.

3. **Context verification** (`DI_Load_Execution_Context` + `DI_Verify_Context_Match`): Re-reads execution context from `public.execution_contexts`, asserts match on `execution_id`, `tenant_id`, `thread_id`, and status.
   - On mismatch → `DI_Return_Error` with code `CONTEXT_MISMATCH` (fail-closed).

4. **Registry resolution** (`DI_Load_Module_Registry`): Emits static MODULE_REGISTRY for dependency grouping.

5. **Dependency grouping** (`DI_Build_Ready_Steps`): 
   - Validates all step `module_name` values exist in registry.
   - Validates all `depends_on` references resolve to step_ids in the plan.
   - Classifies steps into parallel-eligible (execution_mode=parallel, no dependencies) and sequential groups.
   - Constructs per-step `module_request` objects with derived idempotency keys.
   - On error → `DI_Return_Error` with code `UNKNOWN_MODULE` or `INVALID_PLAN`.

6. **Dispatch envelope generation** (`DI_Build_Dispatch_Payload`): Constructs the canonical dispatch envelope with ready_groups and dispatch_guard.

---

## Downstream consumer — WF-ME-01 Module Execution

**Handoff method**: WF-DI-01 invokes WF-ME-01 via an n8n Execute Workflow node, binding the dispatch envelope to the `ME_Input` entry point. WF-DI-01 then awaits the response and returns it unchanged to the caller.

**Envelope WF-DI-01 emits (WF-ME-01 input contract; ref WF-DI-01_CONTRACTS.md §3.a)**:
- On success path (`DI_Return_Result`): canonical `dispatch` envelope with:
  - `status_kind = "success"`
  - `result_type = "dispatch"`
  - `module_name = "dispatcher"`
  - `payload` with fields: `tenant_id`, `thread_id`, `execution_id`, `plan_id`, `dispatch_id`, `allowed_next_stage`, `ready_groups`, `dispatch_guard`, `warnings`

- On error path (`DI_Return_Error`): canonical `error` envelope with:
  - `status_kind = "failed"`
  - `result_type = "error"`
  - `module_name = "dispatcher"`
  - `error` with fields: `code`, `message`, `missing_fields`

**Downstream invariants preserved by WF-DI-01**:

| Invariant | Value at handoff (success) | Value at handoff (error) | Rationale |
|---|---|---|---|
| `status_kind` | `"success"` | `"failed"` | Signal success/failure to downstream |
| `result_type` | `"dispatch"` | `"error"` | Signal result type to downstream |
| `module_name` | `"dispatcher"` | `"dispatcher"` | Attribution of origin stage |
| `allowed_next_stage` | `"WF-ME-01"` | (not present) | Tells WF-ME-01 that it is indeed the next stage |
| `dispatch_guard.dispatch_allowed` | `true` | (not present) | Flag remains true on success, indicating dispatch is allowed |
| `dispatch_guard.module_execution_started` | `false` | (not present) | Flag remains false, indicating WF-ME-01 has not yet started module execution |
| `dispatch_guard.response_generation_allowed` | `false` | (not present) | Flag remains false, response generation is WF-RC-01's role |
| `dispatch_guard.domain_writes_performed` | `false` | (not present) | Flag remains false, dispatcher performs no writes |
| `tenant_id` | (exact echo) | (not present on error path) | Preservation for downstream context tracking |
| `thread_id` | (exact echo) | (not present on error path) | Preservation for downstream context tracking |
| `execution_id` | (exact echo) | (not present on error path) | Preservation for downstream context tracking |
| `ready_groups` | Non-empty array of groups | (not present on error path) | Array of execution groups for WF-ME-01 to process |
| `dispatch_id` | `f"dispatch:{plan_id}:v1"` | (not present on error path) | Deterministic dispatch identifier, stable on replay |
| `error.code` | (not present on success) | One of CANONICAL_ERROR_CODES | Error classification for WF-ME-01 error handling |

---

## ready_groups structure (success path only)

Emitted by `DI_Build_Ready_Steps` and passed through to `DI_Return_Result`:

```json
[
  {
    "group_id": "group:parallel:001",
    "execution_mode": "parallel",
    "step_ids": ["step_A", "step_B"],
    "module_requests": [
      {
        "execution_context_id": "...",
        "thread_id": "...",
        "step_id": "step_A",
        "module_name": "task_module",
        "purpose": "...",
        "inputs": { ... },
        "idempotency_key": "<root_key>:step_A:dispatch:v1"
      },
      ...
    ]
  },
  {
    "group_id": "group:sequential:001",
    "execution_mode": "sequential",
    "step_ids": ["step_C"],
    "module_requests": [
      {
        "execution_context_id": "...",
        "thread_id": "...",
        "step_id": "step_C",
        "module_name": "reminder_module",
        "purpose": "...",
        "inputs": { ... },
        "idempotency_key": "<root_key>:step_C:dispatch:v1"
      }
    ]
  }
]
```

**WF-ME-01 responsibility**: Iterate through `ready_groups` in order, execute each group's `module_requests` according to `execution_mode` (parallel or sequential), and collect results.

---

## CANONICAL_ERROR_CODES (full enumeration)

All error codes are defined in `di_logic.py` and are emitted by `DI_Return_Error`:

| Code | Meaning | Triggered by | WF-ME-01 action |
|---|---|---|---|
| `INVALID_HANDOFF_INPUT` | Input envelope malformed or required fields missing | Envelope validation failure in `DI_Validate_Plan_Result` | Return module_error with code, fail-closed |
| `INVALID_PLAN` | Plan steps malformed, inconsistent, or dispatcher_input flags wrong | Step validation failure or gate flag validation in `DI_Validate_Plan_Result` or dependency validation in `DI_Build_Ready_Steps` | Return module_error with code, fail-closed |
| `CONTEXT_MISMATCH` | Execution context row not found or execution_id/tenant_id/thread_id mismatch | Context verification failure in `DI_Verify_Context_Match` | Return module_error with code, fail-closed |
| `UNKNOWN_MODULE` | step.module_name not in MODULE_REGISTRY | Registry lookup failure in `DI_Build_Ready_Steps` | Return module_error with code, fail-closed |

WF-ME-01 must treat all error codes uniformly: log the error, return a module_error envelope, and never attempt recovery or re-planning from a dispatcher error (recovery is WF-RA-01's and WF-RC-01's responsibility).

---

## Boundary validation

- **WF-DI-01 responsibility**: Validate incoming plan envelope shape, context match, module registry, dependency closure. Emit error envelope on any failure.
- **WF-ME-01 responsibility**: Validate incoming dispatch envelope shape (assume structure is correct, but validate presence of required fields). Emit module_error envelope on any failure.
- **WF-RA-01 responsibility** (downstream of WF-ME-01): Validate WF-ME-01's output shape, aggregate module results across ready_groups, emit aggregated result envelope.

---

## Data lineage (complete chain)

| Field | Populated by | Preserved through | Consumed by |
|---|---|---|---|
| `tenant_id` | WF-EC-01 | OR, PL, DI, ME, RA, SU | SU for state updates; RC for response scoping |
| `thread_id` | WF-TR-01 | EC, OR, PL, DI, ME, RA, SU, RC | RC for message threading |
| `execution_id` | WF-EC-01 | OR, PL, DI, ME, RA, SU | RA join key; SU state updates |
| `execution_context_id` | WF-EC-01 | EC→OR→PL→DI→ME→RA | WF-ME-01 context match assertion; RA re-keying |
| `plan_id` | WF-PL-01 | DI, ME (echo), RA | RA aggregate result grouping |
| `dispatch_id` | WF-DI-01 (new) | — | Audit trail; may be used by RA or RC |
| `step_id` | WF-PL-01 | DI (propagated in ready_groups), ME→RA | RA plan-join key |
| `module_request` | WF-DI-01 (constructed) | — | WF-ME-01 consumes from ready_groups |
| `idempotency_key` | WF-EC-01 + WF-DI-01 (extended per-step) | DI→ME→RA | ME step-level deduplication; RA cross-step consistency |
| `dispatch_guard` | WF-DI-01 (constructed) | — | WF-ME-01 validates on entry; RA validates on aggregation |

---

## Version compatibility & breaking changes

- **Dispatch envelope version**: locked at `wf-di-01-source-pack-v1.1-chat-adapter-fix`.
- **CANONICAL_ERROR_CODES**: Any addition or removal is a breaking change against WF-ME-01; requires coordinated version bump on both sides.
- **ready_groups structure**: Any change to the group object schema (e.g., adding/removing fields) is a breaking change against WF-ME-01.
- **dispatch_guard fields**: Any change to the guard flags is a breaking change against downstream consumers (WF-ME-01, WF-RA-01).

---

## Known limitations / not documented in on-disk evidence

- Partial dispatch (executing only a subset of ready_groups): not documented.
- Async invocation of WF-ME-01 (fire-and-forget vs. wait-and-return): not documented.
- Timeout / retry behavior on WF-ME-01 invocation: not documented.
- Circuit-breaker or fallback strategies if WF-ME-01 is unavailable: not documented.
