# WF-SU-01 Downstream Handoff to WF-RC-01

## 1. Handoff Position in Chain

Chain: `TR→EC→OR→PL→DI→ME→RA→**SU**→RC→MO`

- **Upstream caller:** WF-RA-01 (Result Aggregator) — emits `aggregated_result` envelope
- **Downstream consumer:** WF-RC-01 (Response Composer) — reads `state_update_result` envelope

---

## 2. Canonical Payload Shape (WF-SU-01 → WF-RC-01)

### Top-level fields
All success envelopes carry (verified live on execution 744):
```json
{
  "status_kind": "success",
  "result_type": "state_update_result",
  "execution_context_id": "33333333-3333-3333-3333-333333333333",
  "thread_id": "55555555-5555-5555-5555-555555555555",
  "tenant_id": "44444444-4444-4444-4444-444444444444",
  "state_update_result": { ... },
  "response_generation_allowed": true,
  "allowed_next_stage": "WF-RC-01",
  "idempotency_key": "state:33333333-..."
}
```

### state_update_result object
```json
{
  "status": "success" | "partial",
  "summary": "WF-SU-01 finalized persistence for the aggregated_result envelope.",
  "applied_write_classes": [
    "execution_state_update",
    "thread_state_update",
    "memory_candidate_persistence",
    "audit_persistence"
  ],
  "blocked_write_classes": [],
  "execution_state_result": {
    "write_class": "execution_state_update",
    "applied": true,
    "row_after": {
      "id": "33333333-...",
      "tenant_id": "44444444-...",
      "thread_id": "55555555-...",
      "status": "completed",
      "pending_steps": [],
      "completed_steps": ["s1"],
      "updated_at": "2026-04-18T07:48:12.392Z"
    }
  },
  "thread_state_result": {
    "write_class": "thread_state_update",
    "applied": true,
    "row_after": {
      "id": "55555555-...",
      "tenant_id": "44444444-...",
      "status": "active",
      "last_activity_at": "2026-04-18T07:48:12.392Z",
      "updated_at": "2026-04-18T07:48:12.392Z"
    }
  },
  "memory_candidate_result": {
    "write_class": "memory_candidate_persistence",
    "applied": true,
    "persisted_count": 0,
    "row_after": {
      "id": "33333333-...",
      "tenant_id": "44444444-...",
      "shared_artifacts": { "memory_candidates": [] },
      "updated_at": "2026-04-18T07:48:12.392Z"
    }
  },
  "audit_result": {
    "write_class": "audit_persistence",
    "applied": true,
    "evidence_classification": {
      "source_verified": true,
      "script_verified": true,
      "sql_verified": true,
      "db_verified": true,
      "runtime_verified": true
    }
  },
  "warnings": []
}
```

---

## 3. Handoff Rules (Binding Contract)

### Preconditions for WF-RC-01 execution
- `response_generation_allowed` must equal `true` (unblocks response composition)
- `allowed_next_stage` must equal `"WF-RC-01"` (authorizes next stage)
- `status_kind` must equal `"success"` (signals error-free workflow completion)
- `result_type` must equal `"state_update_result"` (identifies SU-01 output)

### state_update_result interpretation
WF-RC-01 MUST inspect:
- `status` field:
  - `"success"` — all enabled write classes applied; proceed to response generation
  - `"partial"` — some writes blocked or failed; WF-RC-01 must handle `blocked_write_classes` array (may omit memory candidate data from response or flag as incomplete)
- `applied_write_classes` — list of successfully persisted write classes (always includes at minimum `audit_persistence`)
- `blocked_write_classes` — list of write classes not applied (empty on `status: success`)
- Individual write result objects (execution_state_result, thread_state_result, memory_candidate_result, audit_result):
  - `applied` — boolean indicating whether this write executed
  - `row_after` — DB row state after write, or `null` if write skipped
  - `persisted_count` — (memory_candidate_result only) count of candidate records persisted

### Error handling
If SU-01 returns `state_update_error` envelope:
- `response_generation_allowed` will be `false`
- `allowed_next_stage` will NOT equal `"WF-RC-01"`
- WF-RC-01 MUST NOT execute; error must be routed upstream to WF-RA-01 or error handler
- Error codes present in `error.code`: `INVALID_STATE_UPDATE_INPUT`, `LINEAGE_MISMATCH`, `FORBIDDEN_WRITE_CLASS`, `WRITE_PERMISSION_DENIED`, `REPLAY_BLOCKED`

---

## 4. Execution Context Continuity

### shared_artifacts migration
- **Source:** WF-RA-01 did NOT populate `shared_artifacts.memory_candidates` (RA stage is read-only, no persistence)
- **SU-01 responsibility:** On happy path (V3), SU-01 updates `execution_contexts.shared_artifacts` with memory candidate array
- **WF-RC-01 consumer:** Reads `state_update_result.memory_candidate_result.row_after.shared_artifacts['memory_candidates']` and surfaces proposals in response generation logic
- **Live evidence:** Exec 744 shows `shared_artifacts = { "memory_candidates": [] }` after SU_Persist_Memory_Candidates write

### ec.status transition
- **Upstream (RA input):** ec.status = `"aggregating"`
- **SU-01 write:** ec.status → `"completed"` (all rollup_status variants except `"failed"` map to completed; `"failed"` maps to `"failed"`)
- **WF-RC-01 assumption:** Can rely on ec.status being `"completed"` or `"failed"` to guide response generation logic (e.g., do not retry on completed state)

### thread.status transition
- **Upstream (RA input):** thread.status = `"active"` or other pre-SU state
- **SU-01 write:** thread.status → mapped from aggregated_result.status (success → active, partial/no_action → waiting, failed → blocked)
- **WF-RC-01 assumption:** Can read thread.status to determine if system is ready to continue (active/waiting) or must hold (blocked)

---

## 5. Script Verification of Handoff Contract

### Family: downstream_payload_shape (50 tests, all PASS)
Tests verify that on all 4 rollup statuses (success/partial/no_action/failed) × 2 memory options (with/without):
- Required fields present: `status_kind`, `result_type`, `execution_context_id`, `thread_id`, `tenant_id`, `state_update_result`, `response_generation_allowed`, `allowed_next_stage`, `idempotency_key`
- `allowed_next_stage == "WF-RC-01"`
- `response_generation_allowed == true`
- `state_update_result` object carries all 4 write result sub-objects

### Family: wf_ra_to_wf_su_handoff (50 tests, all PASS)
Tests verify input contract; indirectly ensures SU-01 only accepts valid RA outputs:
- Valid RA envelope must have `allowed_next_stage="WF-SU-01"`, `state_update_allowed=true`, `response_generation_allowed=false`
- SU-01 input validator rejects deviations with `INVALID_STATE_UPDATE_INPUT`
- Ensures RA→SU→RC chain synchronization

---

## 6. Live Handoff Evidence

### Execution 744 (V3 happy path)
**Input (from RA):**
- `aggregated_result.status = "success"`
- `aggregated_result.returned_step_ids = ["s1"]`
- `aggregated_result.proposals = []`, `observations = []`

**Output (to RC):**
- `response_generation_allowed = true` ✓
- `allowed_next_stage = "WF-RC-01"` ✓
- `state_update_result.status = "success"` ✓
- `applied_write_classes = ["execution_state_update", "thread_state_update", "memory_candidate_persistence", "audit_persistence"]` ✓
- `blocked_write_classes = []` ✓
- `execution_state_result.row_after.status = "completed"` ✓
- `thread_state_result.row_after.status = "active"` ✓
- `memory_candidate_result.persisted_count = 0` ✓

**DB state after handoff:**
- `execution_contexts.33333333-....status = "completed"` (was "aggregating")
- `execution_contexts.33333333-....completed_steps = ["s1"]`
- `threads.55555555-....status = "active"` (unchanged; no_action would change to "waiting")

**Next stage readiness:** WF-RC-01 can immediately compose response using completed execution context and thread state.

---

## 7. Warning Handling (Partial Writes)

### V4 execution (permission denial)
Input envelope includes `_write_permission_override` with `domain_event_write` in allowed classes.
- SU-01 detects `FORBIDDEN_WRITE_CLASS` and routes to SU_Return_Context_Error
- Downstream message: error envelope with `response_generation_allowed = false`
- WF-RC-01 does NOT execute

### Hypothetical: Partial write success
If write permissions allowed some but not all canonical classes:
- `state_update_result.status = "partial"`
- `applied_write_classes` lists those that succeeded
- `blocked_write_classes` lists those denied
- `warnings` array may include `BLOCKED_WRITE_CLASSES` warning
- WF-RC-01 must inspect `blocked_write_classes` and decide whether to proceed (e.g., omit memory candidates from response if `memory_candidate_persistence` blocked)

---

## 8. Idempotency & Replay

### Output idempotency_key
- Format: `"state:{execution_context_id}"` (differs from input format `"aggregate:{execution_context_id}:*"`)
- Used by WF-RC-01 (or downstream) to detect duplicate SU-01 outputs on workflow re-entry
- Not used to block SU-01 execution itself (input-side replay guard via `_replay_seen_input_hash`)

### No duplicate writes on re-entry
- SU-01 maintains replay registry in memory during execution (passed to `verify_lineage_and_replay` function)
- If same RA output re-sent with identical idempotency_key + input_hash, SU-01 emits `REPLAY_BLOCKED` error
- WF-RC-01 does not see duplicate state_update_result envelopes within same workflow run

---

## 9. Not Documented
- WF-RC-01-specific handling of partial write scenarios (deferred to WF-RC-01 contracts)
- Memory candidate routing/promotion logic (WF-RC-01 scoped)
- Downstream error escalation path (where does WF-RC-01 send error envelopes if SU-01 fails?)
- Integration with response generation templates (WF-RC-01 scoped)
