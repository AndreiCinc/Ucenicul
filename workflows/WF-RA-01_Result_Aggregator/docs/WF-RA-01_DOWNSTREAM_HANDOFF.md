# WF-RA-01_DOWNSTREAM_HANDOFF

Chain position (per `docs/architecture/n8n_Workflow_Mapping.md`): TR → EC → OR → PL → DI → ME → **RA → SU** → RC → MO.

## Upstream producer — WF-ME-01 Module Execution (via fan-in layer)

**Invocation**: WF-DI-01 Dispatcher calls WF-ME-01 (one or more times, in parallel). WF-ME-01 returns a `module_result` envelope per step. WF-DI-01 or a fan-in layer collects the batch and calls WF-RA-01 via an n8n Execute Workflow node, binding to `RA_Input`.

**Envelope WF-ME-01 produces (canonical per WF-ME-01_CONTRACTS §3.a)**:
- Single `module_result` object with fields: `module_name`, `step_id`, `result_type`, `status`, `summary`, `actions_executed`, `artifacts`, `observations`, `proposals`, `confidence`, `needs_followup`, `followup_requests`
- Wrapped in success envelope: `status_kind=success`, `result_type=module_result`, `module_execution_started=true`, `domain_writes_performed=false`, `response_generation_allowed=false`

**Fan-in layer responsibility** (upstream of RA):
- Collect N module_result envelopes from ME
- Build canonical module_batch envelope with:
  - `status_kind=success`
  - `result_type=module_batch`
  - `execution_context_id`, `thread_id`, `tenant_id` (all echoed from plan)
  - `aggregation_input` with:
    - `aggregation_allowed=true`
    - `response_generation_allowed=false`
    - `module_execution_completed=true`
    - `domain_writes_performed=false`
    - `module_results=[ <collected module_result objects> ]`
    - `expected_step_ids=[ <step_ids from plan> ]`
  - `idempotency_key` optional (defaults to `"aggregate:{execution_context_id}"`)

**Upstream invariants WF-RA-01 relies on**:
1. Each module_result envelope contains all 12 required fields (module_name through followup_requests).
2. No duplicate step_ids across the batch.
3. All expected_step_ids are covered by returned module_results.
4. Guard flags are set correctly: aggregation_allowed=true, response_generation_allowed=false, module_execution_completed=true, domain_writes_performed=false.
5. The execution context row referenced by `execution_context_id` exists and is owned by `tenant_id`.

**If any upstream invariant is violated**, WF-RA-01 validates it at entry and returns `aggregation_error` with appropriate CANONICAL_ERROR_CODE (INVALID_AGGREGATION_INPUT, MISSING_MODULE_RESULTS, DUPLICATE_STEP_IDS, CONTEXT_MISMATCH, MISSING_REQUIRED_FIELDS) — it never throws; it never loses fail-closed posture (ref ra_logic.py lines 34–134).

## Downstream consumer — WF-SU-01 State + DB + Memory Update

**Handoff**: WF-RA-01 emits one canonical `aggregated_result` envelope through `RA_Return_Result` (or error envelope through `RA_Return_Error` / `RA_Return_Context_Error`). The caller (DI-01 or orchestrator) receives the envelope through the Execute Workflow response and forwards it to WF-SU-01's input (`SU_Input`).

**Envelope WF-RA-01 emits on success** (ref WF-RA-01_CONTRACTS §3.a):
```
{
  "status_kind": "success",
  "result_type": "aggregated_result",
  "execution_context_id": <echoed>,
  "thread_id": <echoed>,
  "tenant_id": <echoed>,
  "aggregated_result": {
    "status": "success" | "partial" | "failed" | "no_action",
    "summary": "...",
    "module_results_count": <count>,
    "module_names": [ ... ],
    "per_status_counts": { "success": <int>, "partial": <int>, "failed": <int>, "no_action": <int> },
    "actions_executed": [ ... (flattened) ],
    "artifacts": [ ... (flattened) ],
    "observations": [ ... (flattened) ],
    "proposals": [ ... (flattened) ],
    "confidence": <avg_confidence>,
    "needs_followup": <bool>,
    "followup_requests": [ ... (flattened) ],
    "expected_step_ids": [ ... (echoed from plan) ],
    "returned_step_ids": [ ... (extracted from module_results) ]
  },
  "state_update_allowed": true,
  "response_generation_allowed": false,
  "domain_writes_performed": false,
  "allowed_next_stage": "WF-SU-01"
}
```

**Envelope WF-RA-01 emits on error**:
```
{
  "status_kind": "error",
  "result_type": "aggregation_error",
  "error": {
    "code": <CANONICAL_ERROR_CODE>,
    "message": "...",
    "missing_fields": [ ... ],
    "details": { ... }
  }
}
```

**Downstream invariants preserved by WF-RA-01**:

| Invariant | Value at handoff (success) | Value at handoff (error) | Rationale |
|---|---|---|---|
| `status_kind` | `"success"` | `"error"` | Signals success/error path; used by downstream routing |
| `result_type` | `"aggregated_result"` | `"aggregation_error"` | Identifies envelope type; used by WF-SU-01 input contract |
| `state_update_allowed` | `true` | (not emitted) | Permits WF-SU-01 to mutate state; hard-coded in RA success path (ra_logic.py:201) |
| `response_generation_allowed` | `false` | (not emitted) | Prevents WF-RC-01 from composing response at this stage; hard-coded false (ra_logic.py:202) |
| `domain_writes_performed` | `false` | (not emitted) | Asserts RA never wrote to domain tables; preserved across all stages; checked by test family `sql_contract_validation` |
| `aggregated_result.status` | rollup of all module statuses per semantics | (not emitted) | WF-SU-01 uses this to determine next action (promote/fail/no-op) |
| `execution_context_id` / `thread_id` / `tenant_id` | exact echo of input values | (not emitted on error) | SU-01 uses these to re-key state mutation; RA preserves byte-for-byte |
| `aggregated_result.expected_step_ids` | exact echo from input aggregation_input.expected_step_ids | (not emitted) | SU-01 uses to validate plan coverage; must match input |
| `aggregated_result.returned_step_ids` | extracted from module_results[*].step_id | (not emitted) | SU-01 cross-checks against expected_step_ids to detect missing results |
| `aggregated_result.actions_executed` | flattened list of all module actions | (not emitted) | WF-RC-01 consumes for response composition; WF-SU-01 may log |
| `aggregated_result.artifacts` | flattened list of all module artifacts | (not emitted) | WF-SU-01 or memory layer persists; RC-01 may reference |
| `aggregated_result.module_names` | extracted from module_results[*].module_name | (not emitted) | WF-SU-01 uses for audit/logging |
| `aggregated_result.per_status_counts` | {success: <int>, partial: <int>, failed: <int>, no_action: <int>} | (not emitted) | WF-SU-01 uses to determine rollup action (all-success vs mixed vs fail) |
| `allowed_next_stage` | `"WF-SU-01"` | (not emitted on error) | Hard-coded signal; indicates RA recommends SU-01 as next stage; SU-01 is the only valid downstream |

## Boundary validation

- WF-RA-01 validates incoming envelope shape at `RA_Validate_Module_Batch` and `RA_Load_Execution_Context` (fail-closed on gap per ra_logic.py:44–125).
- WF-RA-01 enforces tenant + context match at `RA_Verify_Context_Match` (fail-closed on CONTEXT_MISMATCH via `RA_Route_Context_Ready`).
- Downstream (WF-SU-01) is responsible for validating WF-RA-01's output shape on its side (not specified here; out of scope).

## Data lineage

| Field | Populated by | Preserved through | Consumed by |
|---|---|---|---|
| `execution_context_id` | WF-EC-01 | OR, PL, DI, ME, RA, SU | SU-01 state-update key |
| `thread_id` | WF-TR-01 (origin) | EC→OR→PL→DI→ME→RA→SU | SU-01 thread grouping; audit trail |
| `tenant_id` | WF-TR-01 (origin) | all stages | RA cross-tenant guard, SU tenant-scoped mutation |
| `module_results[*].step_id` | WF-PL-01 | DI→ME→RA (aggregated into `aggregated_result.returned_step_ids`) | SU-01 plan-join key; RC-01 may reference |
| `module_results[*]` (all fields) | WF-ME-01 (new, per step) | RA aggregates into flattened arrays | SU-01 / RC-01 consume flattened actions, artifacts, proposals, observations |
| `aggregated_result.status` | WF-RA-01 rollup logic (new, ra_logic.py:137–149) | — | SU-01 routing decision (promote/fail/no-op) |
| `aggregated_result.confidence` | WF-RA-01 average (new, ra_logic.py:176) | — | SU-01 / memory layer audit |
| `error.code` | WF-RA-01 validation (new, on error) | — | SU-01 / RC-01 error-path handling |

## Version compatibility

- WF-RA-01 input/output envelope: locked at `wf-ra-01-source-pack-v1.0-live-closed`.
- A change to `CANONICAL_ERROR_CODES` (ra_logic.py:7–13), the `aggregated_result` shape (lines 179–205), or guard flag semantics (lines 74–81) is a breaking change against both WF-ME-01 (upstream) and WF-SU-01 (downstream); requires coordinated version bump + contract update on all three stages.
- Error codes are immutable at this closure level; new codes require architecture review and re-closure.

## Known non-invariants (informational, from closure)

- Live E2E closure (Cycle 5): executions 736 (V3 happy path), 737 (V5 context mismatch), 738 (V4 malformed batch) all completed successfully and handed off canonical envelopes to observability/test harness (downstream consumer simulation).
- DB drift verified post-closure: 0 across 5 domain tables (execution_contexts, tasks, reminders, messages, rag_memories).
- Response generation must remain `false` until WF-RC-01; if WF-SU-01 observes `response_generation_allowed=true`, it MUST reject the envelope.
