# WF-OR-01 Contracts

**Status:** PRE-LIVE (advance_allowed=false)  
**Last Verified:** 2026-04-19  
**Upstream Caller:** WF-EC-01 (Execution Context)  
**Downstream Consumer:** WF-PL-01 (Planner)  

---

## 1. Input Contract (from WF-EC-01)

The orchestrator accepts two canonically equivalent shapes from WF-EC-01's `EC_Return_Result` node:

### 1.1 Payload-Wrapped Shape (preferred)
```json
{
  "status_kind": "success",
  "result_type": "state",
  "module_name": "execution_context_init",
  "payload": {
    "tenant_id": "<uuid>",
    "thread_id": "<uuid>",
    "execution_id": "<uuid>",
    "trigger_message_id": "<uuid>",
    "idempotency_key": "<string>",
    "status": "initialized",
    "ttl_seconds": 900
  },
  "warnings": []
}
```

### 1.2 Flat Shape (as emitted by live EC_Return_Result)
```json
{
  "status_kind": "success",
  "result_type": "state",
  "module_name": "execution_context_init",
  "id": "<uuid>",
  "tenant_id": "<uuid>",
  "thread_id": "<uuid>",
  "trigger_message_id": "<uuid>",
  "status": "initialized",
  "error": null,
  "ttl_seconds": 900
}
```

**Validation Rules:**
- Both `status_kind` and `result_type` must equal `"success"` and `"state"` respectively
- `status` must equal `"initialized"`
- All UUID fields must match RFC 4122 format
- `ttl_seconds` (wrapped only) must be a positive integer > 0
- No forbidden keys (`plan`, `plan_steps`, `module_results`, `response_text`, `user_response`, `llm_output`) may appear in payload
- `error` field in flat shape must be null, empty object, or absent

**Flat Shape Synthesis Rules:**
- If flat shape lacks `idempotency_key`, OR stage synthesizes: `<tenant_id>:<trigger_message_id>:exec_ctx:v1`
- If flat shape lacks `ttl_seconds`, OR stage defaults to `900` seconds
- Both synthesis conditions emit warnings in the output handoff

---

## 2. Output Contract (to WF-PL-01)

### 2.1 Success Handoff Envelope
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
    "ttl_seconds": <integer>,
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

### 2.2 Error Envelope
```json
{
  "status_kind": "failed",
  "result_type": "error",
  "module_name": "orchestrator_input_handoff",
  "error": {
    "code": "<ERROR_CODE>",
    "message": "<string>",
    "missing_fields": []
  }
}
```

**Canonical Error Codes:**
- `INVALID_HANDOFF_INPUT` — input shape mismatch, missing required fields, invalid types, or forbidden keys present
- `NOT_READY_FOR_PLANNING` — validation passed but input state is not `initialized` or TTL is non-positive
- `CONTEXT_MISMATCH` — execution-context row verification failed; tenant/thread/execution/status mismatch detected

---

## 3. Database Contract

### 3.1 Read-Only Operations
The `OR_Load_Execution_Context` Postgres node executes read-only parameterized queries:

**02_load_execution_context.sql:**
```sql
SELECT * FROM public.execution_contexts
WHERE execution_id = $1 AND tenant_id = $2 AND thread_id = $3
LIMIT 1
```

**03_load_execution_context_by_idempotency.sql:**
```sql
SELECT * FROM public.execution_contexts
WHERE idempotency_key = $1
LIMIT 1
```

**Schema Inspection (01_schema_inspect.sql):**
- Queries `information_schema` to validate the `execution_contexts` table structure

### 3.2 Verification Logic
The `OR_Verify_Context_Match` node compares the handed-off values against the database row:
- Rejects if `execution_id`, `tenant_id`, `thread_id`, `trigger_message_id`, or `status` mismatch
- Allows mismatches in `ttl_seconds` and `idempotency_key` with warnings (reconciliation path)
- Fails closed on non-strict DB check if row is not found
- Allows non-strict mode (for pre-DB test paths) when `strict_db_check=false`

### 3.3 Forbidden Operations
No writes to:
- `public.tasks`, `public.reminders`, `public.memory_items`, `public.rag_memories`, `public.messages`, `public.execution_contexts`

---

## 4. Stage Boundary Enforcement

### 4.1 No Planning
- The `OR_Build_Handoff_Payload` node MUST NOT generate a plan
- The `planning_allowed` flag is set to `true` for downstream, but the OR stage itself produces no plan steps

### 4.2 No Module Dispatch
- `module_execution_allowed: false` — OR stage does not invoke any modules

### 4.3 No Response Generation
- `response_generation_allowed: false` — OR stage does not produce final user-facing response text

### 4.4 No Domain Writes
- `domain_writes_allowed: false` — OR stage executes read-only database operations only

---

## 5. Node Behavior Contracts

### 5.1 OR_Validate_EC_Result (Code node)
- Input: raw JSON (may be wrapped, flat, or chat-trigger string)
- Output: `_valid` flag (true/false) + optional `_normalized_ec_result` on success or error fields on failure
- Accepts both wrapped and flat shapes without throwing

### 5.2 OR_Route_Valid (Switch node)
- Input: `_valid` flag from validator
- Output branch 0 ("valid"): routes when `_valid === "true"`
- Output branch 1 ("invalid"): routes when `_valid === "false"`
- No fallthrough; both branches must be tested

### 5.3 OR_Extract_Handoff_Input (Code node)
- Input: normalized EC result from validator
- Output: flattened handoff-input object with keys: `tenant_id`, `thread_id`, `execution_id`, `trigger_message_id`, `idempotency_key`, `expected_status`, `ttl_seconds`, `source_module`, `warnings`
- No side effects

### 5.4 OR_Load_Execution_Context (Postgres node)
- **Required property:** `alwaysOutputData: true` (ensures output even if zero rows)
- Input: `execution_id`, `tenant_id`, `thread_id` from handoff input
- Output: execution_contexts row or empty array
- Query uses parameterized binding (`$1`, `$2`, `$3`)

### 5.5 OR_Verify_Context_Match (Code node)
- Input: handoff-input object + database row (optional)
- Output: verification object with `ok` flag, `code`, `message`, `warnings`, `mismatched_fields`, optional `reconciled_idempotency_key` and `reconciled_ttl_seconds`
- Supports strict and non-strict DB check modes

### 5.6 OR_Build_Handoff_Payload (Code node)
- Input: handoff-input object + verification result
- Output: canonical success handoff envelope
- Reconciles `idempotency_key` and `ttl_seconds` from verification if available

### 5.7 OR_Return_Result (Code node)
- Input: success handoff payload
- Output: raw JSON → planner (result node)
- Preserves exact handoff structure

### 5.8 OR_Return_Error (Code node)
- Input: error code, message, missing fields
- Output: canonical error envelope
- No `payload` key in error envelope

---

## 6. Execution Idempotency

The stage is fully idempotent:
- Identical input always produces identical output (within the same database state)
- Multiple calls to `run_full_pipeline()` with the same input and DB row must produce identical results
- Synthesized `idempotency_key` is deterministic (tenant_id + trigger_message_id + fixed suffix)

---

## 7. Cross-Tenant Isolation

**Invariant:** Execution contexts are strictly scoped to tenant/thread/execution triplets.

The `OR_Verify_Context_Match` node rejects:
- Any row where `tenant_id` does not match the handoff input
- Any row where `thread_id` does not match the handoff input
- Any row where `execution_id` does not match the handoff input
- Any row where `trigger_message_id` does not match the handoff input
- Any row where `status` does not match the expected status

Rejection emits `CONTEXT_MISMATCH` error with mismatched field names.

---

## 8. Not Documented in On-Disk Evidence

- Closure/audit/build reports (empty `reports/` folder)
- Live execution history or audit trail
- Long-term performance baseline or scaling tests
- Multi-tenant stress testing results
- Edge-case behavior beyond test_families.py scope (e.g., Unicode handling in idempotency keys, extreme TTL values)
