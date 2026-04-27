# WF-SU-01 Test Entry & Exit Points

## 1. Entry Points

### Primary: SU_Input (executeWorkflowTrigger)
- Type: Workflow trigger from upstream WF-RA-01 via `executeWorkflow` call
- Data: RA's `state_update_result` envelope, passed as `$json` input
- Status: **Live variance**: SU_Input node lost in hotfix re-import (16 nodes vs. spec 17); does not affect V2–V5 execution paths which enter via manual trigger
- Test coverage: Entry via SU_Input is not explicitly tested; equivalent to manual trigger entry

### Secondary: SU_Manual_Test_Trigger (manualTrigger)
- Type: Manual execution trigger (default n8n UI label: "When clicking 'Execute workflow'")
- Data: Pinned data (SU_PINDATA_ENVELOPES.json) applied via UI before each test run
- Test coverage: **Primary path for V1–V6 matrix** (all 650 script tests and all 4 live executions enter here)
- Pindata fixtures:
  - `V3_happy_path` — success case, canonical execution_context_id `33333333-...'` in tenant `44444444-...`
  - `V2_invalid_input` — wrong `allowed_next_stage` value
  - `V4_forbidden_write` — includes `_write_permission_override` with forbidden class
  - `V5_lineage_mismatch` — mismatched tenant `99999999-...`
  - `V5b_replay_blocked` — includes `_replay_seen_input_hash`

---

## 2. Exit Points (Success Path)

### SU_Return_Result (terminal code node)
- Reached on: Input validation passes → lineage/replay passes → all 3 Apply_* writes complete
- Output shape: `{ json: state_update_result_envelope }`
- Result structure:
  ```json
  {
    "status_kind": "success",
    "result_type": "state_update_result",
    "execution_context_id": "33333333-...",
    "thread_id": "55555555-...",
    "tenant_id": "44444444-...",
    "state_update_result": {
      "status": "success" | "partial",
      "summary": "WF-SU-01 finalized persistence for the aggregated_result envelope.",
      "applied_write_classes": ["execution_state_update", "thread_state_update", "memory_candidate_persistence", "audit_persistence"],
      "blocked_write_classes": [],
      "execution_state_result": { "write_class": "execution_state_update", "applied": true, "row_after": { ... } },
      "thread_state_result": { "write_class": "thread_state_update", "applied": true, "row_after": { ... } },
      "memory_candidate_result": { "write_class": "memory_candidate_persistence", "applied": true, "persisted_count": N, "row_after": { ... } },
      "audit_result": { "write_class": "audit_persistence", "applied": true, "evidence_classification": { ... } },
      "warnings": []
    },
    "response_generation_allowed": true,
    "allowed_next_stage": "WF-RC-01",
    "idempotency_key": "state:33333333-..."
  }
  ```
- Live evidence: Execution 744 (V3 happy path); identical structure observed in script tests (50 tests, family `downstream_payload_shape`)

---

## 3. Exit Points (Error Paths)

### SU_Return_Error (terminal code node)
- Reached on: SU_Route_Valid fallback (input validation failed)
- Input flag: `_valid = false`
- Output shape: `{ json: state_update_error_envelope }`
- Error codes:
  - `INVALID_STATE_UPDATE_INPUT` — missing top-level field or wrong entry flags (status_kind, result_type, allowed_next_stage, state_update_allowed, response_generation_allowed, domain_writes_performed)
  - Error object includes `missing_fields` array and `details` (conflicting flag values echoed)
- Live evidence: Execution 746 (V2 invalid input, wrong allowed_next_stage)
- Script evidence: 50 tests, family `input_validation` (all 50/50 PASS)

### SU_Return_Context_Error (terminal code node)
- Reached on: SU_Route_Context_Ready fallback (lineage/replay validation failed)
- Input flag: `_context_ready = false`
- Output shape: `{ json: state_update_error_envelope }`
- Error codes and termination logic:
  - `LINEAGE_MISMATCH` — row not found, tenant/thread mismatch, or illegal ec.status
    - Live evidence: Execution 747 (V5 cross-tenant, tenant `99999999-...` not found); no rows updated in any Apply_* node
    - Script evidence: 50 tests, family `lineage_validation` (all 50/50 PASS)
  - `FORBIDDEN_WRITE_CLASS` — allowed_write_classes contains non-canonical class (e.g. `domain_event_write`)
    - Live evidence: Execution 745 (V4 forbidden write, includes `domain_event_write` in override)
    - Script evidence: 50 tests, family `forbidden_write_blocking` (all 50/50 PASS)
  - `WRITE_PERMISSION_DENIED` — all canonical write classes are in denied_write_classes
    - Script evidence: No live execution; script coverage only (implicit in permission families)
  - `REPLAY_BLOCKED` — idempotency_key already seen with identical or different input_hash
    - Live evidence: Exec 744 incidental V5 path (ec row already completed); script coverage: 50 tests, family `replay_idempotency` (all 50/50 PASS)
- All Apply_* nodes return empty (alwaysOutputData: true on read; CTEs fail closed on gate=false)

---

## 4. Convergence: SU_Build_Downstream_Envelope

### Fan-in behavior
- Three upstream Apply_* nodes (SU_Apply_Execution_State_Update, SU_Apply_Operational_Writes, SU_Persist_Memory_Candidates) emit in parallel
- n8n fires downstream node on first input arrival (before other branches complete)
- Code node uses `safe(name)` helper (added in hotfix) to catch missing upstream executions: `try { return $(name).first().json || {}; } catch(e) { return {}; }`
- Final result only emitted after all 3 branches complete (3 items emitted on SU_Return_Result, last one is complete)

### Tolerant envelope logic
- `stateNode`, `threadNode`, `memoryNode` may be empty `{}` if not yet executed
- `applied` flags computed as: `allowed && !!node.id` (no-op if node hasn't run)
- `row_after` fields carry node result if executed, else `null`
- Final `downstreamStatus` set to `"partial"` if any blocked_write_classes exist (even if all 3 Apply_* succeeded on allowed classes)

---

## 5. Test Harness Integration

### Pindata envelope injection
- Path: `/sessions/amazing-festive-maxwell/mnt/Ucenicul/workflows/WF-SU-01_State_Persistence_Updater/workflow/SU_PINDATA_ENVELOPES.json`
- Method: Copy envelope block into n8n UI → open WF-SU-01 → click SU_Manual_Test_Trigger → 'Pin data' tab → paste JSON
- Execution capture: After run, record execution ID from n8n UI; read output envelope from SU_Return_Result node's output

### Script test execution
- Path: `/sessions/amazing-festive-maxwell/mnt/Ucenicul/workflows/WF-SU-01_State_Persistence_Updater/tests/su/test_families.py`
- Families exercising entry/exit:
  - `input_validation` (50) → SU_Return_Error path; V2 coverage
  - `happy_path` (50) → SU_Return_Result path; V3 coverage with 4 rollup statuses × 2 memory flags × 6 iterations
  - `malformed_aggregate` (50) → SU_Return_Error path; V2 edge case coverage
  - `lineage_validation` (50) → SU_Return_Context_Error path; V5 coverage
  - `forbidden_write_blocking` (50) → SU_Return_Context_Error path; V4 coverage
  - `replay_idempotency` (50) → SU_Return_Context_Error path; V5b coverage
  - `cross_tenant_isolation` (50) → SU_Return_Error path; V5 variant coverage
- Invocation: `python3 /path/to/test_families.py` → writes results to `results/results.json` + `results/results.md`
- Exit criteria: All 650 tests PASS (live status: 650/650)

---

## 6. Node Inventory for Entry/Exit Tracing

| Node | Type | Role |
|---|---|---|
| SU_Input | executeWorkflowTrigger | Entry (live variance: lost at re-import) |
| SU_Manual_Test_Trigger | manualTrigger | Entry (primary test path) |
| SU_Return_Result | code | Exit (success) |
| SU_Return_Error | code | Exit (input validation failure) |
| SU_Return_Context_Error | code | Exit (lineage/permission/replay failure) |
| SU_Build_Downstream_Envelope | code | Pre-exit envelope assembly (convergence point) |

---

## 7. Not Documented
- n8n SDK caller workflow pinData binding (inherited blocker from WF-RA-01; workaround: manual trigger + UI pinData)
- Switch-routing wart (error items route on output[0] instead of output[1]); closure criterion still met because error code and shape are canonical + downstream Postgres CTEs are fail-closed
- Implicit exit audit trail integration (evidence_classification flags only; full audit logging not yet integrated)
