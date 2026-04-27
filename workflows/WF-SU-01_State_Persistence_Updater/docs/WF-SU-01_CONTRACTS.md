# WF-SU-01 Contracts & Canonical Shapes

## 1. Input Contract (from WF-RA-01)

### Upstream envelope shape
Required top-level fields:
- `status_kind` — must equal `"success"`
- `result_type` — must equal `"aggregated_result"`
- `execution_context_id` — UUID, must match execution_contexts row
- `thread_id` — UUID, must match threads row
- `tenant_id` — UUID, must match execution_contexts.tenant_id + threads.tenant_id
- `aggregated_result` — object, shape validated per below
- `allowed_next_stage` — must equal `"WF-SU-01"`
- `state_update_allowed` — must equal `true`
- `response_generation_allowed` — must equal `false`
- `domain_writes_performed` — must equal `false`
- `idempotency_key` — string, format `"aggregate:{execution_context_id}:*"`

### Aggregated result object (nested)
Required fields:
- `status` — one of `"success"`, `"partial"`, `"no_action"`, `"failed"`
- `summary` — string
- `module_results_count` — integer
- `module_names` — array of strings
- `per_status_counts` — object mapping status to count
- `actions_executed` — array
- `artifacts` — array
- `observations` — array
- `proposals` — array (optional, filtered for type in `["memory_candidate", "memory_promotion_candidate", "pattern_candidate"]`)
- `confidence` — number in [0, 1]
- `needs_followup` — boolean
- `followup_requests` — array
- `expected_step_ids` — non-empty array of strings, no duplicates
- `returned_step_ids` — non-empty array of strings, no duplicates, matches expected set

### Optional overrides (testing only)
- `_write_permission_override` — object with `allowed_write_classes` (array) and `denied_write_classes` (array); merged with system allowlist
- `_replay_seen_input_hash` — string; if present and matches input hash, triggers `REPLAY_BLOCKED`

---

## 2. Database State Contracts

### Execution context row (public.execution_contexts)
Read contract:
- Row must exist filtered by `(id = $execution_context_id AND tenant_id = $tenant_id)`
- `alwaysOutputData: true` enforces fail-closed on 0-row reads

Write contract (via SU_Apply_Execution_State_Update):
- Write occurs only if `write_plan.execution_state_update.allowed = true`
- Fields updated:
  - `status` — mapped from `aggregated_result.status` (success/partial/no_action → completed; failed → failed)
  - `pending_steps` → `[]`
  - `completed_steps` → `aggregated_result.returned_step_ids`
  - `updated_at` → `NOW()`
- Gated by `WITH gate AS (SELECT $10::boolean AS apply_write) WHERE gate.apply_write IS TRUE`

### Thread row (public.threads)
Read contract:
- Implicitly loaded via execution_contexts.thread_id

Write contract (via SU_Apply_Operational_Writes):
- Write occurs only if `write_plan.thread_state_update.allowed = true`
- Fields updated:
  - `status` — mapped from `aggregated_result.status` (success → active; no_action/partial → waiting; failed → blocked)
  - `last_activity_at` → `NOW()`
  - `updated_at` → `NOW()`
- Gated by `WITH gate AS (SELECT $5::boolean AS apply_write) WHERE gate.apply_write IS TRUE`

### Shared artifacts (public.execution_contexts.shared_artifacts JSONB)
Write contract (via SU_Persist_Memory_Candidates):
- Write occurs only if `write_plan.memory_candidate_persistence.allowed = true`
- Field updated:
  - `shared_artifacts['memory_candidates']` — set to filtered candidate_proposals array (memory_candidate + observation types)
- Gated by `WITH gate AS (SELECT $4::boolean AS apply_write) WHERE gate.apply_write IS TRUE`

---

## 3. Lineage & Permission Checks

### Lineage validation (SU_Verify_Lineage_And_Replay)
Must pass before write phase:
- Row found: execution_contexts row must exist (error: `LINEAGE_MISMATCH`)
- Tenant match: `ec.tenant_id == envelope.tenant_id` (error: `LINEAGE_MISMATCH`)
- Thread match: `ec.thread_id == envelope.thread_id` (error: `LINEAGE_MISMATCH`)
- Status legal: `ec.status` in `["aggregating", "in_progress", "planned", "dispatching"]` (error: `LINEAGE_MISMATCH`)
- No forbidden write classes: if any allowed_write_classes outside canonical set `["execution_state_update", "thread_state_update", "audit_persistence", "memory_candidate_persistence"]`, error: `FORBIDDEN_WRITE_CLASS`
- Not all canonical classes denied: (error: `WRITE_PERMISSION_DENIED`)
- Replay guard: if `_replay_seen_input_hash` present and matches computed input_hash, error: `REPLAY_BLOCKED`

### Write permission classes (canonical set)
- `execution_state_update` — controls SU_Apply_Execution_State_Update write
- `thread_state_update` — controls SU_Apply_Operational_Writes write
- `memory_candidate_persistence` — controls SU_Persist_Memory_Candidates write
- `audit_persistence` — non-DB write; always applied (controls audit flag in response)

---

## 4. Output Contract (to WF-RC-01)

### Success envelope (result_type: state_update_result)
Required fields:
- `status_kind` → `"success"`
- `result_type` → `"state_update_result"`
- `execution_context_id` — echoed from input
- `thread_id` — echoed from input
- `tenant_id` — echoed from input
- `state_update_result` — object:
  - `status` — `"success"` if all writes applied; `"partial"` if any write blocked/failed
  - `summary` — `"WF-SU-01 finalized persistence for the aggregated_result envelope."`
  - `applied_write_classes` — array of write_class names that succeeded
  - `blocked_write_classes` — array of write_class names that were denied or failed
  - `execution_state_result` — object: `{ write_class, applied, row_after }`
  - `thread_state_result` — object: `{ write_class, applied, row_after }`
  - `memory_candidate_result` — object: `{ write_class, applied, persisted_count, row_after }`
  - `audit_result` — object: `{ write_class, applied, evidence_classification }`
  - `warnings` — array of warning objects (STEP_COVERAGE_GAP, EXTRA_RETURNED_STEPS, BLOCKED_WRITE_CLASSES, PERSISTENCE_APPLY_FAILED)
- `response_generation_allowed` → `true` (unblocks WF-RC-01)
- `allowed_next_stage` → `"WF-RC-01"`
- `idempotency_key` → `"state:{execution_context_id}"`

### Error envelopes
- Type: `INVALID_STATE_UPDATE_INPUT` — missing/invalid top-level fields or entry flags. Terminal node: SU_Return_Error.
- Type: `LINEAGE_MISMATCH` — row not found, tenant/thread mismatch, illegal ec status, or replay conflict. Terminal node: SU_Return_Context_Error.
- Type: `FORBIDDEN_WRITE_CLASS` — allowed_write_classes contains non-canonical class. Terminal node: SU_Return_Context_Error.
- Type: `WRITE_PERMISSION_DENIED` — all canonical write classes denied. Terminal node: SU_Return_Context_Error.
- Type: `REPLAY_BLOCKED` — idempotency key already seen (identical or different payload). Terminal node: SU_Return_Context_Error.

---

## 5. Handoff Continuity

### Upstream: WF-RA-01 → WF-SU-01
- RA emits `aggregated_result` envelope with `allowed_next_stage="WF-SU-01"`, `state_update_allowed=true`, `response_generation_allowed=false`, `domain_writes_performed=false`.
- SU input validator checks these flags exactly; any deviation triggers `INVALID_STATE_UPDATE_INPUT`.
- Script-verified: 50 tests in family `wf_ra_to_wf_su_handoff` (all 50/50 PASS).

### Downstream: WF-SU-01 → WF-RC-01
- SU emits `state_update_result` envelope with `allowed_next_stage="WF-RC-01"`, `response_generation_allowed=true`.
- Shape includes `state_update_result` object summarizing applied/blocked write classes.
- Script-verified: 50 tests in family `downstream_payload_shape` (all 50/50 PASS).
- Live-verified: Execution 744 emitted canonical shape; WF-RC-01 ready to consume.

---

## 6. Rollup Status → EC Status Mapping

| Aggregated Status | EC Status Target | Thread Status Target |
|---|---|---|
| `success` | `completed` | `active` |
| `partial` | `completed` | `waiting` |
| `no_action` | `completed` | `waiting` |
| `failed` | `failed` | `blocked` |

---

## 7. Not Documented
- Custom write_plan computation beyond the canonical set (reserved for future extension).
- Audit trail integration beyond evidence classification flags.
- Memory promotion or pattern routing beyond candidate persistence.
