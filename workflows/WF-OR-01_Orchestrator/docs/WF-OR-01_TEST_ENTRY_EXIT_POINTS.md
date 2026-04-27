# WF-OR-01 Test Entry and Exit Points

**Workflow Stage:** WF-OR-01 Orchestrator (EC → OR adapter)  
**Upstream Trigger:** WF-EC-01 (Execution Context) success result  
**Downstream Handoff:** WF-PL-01 (Planner)  

---

## 1. Entry Points (Test Induction)

### 1.1 Manual Trigger (Shell Integrity)
**Node:** `When clicking 'Execute workflow'`  
**Type:** n8n manualTrigger  
**Test Purpose:** Verify workflow can be executed directly from n8n UI (manual test mode)

**Entry Test Sequence (T1):**
1. Manually trigger the workflow in n8n UI
2. Pass a valid wrapped EC_Return_Result via the input JSON editor
3. Expect workflow to reach `OR_Return_Result` node
4. Verify output contains `status_kind='success'`, `result_type='handoff'`, `allowed_next_stage='WF-PL-01'`

**Proof Required:** Both pinData and output JSON confirm success handoff structure

---

### 1.2 Chat Trigger (Adapter Compatibility)
**Node:** `When chat message received`  
**Type:** @n8n/n8n-nodes-langchain.chatTrigger  
**Test Purpose:** Verify chat-integrated workflow path (integration testing)

**Entry Test Sequence (T2):**
1. Invoke workflow via chat input (webhook-registered trigger)
2. Pass payload as JSON string in `chatInput` field
3. Expect `OR_Validate_EC_Result` to unwrap `chatInput` and parse as JSON
4. Expect workflow to route to valid branch and reach `OR_Return_Result`
5. Verify chat response includes success handoff envelope

**Proof Required:** Chat logs show handoff payload returned to caller

---

### 1.3 Invalid Input Path (Error Routing)
**Node:** `When clicking 'Execute workflow'` → direct to invalid payload  
**Test Purpose:** Verify error-branch routing without database access

**Entry Test Sequence (T3):**
1. Manually trigger with malformed input (missing required field, e.g., no `status_kind`)
2. Expect `OR_Validate_EC_Result` to set `_valid='false'`
3. Expect `OR_Route_Valid` switch to route to output `1` (invalid branch)
4. Expect workflow to reach `OR_Return_Error` node
5. Verify error envelope: `status_kind='failed'`, `error.code='INVALID_HANDOFF_INPUT'`

**Proof Required:** Error output node shows canonical error structure

---

### 1.4 Database Mismatch Path (Verification Failure)
**Node:** Manual trigger with valid schema but mismatched DB row  
**Test Purpose:** Verify cross-tenant rejection without false positives

**Entry Test Sequence (T4):**
1. Manually trigger with valid wrapped input
2. Simulate `OR_Load_Execution_Context` returning a row with different `tenant_id`
3. Expect `OR_Verify_Context_Match` to reject the match
4. Expect workflow to route to `OR_Return_Error` with `code='CONTEXT_MISMATCH'`
5. Verify `mismatched_fields` array contains `'tenant_id'`

**Proof Required:** Error node output and pinData confirm mismatch detection

---

## 2. Exit Points (Test Observation)

### 2.1 Success Exit: OR_Return_Result
**Node:** `OR_Return_Result` (Code node)  
**Output Shape:**
```json
{
  "status_kind": "success",
  "result_type": "handoff",
  "module_name": "orchestrator_input_handoff",
  "payload": {
    "tenant_id": "<uuid>",
    "thread_id": "<uuid>",
    "execution_id": "<uuid>",
    "trigger_message_id": "<uuid>",
    "idempotency_key": "<string>",
    "execution_status": "initialized",
    "ttl_seconds": <int>,
    "planning_allowed": true,
    "allowed_next_stage": "WF-PL-01",
    "orchestrator_input": {
      "planning_mode": "plan_only",
      "module_execution_allowed": false,
      "response_generation_allowed": false,
      "domain_writes_allowed": false
    },
    "warnings": []
  }
}
```

**Test Assertions (Exit T1):**
- [ ] `status_kind === 'success'`
- [ ] `result_type === 'handoff'`
- [ ] `module_name === 'orchestrator_input_handoff'`
- [ ] `payload.planning_allowed === true`
- [ ] `payload.allowed_next_stage === 'WF-PL-01'`
- [ ] All UUID fields are RFC 4122 compliant
- [ ] `payload.ttl_seconds > 0` (positive integer)
- [ ] No forbidden keys (`plan`, `plan_steps`, `module_results`, `response_text`, `user_response`, `llm_output`) in payload
- [ ] `warnings` is an array (may be empty)

**Downstream Receiver:** WF-PL-01 (Planner)  
**Next Action:** Planner consumes handoff and generates plan steps

---

### 2.2 Error Exit: OR_Return_Error
**Node:** `OR_Return_Error` (Code node)  
**Output Shape:**
```json
{
  "status_kind": "failed",
  "result_type": "error",
  "module_name": "orchestrator_input_handoff",
  "error": {
    "code": "<CODE>",
    "message": "<string>",
    "missing_fields": ["field1", "field2"]
  }
}
```

**Canonical Error Codes (Exit T2):**
- `INVALID_HANDOFF_INPUT` — Schema/type validation failure
- `NOT_READY_FOR_PLANNING` — State validation failure (status != initialized or ttl <= 0)
- `CONTEXT_MISMATCH` — Database verification failure

**Test Assertions (Exit T2):**
- [ ] `status_kind === 'failed'`
- [ ] `result_type === 'error'`
- [ ] `module_name === 'orchestrator_input_handoff'`
- [ ] `error.code` is one of: `INVALID_HANDOFF_INPUT`, `NOT_READY_FOR_PLANNING`, `CONTEXT_MISMATCH`
- [ ] `error.message` is a non-empty string
- [ ] `error.missing_fields` is an array (may be empty)
- [ ] No `payload` key in response (signals error, not success)

**Downstream Receiver:** Error handler or result aggregator (not WF-PL-01)  
**Next Action:** Fail the parent thread or return error to user

---

## 3. Route-Specific Test Obligations

### 3.1 Valid Branch Test Proof
**Path:** trigger → validate → route[valid=0] → extract → load → verify → build → return_result

**Required Test Evidence:**
1. **Happy path execution (T-H):** Valid wrapped input → `_valid='true'` → route to branch 0 → success output
2. **Flat shape adaptation (T-F):** Valid flat input with synthesis → `_valid='true'` → route to branch 0 → success output with synthesis warnings
3. **Idempotent replay (T-I):** Same input called 3 times → all outputs identical
4. **DB match (T-V):** Handoff input matches DB row on all critical fields → verification succeeds → handoff payload emitted

---

### 3.2 Invalid Branch Test Proof
**Path:** trigger → validate → route[invalid=1] → return_error

**Required Test Evidence:**
1. **Missing field rejection (T-M):** Missing `status_kind` → `_valid='false'` → route to branch 1 → error with missing_fields listed
2. **Type validation rejection (T-T):** `ttl_seconds='nope'` → `_valid='false'` → route to branch 1 → error code INVALID_HANDOFF_INPUT
3. **State validation rejection (T-S):** `status != 'initialized'` → `_valid='false'` → route to branch 1 → error code NOT_READY_FOR_PLANNING
4. **Forbidden key rejection (T-K):** `payload.plan=['...']` → `_valid='false'` → route to branch 1 → error

---

### 3.3 Verification Branch (Post-Valid)
**Path:** extract → load → verify → build → return_result

**Required Test Evidence:**
1. **Cross-tenant mismatch (T-CT):** DB row `tenant_id != handoff tenant_id` → verification fails → route to return_error with code CONTEXT_MISMATCH
2. **Thread mismatch (T-TH):** DB row `thread_id != handoff thread_id` → verification fails
3. **Status mismatch (T-ST):** DB row `status != 'initialized'` → verification fails
4. **DB absence (non-strict):** DB row is null, non-strict mode → verification succeeds with warning

---

## 4. Entry/Exit Combinations (Test Matrix)

| Entry | Path | Exit | Test ID | Status |
|-------|------|------|---------|--------|
| Manual | Valid happy | Success | T-H | ✓ Script-level |
| Manual | Valid flat | Success | T-F | ✓ Script-level |
| Chat | Valid happy | Success | T-C | ⚠ No live proof |
| Manual | Invalid missing | Error | T-M | ✓ Script-level |
| Manual | Invalid type | Error | T-T | ✓ Script-level |
| Manual | Invalid state | Error | T-S | ✓ Script-level |
| Manual | Valid → CT mismatch | Error | T-CT | ✓ Script-level |
| Manual | Replay (3x) | Success | T-I | ✓ Script-level |

---

## 5. Test Readiness Checklist

### Pre-Live Manual Testing (Before Import to Production)
- [ ] T-H: Manual trigger with valid wrapped EC_Return_Result → success output
- [ ] T-F: Manual trigger with valid flat EC_Return_Result → success output with synthesis warnings
- [ ] T-M: Manual trigger with missing `status_kind` → error with code INVALID_HANDOFF_INPUT
- [ ] T-T: Manual trigger with `ttl_seconds='nope'` → error with missing_fields
- [ ] T-S: Manual trigger with `status='completed'` → error with code NOT_READY_FOR_PLANNING
- [ ] T-CT: Manual trigger with DB row tenant mismatch → error with code CONTEXT_MISMATCH
- [ ] T-I: Call happy path 3 times with same input → outputs are identical
- [ ] Chat trigger path works (via webhook or chat interface test)

### Post-Live Integration Testing (After Import to Production)
- [ ] T-Live-H: Real WF-EC-01 success result → WF-OR-01 completes → WF-PL-01 receives handoff
- [ ] T-Live-CT: Simulate cross-tenant call → WF-OR-01 rejects cleanly
- [ ] T-Live-DB: Confirm `OR_Load_Execution_Context` returns correct row
- [ ] T-Live-V: Confirm `OR_Verify_Context_Match` rejects mismatches
- [ ] T-Live-TTL: Verify TTL reconciliation with DB row
- [ ] T-Live-Idempotency: Confirm idempotency key reconciliation or synthesis

---

## 6. Not Documented in On-Disk Evidence

- **Live execution logs:** No recorded traces of actual n8n execution
- **Chat trigger integration testing:** No proof chat payload is correctly unwrapped
- **Real WF-EC-01 integration:** No integration with live WF-EC-01 output
- **Performance metrics:** No latency or throughput measurements
- **Error recovery paths:** No handling of partial failures or timeouts
- **Scale testing:** No tests with high-volume inputs or concurrent executions
