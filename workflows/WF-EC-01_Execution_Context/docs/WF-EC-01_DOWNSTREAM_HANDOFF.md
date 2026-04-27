# WF-EC-01 — Downstream Handoff

**Date:** 2026-04-19
**Status:** CLOSED 10/10; handoff contract verified structurally (not yet end-to-end live)
**Chain position:** Stage 3 (EC-01) → Stage 4 (OR-01)

This document specifies the canonical output envelope that EC-01 produces for downstream consumption by WF-OR-01 Orchestrator, and the pre-conditions OR-01 must satisfy to accept the handoff.

---

## 1. EC-01 output envelope (canonical)

EC-01 returns this shape on every success path (first insert, idempotent replay, or TR-envelope replay):

```json
{
  "id": "<uuid>",
  "tenant_id": "<uuid>",
  "thread_id": "<uuid>",
  "trigger_message_id": "<uuid>",
  "status": "initialized",
  "current_goal": null,
  "current_plan_ref": null,
  "pending_steps": [],
  "completed_steps": [],
  "created_at": "<ISO8601>",
  "updated_at": "<ISO8601>",
  "error": null,
  "module_name": "execution_context_init",
  "result_type": "state",
  "status_kind": "success"
}
```

**Invariants:**
- `id` is a valid UUID (the row's primary key in `execution_contexts`).
- `tenant_id`, `thread_id`, `trigger_message_id` are echoed from input.
- `status` is always `'initialized'` (EC-01's only responsibility).
- `current_goal` and `current_plan_ref` are always `null` (set by later stages).
- `pending_steps` and `completed_steps` are empty arrays (populated by OR, PL, DI, ME).
- `created_at` and `updated_at` are ISO8601 timestamps (set by Postgres).
- `error` is always `null` on success (no error codes from EC-01 success path).
- Top-level terminal envelope fields: `module_name`, `result_type`, `status_kind` are always present and constant.

---

## 2. OR-01 input requirements

### 2.1 Expected input envelope shape

OR-01 expects to receive input matching the EC-01 output envelope:

```json
{
  "id": "<execution_context_id>",
  "tenant_id": "<uuid>",
  "thread_id": "<uuid>",
  "trigger_message_id": "<uuid>",
  "status": "initialized",
  "pending_steps": [],
  "completed_steps": [],
  ...
}
```

**Required fields for OR-01 to proceed with planning:**
- `id` (execution_context_id, foreign key for all downstream stages)
- `tenant_id`
- `thread_id`
- `status='initialized'`
- `pending_steps` and `completed_steps` (for state tracking)

**Optional fields OR-01 may consume:**
- `trigger_message_id`
- `current_goal`, `current_plan_ref` (already null from EC-01; OR will populate)
- Terminal envelope fields (module_name, result_type, status_kind)

### 2.2 OR-01 pre-conditions for handoff acceptance

For OR-01 to successfully accept EC-01's output:

1. **Trigger:** OR-01 must expose an `executeWorkflowTrigger` to be called by the chain orchestrator (or EC-01 directly, if Link 2 is direct).
2. **Validation:** OR-01 must validate that `status='initialized'` (not some other state).
3. **State storage:** OR-01 must read and store the `id` for all subsequent writes to the same `execution_contexts` row.
4. **Error handling:** OR-01 must handle the case where `error !== null` (should not happen on EC-01 success, but chain discipline requires defensive checks).

---

## 3. Link 2 wiring status (current: not implemented)

**Current state:** EC-01 outputs to `EC_Return_Result` terminal. No downstream sub-call node wired.

**Blocker:** OR-01 has no active `executeWorkflowTrigger` yet (per `WF-E2E-01_CHAIN_READINESS_REVIEW.md`, OR-01 is "10 nodes / 9 edges shell only").

**Closure impact:** EC-01 closure does NOT require Link 2 to be wired. EC-01 is complete when:
- Shell is built (done in Phase 4 ✅)
- V1-V7 tests pass (done in Phase 5 ✅)
- Output envelope is spec-compliant (done ✅)

**Next step:** OR-01 closure cycle will wire the intake trigger and request the EC→OR handoff edge.

---

## 4. Output envelope validation

### 4.1 Positive case (happy path)

**Test:** V3 execution 767 with flat input.

**EC-01 output:**
```json
{
  "id": "9193176b-5ff0-480b-b1dc-feee3f861367",
  "tenant_id": "<V3_test_tenant>",
  "thread_id": "<V3_test_thread>",
  "trigger_message_id": "<V3_test_msg>",
  "status": "initialized",
  "current_goal": null,
  "current_plan_ref": null,
  "pending_steps": [],
  "completed_steps": [],
  "created_at": "2026-04-18T21:10:39.288Z",
  "updated_at": "2026-04-18T21:10:39.288Z",
  "error": null,
  "module_name": "execution_context_init",
  "result_type": "state",
  "status_kind": "success"
}
```

**OR-01 can consume:** ✅ All required fields present, types valid.

### 4.2 Envelope variation case (nested TR-input)

**Test:** V6 execution 773 with nested `{request:{...}}` shape.

**EC-01 output:** Same envelope shape as V3 (adapter normalized nested input to flat processing).

**OR-01 can consume:** ✅ Adapter is transparent; output is identical.

### 4.3 Idempotent case (replay)

**Test:** V4 execution 769 (replay of V3 fixture).

**EC-01 output:** Byte-identical to V3.

**OR-01 can consume:** ✅ Same id, same created_at; OR treats as idempotent.

---

## 5. DB state for downstream (post-EC-01)

After EC-01 completes, `public.execution_contexts` row exists with:

```sql
SELECT * FROM public.execution_contexts WHERE id = '9193176b-5ff0-480b-b1dc-feee3f861367';
```

Output:
```
 id                   | 9193176b-5ff0-480b-b1dc-feee3f861367
 tenant_id            | <UUID>
 thread_id            | <UUID>
 trigger_message_id   | <UUID>
 status               | initialized
 current_goal         | (null)
 current_plan_ref     | (null)
 pending_steps        | []
 completed_steps      | []
 idempotency_key      | wf_ec_01_fixture_v3_happy_20260419T0000Z
 expires_at           | 2026-04-18T21:25:39.288Z
 created_at           | 2026-04-18T21:10:39.288Z
 updated_at           | 2026-04-18T21:10:39.288Z
 module_results       | (null or [])
 working_notes        | (null or {})
 shared_artifacts     | (null or [])
 error_state          | (null)
 retry_state          | (null)
```

**For OR-01 to read:**
- Use `id` as the primary key for subsequent writes (via SQL UPDATE or workflow nodes that call OR's own DB write nodes).
- Respect `status` — if not `'initialized'`, something has drifted; log/alert.
- Update `current_goal` and `current_plan_ref` once planning completes.
- Append to `pending_steps` and `completed_steps` as steps are discovered/completed.

---

## 6. Downstream schema evolution (caveat)

**Note:** The 4 observability columns (`module_results`, `working_notes`, `shared_artifacts`, `error_state`, `retry_state`) are nullable and defaulted. EC-01 does not populate them.

**Downstream stages populate them:**
- OR-01: `module_results` (planning result), `current_goal`, `current_plan_ref`
- PL-01: `module_results` (plan envelope)
- DI-01: `module_results` (dispatch result)
- ME-01: `module_results` (execution result)
- RA-01: `module_results` (aggregation result)
- SU-01: `module_results` (submission result), `completed_at`
- RC-01: `module_results` (review/composition result)
- MO-01: `module_results` (message/output envelope)

**OR-01 responsibility:** Do not assume these fields are populated by EC-01. Treat them as pre-entry for planning logic.

---

## 7. Error envelope (EC-01 failure path)

On invalid input, EC-01 does NOT advance to OR-01. Instead, it returns an error envelope:

```json
{
  "error": {
    "code": "INVALID_INPUT | INVALID_UUID | INVALID_RESOLVED_AT | IDEMPOTENCY_KEY_TOO_LONG",
    "missing_fields": ["tenant_id", ...],
    "message": "<string>"
  },
  "module_name": "execution_context_init",
  "result_type": "error",
  "status_kind": "failure"
}
```

**No downstream handoff on error:** This output terminates in `EC_Return_Error`. The chain stops (or caller retries with fixed input).

**Test coverage:** V2 execution 765 (missing tenant_id).

---

## 8. Envelope extension conventions (chain-wide)

The EC-01 output envelope follows the standardized chain-terminal conventions established by SU-01, RC-01, and MO-01:

```json
{
  // Stage-specific payload
  "id": "...",
  "tenant_id": "...",
  ...
  
  // Terminal envelope (present on ALL stage outputs)
  "error": null,              // OR <{code, message, ...}> on error
  "module_name": "...",       // e.g., "execution_context_init"
  "result_type": "state",     // OR "error"
  "status_kind": "success"    // OR "failure"
}
```

**Implication for OR-01:** Every stage returns this shape. OR-01 can rely on `error` and `status_kind` to determine success/failure without parsing stage-specific fields.

---

## 9. Handoff timing & dependencies

### Strict dependency (EC must complete before OR starts)

```
Time T:   EC-01 completes, returns ExecutionContext
Time T+ε: OR-01 receives ExecutionContext, begins planning
```

**Blocking condition:** OR-01 must receive the `id` before it can safely write to `execution_contexts`. If OR-01 starts without the `id`, it will fail on UPDATE.

### Parallel vs. sequential

EC-01 is fully sequential. It must complete before OR-01 can start.

**Rationale:** The `id` is the foreign key; no concurrent writers are allowed on the same row until OR-01 knows its pk.

---

## 10. Cross-stage data lineage

EC-01 is the source of truth for:
- **Execution context identity** (`id`)
- **Tenant & thread identity** (`tenant_id`, `thread_id`, `trigger_message_id`)
- **Initial status** (`status='initialized'`)
- **Empty task lists** (`pending_steps=[]`, `completed_steps=[]`)

All downstream stages inherit these and update the row in place (via `UPDATE execution_contexts SET ... WHERE id = $1`).

**Implication for testing:** Any test of downstream stages must ensure the `id` from EC-01 is correctly threaded through all SQL updates and sub-calls.

---

## 11. Field mapping for downstream callers

If downstream stages receive EC-01 output and need to extract fields for sub-calls:

| EC-01 output field | Downstream usage |
|---|---|
| `id` | Foreign key for all SQL writes; sub-call parameter `execution_context_id` |
| `tenant_id` | Sub-call parameter; maintains tenant isolation |
| `thread_id` | Sub-call parameter; context for message resolution |
| `trigger_message_id` | Sub-call parameter; link to original message |
| `status` | Validation: ensure still `'initialized'` before planning |
| `pending_steps` | Initial state (empty); appended by OR-01 |
| `completed_steps` | Initial state (empty); appended by downstream stages |

---

## 12. Error codes & recovery (extended)

If OR-01 receives an error envelope from EC-01:

| Error code | Meaning | OR-01 recovery |
|---|---|---|
| INVALID_INPUT | Missing tenant_id, thread_id, or trigger_message_id | Log; halt chain (invalid request). |
| INVALID_UUID | Malformed UUID in one of the required fields | Log; halt chain. |
| INVALID_RESOLVED_AT | Malformed ISO8601 timestamp | Log; halt chain (or retry with valid timestamp if time was optional). |
| IDEMPOTENCY_KEY_TOO_LONG | Custom idempotency_key > 300 chars | Log; halt chain. |
| INTERNAL_LOAD_FAILED | DB SELECT failed after INSERT | Retry-eligible; if persistent, escalate to support. |

**OR-01 must not assume** `error === null`. Always check before proceeding.

---

## 13. Outstanding OR-01 requirements

For OR-01 closure to enable Link 2 wiring:

1. **OR-01 must have an `executeWorkflowTrigger`** accepting the EC-01 envelope shape.
2. **OR-01 must validate `status='initialized'`** before planning.
3. **OR-01 must preserve the `id`** across all sub-calls and DB writes.
4. **OR-01 must handle error envelopes** (check `status_kind='failure'`).
5. **OR-01 must define its own output envelope** (likely feeding the planning result back to `execution_contexts.current_goal` and `execution_contexts.current_plan_ref`).

---

## 14. Envelope diagram (end-to-end chain)

```
TR-01 (Thread Resolver)
  ↓ (TR_Build_Result output)
EC-01 (Execution Context Init) ← THIS STAGE
  │ (ExecutionContext envelope + id)
  ↓ [Link 2 — NOT YET WIRED]
OR-01 (Orchestrator) ← Next stage (unclosed)
  │ (Planning result + updated current_goal, current_plan_ref)
  ↓
PL-01 (Plan Layer)
  ├→ DI-01 (Dispatch)
  ├→ ME-01 (Module Execution)
  ├→ RA-01 (Response Aggregation)
  └→ SU-01 (Submission)
      └→ RC-01 (Response Composition)
          └→ MO-01 (Message Output)
```

---

## 15. Reference

- **EC-01 output contract:** WF-EC-01_CONTRACTS.md §3
- **OR-01 current status:** `07_STAGE_WF-OR-01.md` (unclosed; discovery pending)
- **Chain readiness:** `WF-E2E-01_CHAIN_READINESS_REVIEW.md`
- **DB schema:** WF-EC-01_CONTRACTS.md §6
- **Live proof:** CLOSURE_REPORT_WF-EC-01.md §4 (V6 TR-envelope shape acceptance)
