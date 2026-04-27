# WF-OR-01 Downstream Handoff (to WF-PL-01)

**From Stage:** WF-OR-01 (Orchestrator Input Handoff)  
**To Stage:** WF-PL-01 (Planner)  
**Handoff Type:** Success envelope (or error on upstream validation failure)  
**Trigger Condition:** WF-OR-01 completes validation, verification, and payload construction  

---

## 1. Success Handoff Envelope

### 1.1 Complete Structure
```json
{
  "status_kind": "success",
  "result_type": "handoff",
  "module_name": "orchestrator_input_handoff",
  "payload": {
    "tenant_id": "20000000-0000-0000-0000-000000000001",
    "thread_id": "30000000-0000-0000-0000-000000000001",
    "execution_id": "10000000-0000-0000-0000-000000000001",
    "trigger_message_id": "40000000-0000-0000-0000-000000000001",
    "idempotency_key": "tenant:trigger:exec_ctx:v1",
    "execution_status": "initialized",
    "ttl_seconds": 900,
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

### 1.2 Field Semantics

| Field | Type | Source | Semantics |
|-------|------|--------|-----------|
| `status_kind` | string | WF-OR-01 | Always `"success"` for valid handoff |
| `result_type` | string | WF-OR-01 | Always `"handoff"` (stage boundary artifact) |
| `module_name` | string | WF-OR-01 | Always `"orchestrator_input_handoff"` |
| `payload.tenant_id` | uuid | WF-EC-01 (passed through) | Multi-tenant isolation key; must be preserved exactly |
| `payload.thread_id` | uuid | WF-EC-01 (passed through) | User thread identifier; must be preserved exactly |
| `payload.execution_id` | uuid | WF-EC-01 (passed through) | Workflow execution context ID; must be preserved exactly |
| `payload.trigger_message_id` | uuid | WF-EC-01 (passed through) | Triggering user message ID; must be preserved exactly |
| `payload.idempotency_key` | string | WF-EC-01 or WF-OR-01 | If synthesized by flat-shape path, contains `"exec_ctx:v1"` suffix; reconciled with DB if present |
| `payload.execution_status` | string | WF-OR-01 | Canonical status at handoff point; always `"initialized"` for planning-ready contexts |
| `payload.ttl_seconds` | integer | WF-EC-01 or WF-OR-01 | Time-to-live in seconds; must be positive; defaults to 900 if synthesized |
| `payload.planning_allowed` | boolean | WF-OR-01 | Always `true` for success handoff (signals planner to proceed) |
| `payload.allowed_next_stage` | string | WF-OR-01 | Always `"WF-PL-01"` (canonical next stage in chain) |
| `payload.orchestrator_input.planning_mode` | string | WF-OR-01 | Always `"plan_only"` (or stage does not execute modules) |
| `payload.orchestrator_input.module_execution_allowed` | boolean | WF-OR-01 | Always `false` (module dispatch is WF-PL-01 responsibility) |
| `payload.orchestrator_input.response_generation_allowed` | boolean | WF-OR-01 | Always `false` (response composition is downstream) |
| `payload.orchestrator_input.domain_writes_allowed` | boolean | WF-OR-01 | Always `false` (or stage is read-only) |
| `payload.warnings` | array | WF-OR-01 | Optional synthesis warnings (empty if wrapped shape provided idempotency_key and ttl_seconds) |

---

## 2. Planner Entry Point (WF-PL-01)

### 2.1 Trigger Reception
WF-PL-01 will receive the success handoff envelope via:
- Direct result node connection (if n8n-native)
- Webhook call (if decoupled)
- Message broker (if async)

**Expected Reception:**
- Input schema matches the envelope structure above
- All UUID fields are valid RFC 4122 strings
- `planning_allowed=true` signals context is ready for planning
- `allowed_next_stage='WF-PL-01'` confirms this is the intended recipient

### 2.2 Validation Entry Checklist
WF-PL-01 MUST validate on entry:
- [ ] `status_kind === 'success'`
- [ ] `result_type === 'handoff'`
- [ ] `module_name === 'orchestrator_input_handoff'`
- [ ] All tenant/thread/execution/trigger UUIDs are non-empty and RFC 4122 compliant
- [ ] `payload.execution_status === 'initialized'`
- [ ] `payload.planning_allowed === true`
- [ ] `payload.allowed_next_stage === 'WF-PL-01'`
- [ ] `payload.ttl_seconds > 0`
- [ ] `payload.orchestrator_input` contains the four boolean flags (all false except planning_allowed)
- [ ] `warnings` is an array (may be empty)

### 2.3 Idempotency Key Usage
WF-PL-01 MUST:
- Preserve `idempotency_key` exactly as provided (synthesized or reconciled)
- Use it as the primary deduplication key for plan generation
- If planner generates multiple plan versions, all versions must be tagged with the same idempotency key
- If planner detects a replay (identical idempotency_key), return cached plan (or re-derive if cache miss)

### 2.4 TTL Handling
WF-PL-01 MUST:
- Use `ttl_seconds` to set absolute deadline for plan generation
- If plan generation takes longer than TTL, abort and return timeout error
- Pass TTL unchanged to downstream stages (WF-ME-01, etc.)
- If TTL is reconciled from DB (indicated by synthesis warning), note the reconciliation source

### 2.5 Orchestrator Input Constraints
WF-PL-01 MUST respect:
- `planning_mode='plan_only'` — generate plan steps only, no module execution
- `module_execution_allowed=false` — do not invoke any modules during planning
- `response_generation_allowed=false` — do not generate final response text
- `domain_writes_allowed=false` — do not write to database (plan generation is read-only at this stage)

---

## 3. Error Handoff (Fallback Path)

If WF-OR-01 validation fails, the error envelope is returned instead:

```json
{
  "status_kind": "failed",
  "result_type": "error",
  "module_name": "orchestrator_input_handoff",
  "error": {
    "code": "<ERROR_CODE>",
    "message": "<string>",
    "missing_fields": ["field_name_1", "field_name_2"]
  }
}
```

### 3.1 Error Codes and Planner Behavior

| Code | Cause | Planner Action |
|------|-------|----------------|
| `INVALID_HANDOFF_INPUT` | Input schema mismatch, missing fields, forbidden keys, or type errors | Reject upstream result; return error to thread owner; do not attempt planning |
| `NOT_READY_FOR_PLANNING` | Status is not `"initialized"` or TTL is non-positive | Reject with retry-later signal; suggest upstream re-run execution context stage |
| `CONTEXT_MISMATCH` | Database verification failed (tenant/thread/execution mismatch) | Reject with security alert; log cross-tenant attempt; do not process |

### 3.2 Error Envelope Validation
WF-PL-01 MUST reject the error path and NOT proceed with planning if:
- `status_kind !== 'failed'`
- `result_type !== 'error'`
- `error.code` is not one of the three canonical codes
- `error` key is missing or malformed

---

## 4. Data Continuity and Preservation

### 4.1 UUID Invariants
All UUID fields passed through from WF-EC-01 MUST be preserved exactly:
- `tenant_id` — unchanged from EC output
- `thread_id` — unchanged from EC output
- `execution_id` — unchanged from EC output (or synthesized from flat `id` field)
- `trigger_message_id` — unchanged from EC output

**Planner Invariant:** If planner detects a UUID mismatch between expected (from received handoff) and actual (from DB or real-time check), reject with error.

### 4.2 Idempotency Key Invariant
The `idempotency_key` may have been:
1. Provided by WF-EC-01 (wrapped shape)
2. Reconciled from DB by WF-OR-01 (if DB row has a different key)
3. Synthesized by WF-OR-01 from tenant + trigger message ID (flat shape path)

**Planner Invariant:** Whatever the source, WF-PL-01 MUST treat the received `idempotency_key` as canonical for deduplication. Do not re-derive or synthesize a new key.

### 4.3 Warnings Propagation
If the handoff includes warnings (e.g., `"idempotency_key synthesized from flat EC shape"`):
- WF-PL-01 SHOULD log the warnings in trace/audit logs
- WF-PL-01 SHOULD include warnings in downstream handoff to WF-ME-01
- Warnings do NOT signal failure; they signal reconciliation or synthesis

---

## 5. Integration Sequence

### 5.1 Normal Flow (Happy Path)
```
WF-EC-01 (success)
    ↓ (EC_Return_Result: wrapped or flat)
WF-OR-01 (validate → verify → build)
    ↓ (success handoff envelope)
WF-PL-01 (receive → validate → generate plan)
    ↓ (plan envelope to WF-ME-01)
```

### 5.2 Error Flow
```
WF-EC-01 (success) OR (upstream error)
    ↓ (malformed or non-initialized input)
WF-OR-01 (validate → fail)
    ↓ (error envelope)
WF-PL-01 (receive → reject)
    ↓ (error response to thread owner)
```

### 5.3 Cross-Tenant Rejection Flow
```
WF-EC-01 (success)
    ↓ (valid schema, but wrong tenant context)
WF-OR-01 (validate ✓ → verify ✗)
    ↓ (error: CONTEXT_MISMATCH)
WF-PL-01 (receive → reject with security alert)
    ↓ (log incident; no plan generated)
```

---

## 6. Post-Handoff Responsibilities

### 6.1 WF-OR-01 Guarantees
- Handoff envelope is immutable after emission (WF-OR-01 does not re-touch it)
- All UUIDs are canonical (no further validation needed by planner)
- Cross-tenant isolation is enforced at OR stage (planner can trust tenant boundary)
- Idempotency key is finalized (planner can use as-is for deduplication)

### 6.2 WF-PL-01 Obligations
- Receive handoff and validate all required fields
- Preserve all UUID and idempotency fields exactly in downstream handoff
- Generate plan steps using the received execution context
- Enforce planner-specific constraints (no module dispatch, no final response)
- Pass planning-allowed context downstream to WF-ME-01
- Emit plan envelope with same tenant/thread/execution/trigger IDs

### 6.3 Forward Handoff to WF-ME-01 (Module Execution)
WF-PL-01 will emit a plan envelope to WF-ME-01 that includes:
```json
{
  "status_kind": "success",
  "result_type": "plan",
  "module_name": "planner",
  "payload": {
    "tenant_id": "<from WF-OR-01>",
    "thread_id": "<from WF-OR-01>",
    "execution_id": "<from WF-OR-01>",
    "trigger_message_id": "<from WF-OR-01>",
    "idempotency_key": "<from WF-OR-01>",
    "plan_steps": [...],
    "allowed_next_stage": "WF-ME-01",
    "warnings": []
  }
}
```

**Critical:** All identifier fields MUST match the received WF-OR-01 handoff exactly.

---

## 7. Known Limitations and Non-Guarantees

### 7.1 Not Documented in On-Disk Evidence
- **Live handoff observation:** No recorded traces of actual OR → PL handoff execution
- **Planner behavior on receipt:** No documented WF-PL-01 entry point or validation rules
- **Failure recovery path:** No documented handling of planner timeout or rejection
- **Async handoff scenarios:** Assumes synchronous direct handoff; async/broker scenarios not documented
- **Schema evolution:** No versioning or backward-compatibility strategy documented

### 7.2 Test Evidence Gaps
- **Integration test:** No test of actual OR → PL end-to-end flow
- **Planner feedback loop:** No test of plan rejection or retry scenarios
- **Database consistency:** No test of idempotency key reconciliation with live DB
- **Performance SLA:** No documented latency expectations for handoff reception

### 7.3 Runtime Guarantees Not Provided
- **Delivery guarantee:** No documented guarantee that handoff will be received (no ACK mechanism)
- **Ordering guarantee:** No guarantee that handoffs arrive in order (no sequence numbering)
- **Deduplication:** Idempotency key is for planner deduplication; OR stage does not deduplicate itself
- **Audit trail:** No documented audit trail for handoff transmission or receipt

---

## 8. Handoff Checklist for Integration Test

### Pre-Integration
- [ ] WF-OR-01 blueprint is imported and live on target n8n instance
- [ ] WF-PL-01 blueprint is imported and ready to receive
- [ ] Webhook connection (if async) is configured for OR → PL handoff
- [ ] Database is seeded with test execution_contexts rows for verification

### Integration Test (Manual or Automated)
- [ ] Trigger WF-EC-01 with valid input and observe success result
- [ ] WF-OR-01 receives EC result and completes validation
- [ ] WF-OR-01 emits success handoff envelope with `allowed_next_stage='WF-PL-01'`
- [ ] WF-PL-01 receives handoff and validates all required fields
- [ ] WF-PL-01 generates plan steps using received context
- [ ] WF-PL-01 emits plan envelope with same tenant/thread/execution IDs
- [ ] Trace shows no UUID mutations between OR and PL outputs
- [ ] Idempotency key matches between OR handoff and PL plan envelope

### Error Scenario Test
- [ ] Trigger WF-EC-01 with non-initialized context
- [ ] WF-OR-01 rejects with `code='NOT_READY_FOR_PLANNING'`
- [ ] WF-PL-01 receives error envelope and aborts planning
- [ ] Error is logged and thread owner is notified

### Cross-Tenant Scenario Test (Security)
- [ ] Trigger WF-OR-01 with valid wrapped input but wrong tenant in DB
- [ ] WF-OR-01 rejects with `code='CONTEXT_MISMATCH'`
- [ ] WF-PL-01 receives error and logs security alert
- [ ] Plan is NOT generated for cross-tenant attempt
