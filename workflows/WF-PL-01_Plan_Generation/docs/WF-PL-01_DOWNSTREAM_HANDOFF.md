# WF-PL-01_DOWNSTREAM_HANDOFF

Envelope shape, invariants, and data flow across WF-PL-01 upstream and downstream boundaries.

Reference: The workflow chain is TR→EC→OR→PL→DI→ME→RA→SU→RC→MO. WF-PL-01 sits between WF-OR-01 and WF-DI-01.

---

## Upstream boundary (WF-OR-01 → WF-PL-01)

### Producer: WF-OR-01 Orchestration

WF-OR-01 produces a validated OR handoff envelope and calls WF-PL-01 via Execute Workflow with that envelope as input.

### Handoff envelope shape (upstream)

```
{
  "status_kind": "success",
  "result_type": "handoff",
  "module_name": "orchestrator_input_handoff",
  "payload": {
    "tenant_id": <UUID>,
    "thread_id": <UUID>,
    "execution_id": <UUID>,
    "trigger_message_id": <UUID>,
    "idempotency_key": <string>,
    "execution_status": "initialized",
    "planning_allowed": true,
    "allowed_next_stage": "WF-PL-01",
    "orchestrator_input": {
      "planning_mode": "plan_only",
      "module_execution_allowed": false,
      "response_generation_allowed": false,
      "domain_writes_allowed": false
    },
    "planner_context": {
      "goal": <string> | null,
      "user_message_text": <string> | null,
      "primary_intent": <string> | null,
      "requested_actions": [
        {
          "action": <action_name>,
          "module_name": <module_name> | null,
          "purpose": <string> | null,
          "inputs": <object> | null,
          "depends_on": [<step_ids>] | [],
          "execution_mode": "sequential" | "parallel",
          "expected_outputs": [] | [<output_specs>],
          "replan_if": ["failed"] | [<replan_conditions>],
          "failure_policy": "continue_with_notice" | <other_policies>
        }
      ],
      "inputs": <object> | null,
      "warnings": [<warning_strings>]
    },
    "warnings": [<warning_strings>]
  }
}
```

### Handoff invariants (upstream to WF-PL-01)

1. **status_kind** MUST be `"success"` (fail-closed if not).
2. **result_type** MUST be `"handoff"` (fail-closed if not).
3. **planning_allowed** MUST be `true` (fail-closed if false).
4. **allowed_next_stage** MUST be `"WF-PL-01"` (fail-closed if not).
5. **execution_status** MUST be `"initialized"` (fail-closed if not).
6. **tenant_id**, **thread_id**, **execution_id** MUST be non-empty UUIDs (fail-closed if empty).
7. **idempotency_key** MUST be non-empty (fail-closed if empty).
8. At least one of **goal**, **user_message_text**, or **primary_intent** MUST be non-empty; if goal is empty, WF-PL-01 uses user_message_text as fallback (fail-closed if all are empty).
9. If **requested_actions** is empty, **primary_intent** MUST be mappable via `INTENT_TO_ACTION` (fail-closed if not).
10. All array fields (**requested_actions**, **warnings**, **expected_outputs**, **replan_if**, **depends_on**) default to `[]` if omitted or null.

---

## Downstream boundary (WF-PL-01 → WF-DI-01)

### Consumer: WF-DI-01 Dispatcher

WF-DI-01 receives the plan envelope from WF-PL-01 (via Execute Workflow response) and uses it to dispatch module execution steps.

### Plan envelope shape (downstream)

WF-PL-01 produces a **success plan envelope** (on happy path):

```
{
  "status_kind": "success",
  "result_type": "plan",
  "module_name": "plan_generation",
  "payload": {
    "plan_id": "plan:{execution_id}:v1",
    "execution_id": <UUID>,
    "thread_id": <UUID>,
    "goal": <string>,
    "primary_intent": <string> | "multi_action_request",
    "reasoning_summary": "Generated N bounded step(s) from the validated orchestrator handoff.",
    "steps": [
      {
        "step_id": "step_01_<action_name>",
        "module_name": "task_module" | "reminder_module" | "memory_module" | "improvement_module" | "watcher_module_basic",
        "purpose": <string>,
        "inputs": <object>,
        "depends_on": [<step_ids>] | [],
        "execution_mode": "sequential" | "parallel",
        "expected_outputs": [] | [<specs>],
        "replan_if": ["failed"] | [<conditions>],
        "failure_policy": "continue_with_notice" | <policy>,
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
    "warnings": [<warning_strings>]
  }
}
```

Or on **error path**:

```
{
  "status_kind": "failed",
  "result_type": "error",
  "module_name": "plan_generation",
  "error": {
    "code": "INVALID_HANDOFF_INPUT" | "CONTEXT_MISMATCH" | "INSUFFICIENT_PLANNING_CONTEXT" | "PLAN_BUILD_FAILED",
    "message": <string>,
    "missing_fields": [<field_paths>]
  }
}
```

### Handoff invariants (WF-PL-01 to downstream)

**On success:**

1. **status_kind** MUST be `"success"` (never `"failed"` on successful plan generation).
2. **result_type** MUST be `"plan"`.
3. **module_name** MUST be `"plan_generation"`.
4. **plan_id** format MUST be `"plan:{execution_id}:v1"`.
5. **execution_id** MUST match the input execution_id from OR handoff.
6. **thread_id** MUST match the input thread_id from OR handoff.
7. **allowed_next_stage** MUST be `"WF-DI-01"`.
8. **dispatcher_input** MUST include all four flags:
   - `dispatch_allowed: true` (enables DI-01 to proceed)
   - `module_execution_started: false` (DI-01 has not yet executed modules)
   - `response_generation_allowed: false` (response composition belongs to WF-RC-01)
   - `domain_writes_performed: false` (plan generation does not perform domain writes)
9. **steps** array MUST contain at least one step (empty steps array is an error; should emit PLAN_BUILD_FAILED).
10. Each step MUST have:
    - **step_id** formatted as `"step_{idx:02d}_{action_name or 'action'}"` (e.g., `step_01_create_task`)
    - **module_name** matching one of the known modules (task_module, reminder_module, memory_module, improvement_module, watcher_module_basic)
    - **status** = `"pending"` (initially; DI-01 transitions this)
    - **execution_mode** present (defaults to `"sequential"`)
    - **failure_policy** present (defaults to `"continue_with_notice"`)
11. **primary_intent** MUST be one of:
    - A mapped intent value from `INTENT_TO_ACTION` (e.g., `create_task`, `list_reminders`)
    - `"multi_action_request"` (if multiple actions or unmappable intent)

**On error:**

1. **status_kind** MUST be `"failed"`.
2. **result_type** MUST be `"error"`.
3. **error.code** MUST be one of the canonical error codes.
4. **error.missing_fields** MUST be a non-empty array listing the problematic field paths.

---

## Data lineage (field mappings across boundaries)

| Field | WF-OR-01 source | WF-PL-01 processing | WF-DI-01 consumption | Notes |
|---|---|---|---|---|
| `execution_id` | Generated by OR or upstream | Passed through | Forwarded to module execution steps | Immutable identifier; cross-tenant guard key |
| `tenant_id` | Provided by OR | Verified against execution_contexts DB row | Not re-emitted in plan (forwarded separately in envelope metadata) | Read-only verification; WF-PL-01 does not modify |
| `thread_id` | Provided by OR | Verified against execution_contexts DB row | Forwarded in plan.payload.thread_id | Cross-tenant guard key |
| `goal` | From planner_context.goal or constructed from user_message_text | Normalized and validated | Forwarded in plan.payload.goal | Used by DI-01 for step selection logic |
| `primary_intent` | From planner_context.primary_intent or derived from requested_actions | Mapped via ACTION_TO_MODULE or set to "multi_action_request" | Forwarded in plan.payload.primary_intent | Used for routing and summary generation |
| `requested_actions` | Array from planner_context | Converted to steps array with step_id + status | Referenced indirectly via steps (not re-emitted) | One-to-one mapping: action → step |
| `warnings` | From OR payload.warnings | Propagated (deduplicated) | Forwarded in plan.payload.warnings | Informational; does not block execution |
| `dispatcher_input` | Not present in OR handoff | Generated by PL-01 | Consumed by DI-01 to enable/disable next stages | Guard flags; critical for stage boundaries |

---

## Boundary validation

### WF-OR-01 → WF-PL-01 (ingress)

WF-PL-01 ingress validation (`PL_Validate_OR_Handoff`):
- **Required**: all top-level and payload fields per §2 of CONTRACTS
- **Fail-closed**: any missing or invalid field → `INVALID_HANDOFF_INPUT` error (never proceeds)
- **Execution context verification** (`PL_Verify_Context_Match`):
  - Loads row from `public.execution_contexts` by `(execution_id, tenant_id, thread_id)`
  - Verifies `tenant_id`, `thread_id`, `execution_id`, `status` match
  - Fail-closed: mismatch or missing row → `CONTEXT_MISMATCH` error (never proceeds to plan generation)

### WF-PL-01 → WF-DI-01 (egress)

WF-DI-01 egress validation (not performed by WF-PL-01; DI-01 owns this):
- Expected: plan envelope with `dispatcher_input.dispatch_allowed = true`
- DI-01 will validate step structure and module_name existence
- Fail-closed: if WF-PL-01 emits error envelope, DI-01 MUST NOT attempt module dispatch

---

## Idempotency contract

WF-PL-01 does not persist plan rows; it delegates plan persistence to WF-DI-01. However, WF-PL-01 uses `idempotency_key` for:
- Oracle deduplication in test harness
- Potential replay detection (if called multiple times with same key)
- Script-level test family `replay_idempotency` validates that **same input → same plan structure** (step IDs may be consistent; plan_id uses execution_id not idempotency_key)

---

## Known limitations / Not documented in evidence

- WF-DI-01 egress validation spec (DI-01 contract) — not yet written; assumed to be in WF-DI-01 CONTRACTS.md when DI-01 is activated.
- Plan persistence layer (which service/stage persists execution_plans rows) — not documented; assumed to be owned by WF-DI-01 or WF-RA-01.
- Fallback behavior if WF-DI-01 is not yet active but WF-PL-01 is called standalone — not documented; test harness does not cover this scenario.
- Cross-stage message transformation (e.g., if field names change between OR/PL/DI versions) — not documented; version string in source pack (`v1.1-live-fix`) implies backward compatibility but no explicit versioning spec.
