# WF-EC-01 — Test Entry/Exit Points

**Date:** 2026-04-19
**Status:** CLOSED 10/10
**Source:** WF-EC-01_NODE_MAP.md, CLOSURE_REPORT_WF-EC-01.md (V1-V7 execution IDs)

This document specifies the canonical entry points (triggers), exit points (terminals), and their test harness bindings for WF-EC-01.

---

## 1. Entry points

### 1.1 EC_Input (executeWorkflowTrigger v1)

**Type:** `n8n-nodes-base.executeWorkflowTrigger`
**TypeVersion:** 1
**Parameters:** `{}` (empty)
**Purpose:** Canonical sub-workflow entry for TR-01 and test harness.

**Call signature (when wired as sub):**
```javascript
executeWorkflow(workflowId: "v9jih4jqeXpOJOiH", inputData: {
  // Flat form (preferred)
  tenant_id: "<uuid>",
  thread_id: "<uuid>",
  trigger_message_id: "<uuid>",
  resolution_method?: "string",
  resolved_at?: "ISO8601",
  idempotency_key?: "string"
  
  // OR nested form (TR-01 envelope)
  // request: {...flat...},
  // idempotency_key?: "string"
})
```

**Test harness binding:** Live execution via `mcp__execute_workflow` with input fixture.

**Live execution evidence:**
- V6 caller exec 772 → child exec 773 (TR-envelope shape acceptance smoke)
- Passed first attempt; no fix ladders required.

### 1.2 When clicking 'Execute workflow' (manualTrigger v1)

**Type:** `n8n-nodes-base.manualTrigger`
**Purpose:** Debug entry for UI-driven testing.
**Parameter pin-data:** Test fixtures can be pinned to this node for manual E2E sweep.

**Test harness binding:** V1-V7 sweep used ephemeral caller + EWT (not manual trigger).

**Status:** Retained for developer convenience; not part of closure chain.

### 1.3 When chat message received (chatTrigger v1.4, disabled)

**Type:** `@n8n/n8n-nodes-langchain.chatTrigger`
**Status:** `disabled: true` (webhook surface suppressed)
**Rationale:** Off-contract; EC-01 is not a public chat entry point.

**Test harness binding:** None (disabled in Phase 4).

---

## 2. Exit points (terminals)

### 2.1 EC_Return_Result (success terminal)

**Type:** `n8n-nodes-base.code` (v2)
**Role:** Shape and return the canonical ExecutionContext envelope on success.

**Input (from EC_Load_Existing_Context):**
- Row object from Postgres with all columns populated.

**Output (on success):**
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

**Exit code:** None (implicit success).

**Test harness coverage:**
- V1 (shell integrity): node present, wired from EC_Load_Existing_Context.
- V2 (invalid input): this terminal is NOT reached (invalid path → EC_Return_Error).
- V3 (happy path): exec 767 reaches this terminal, output verified.
- V4 (idempotency): exec 769 reaches this terminal, output byte-identical to V3.
- V5 (cross-tenant): exec 771 reaches this terminal.
- V6 (TR envelope): exec 773 reaches this terminal with nested input shape.

### 2.2 EC_Return_Error (invalid-input terminal)

**Type:** `n8n-nodes-base.code` (v2)
**Role:** Return an error-shaped envelope for invalid input.

**Input (from EC_Route_Valid invalid branch):**
- Output of EC_Validate_Input with `_valid: 'false'`.

**Output (on invalid input):**
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

**Exit code:** None (implicit error status via status_kind).

**Test harness coverage:**
- V1 (shell integrity): node present, wired from EC_Route_Valid[1] invalid branch.
- V2 (invalid input): exec 765 reaches this terminal, error code verified as INVALID_INPUT.
- V3..V6 (happy paths): this terminal is NOT reached (valid path).

---

## 3. Data flow paths

### Path 1: Valid input → happy path

```
EC_Input (or manual trigger)
  ↓
EC_Validate_Input [_valid='true']
  ↓
EC_Route_Valid [output 0: valid]
  ↓
EC_Build_Init_Payload [row materialization]
  ↓
EC_Upsert_Context [INSERT ON CONFLICT DO NOTHING]
  ↓
EC_Load_Existing_Context [SELECT WHERE idempotency_key=..., tenant_id=...]
  ↓
EC_Return_Result [success envelope]
```

**Test coverage:** V1, V3, V4, V5, V6.

### Path 2: Invalid input → error path

```
EC_Input (or manual trigger)
  ↓
EC_Validate_Input [_valid='false']
  ↓
EC_Route_Valid [output 1: invalid]
  ↓
EC_Return_Error [error envelope]
```

**Test coverage:** V2.

### Path 3: Idempotent replay (on conflict)

```
Path 1 (first run)
  ↓
EC_Upsert_Context [INSERT returns 1 row]
  ↓
EC_Load_Existing_Context → EC_Return_Result
---
Path 1 (second run, same idempotency_key)
  ↓
EC_Upsert_Context [INSERT returns 0 rows, ON CONFLICT DO NOTHING]
  ↓
[alwaysOutputData: true fires Load anyway]
  ↓
EC_Load_Existing_Context [SELECT returns existing row]
  ↓
EC_Return_Result [same envelope as first run]
```

**Test coverage:** V4.

---

## 4. Test fixture registry

All fixtures used in V-sweep (per CLOSURE_REPORT §4 and AUDIT_REPORT §3):

| Fixture | Type | V-test | Execution ID | idempotency_key | Cleanup |
|---------|------|--------|--------------|-----------------|---------|
| V2-invalid | Input (missing tenant_id) | V2 | 765 | N/A (error path, no insert) | N/A |
| V3-happy | Input (valid flat) | V3 | 767 | `wf_ec_01_fixture_v3_happy_20260419T0000Z` | DELETE ✅ |
| V4-replay | Input (identical to V3) | V4 | 769 | `wf_ec_01_fixture_v3_happy_20260419T0000Z` | (same row as V3) |
| V5-cross-tenant | Input (different tenant_id, different key) | V5 | 771 | `wf_ec_01_fixture_v5_cross_tenant_20260419T0000Z` | DELETE ✅ |
| V6-tr-smoke | Input (nested {request:{...}} shape) | V6 | 773 | `wf_ec_01_fixture_v6_tr_smoke_20260419T0000Z` | DELETE ✅ |

**Cleanup receipt:** 3 rows deleted post-sweep. Baseline restored. V7 drift probe confirmed zero on all canonical tables.

---

## 5. Test invocation patterns

### Pattern A: Direct EWT call (V6 style)

```javascript
// Ephemeral caller workflow
executeWorkflow({
  workflowId: "v9jih4jqeXpOJOiH",
  inputData: {
    request: {
      tenant_id: "<uuid>",
      thread_id: "<uuid>",
      trigger_message_id: "<uuid>",
      resolution_method: "existing",
      resolved_at: "2026-04-18T21:11:50Z"
    },
    idempotency_key: "wf_ec_01_fixture_v6_tr_smoke_20260419T0000Z"
  }
})
// Returns ExecutionContext envelope
```

**Usage:** V1, V2, V3, V4, V5, V6 executed via this pattern (ephemeral caller Q4FywM9FThgxgrwR).

### Pattern B: Manual trigger with pinData (alternative)

```
1. Open EC-01 in n8n UI
2. Go to manualTrigger "When clicking 'Execute workflow'"
3. Pin test data to node
4. Click Execute
5. View output
```

**Usage:** Ad-hoc developer testing; not used in V-sweep.

### Pattern C: Logic-level unit tests (Family 1-10 vectors)

```python
from ec_logic import ec_validate_input, ec_build_init_payload

result = ec_validate_input({
  "tenant_id": "aaaaaaaa-0000-0000-0000-000000000001",
  ...
})
assert result["_valid"] == "true"
```

**Usage:** 30-test suites per family (300 total vectors, non-live).

---

## 6. Caller workflow disposition

**Ephemeral caller ID:** `Q4FywM9FThgxgrwR` ("EC-01 Closure Cycle Caller")

- **Created:** 2026-04-18T21:10:02.970Z
- **Updated:** 3x (V3, V5, V6 payload tweaks)
- **Archived:** Post-V6 (no longer live-active)
- **Snapshot:** `tools/n8n-patch/ec-closure-harness/EC-01_caller.json`
- **Status:** Off-disk; available for retrospective inspection via audit log.

No live chain workflows depend on this ephemeral caller.

---

## 7. Live execution summary

| Phase | Execution | Caller | Child | Entry | Path | Exit | Status |
|-------|-----------|--------|-------|-------|------|------|--------|
| V1 | 763 | *static check* | — | — | shell integrity | — | ✅ |
| V2 | 764 | Q4F... | 765 | EC_Input EWT | invalid → error | EC_Return_Error | ✅ |
| V3 | 766 | Q4F... | 767 | EC_Input EWT | happy → success | EC_Return_Result | ✅ |
| V4 | 768 | Q4F... | 769 | EC_Input EWT | happy (replay) → success | EC_Return_Result | ✅ |
| V5 | 770 | Q4F... | 771 | EC_Input EWT | happy (cross-tenant) → success | EC_Return_Result | ✅ |
| V6 | 772 | Q4F... | 773 | EC_Input EWT (nested) | happy (TR shape) → success | EC_Return_Result | ✅ |
| V7 | — | *read-only DB probe* | — | — | — | — | ✅ |

---

## 8. Error handling & fallback

### Error path 1: Missing required field

**Entry:** EC_Input receives payload missing `tenant_id`.
**Exit:** EC_Return_Error with `code: INVALID_INPUT`, `missing_fields: ['tenant_id']`.
**DB impact:** Zero (no write attempted).
**Recovery:** Caller retries with valid tenant_id.

### Error path 2: Malformed UUID

**Entry:** EC_Input receives `trigger_message_id: 'not-a-uuid'`.
**Exit:** EC_Return_Error with `code: INVALID_UUID`, `missing_field: 'trigger_message_id'`.
**DB impact:** Zero.
**Recovery:** Caller retries with valid UUID.

### Error path 3: DB write conflict (idempotency)

**Entry:** Path 1, second execution with same idempotency_key.
**Flow:** EC_Upsert_Context returns 0 rows. `alwaysOutputData: true` ensures EC_Load_Existing_Context fires.
**Exit:** EC_Return_Result with existing row (same id, same created_at).
**Recovery:** Implicit (idempotent — same output as first run).

### Error path 4: DB read failure (rare)

**Entry:** Path 1, EC_Load_Existing_Context SELECT fails or returns 0 rows (stale transaction, race).
**Exit:** EC_Return_Result with `error: {code: 'INTERNAL_LOAD_FAILED'}`, `status_kind: 'failure'`.
**DB impact:** Row may be inserted (from Upsert) but not returned (rare edge case).
**Recovery:** Caller retries; SELECT should find row on retry.

---

## 9. Test harness requirements

### Pre-test requirements

1. Workflow EC-01 active, shell matches BUILD_REPORT_WF-EC-01.md §1-3.
2. Postgres creds `z9nKgToNWvIW7P8f` bound on both postgres nodes.
3. Ephemeral caller or direct `mcp__execute_workflow` ready.

### During-test requirements

1. Input fixtures pinned or passed as JSON.
2. Execution IDs recorded.
3. Output envelope captured.
4. DB state probed pre/post (for V7 drift probe).

### Post-test requirements

1. Fixture rows cleaned up (DELETE with idempotency_key IN clause).
2. Baseline counts restored.
3. Caller archived (if ephemeral).

---

## 10. Known entry/exit edge cases (caveat)

1. **chatTrigger webhook disabled but node present:** Legacy from pre-Phase-4. Disabled additively (does not fire). Node is preserved for rollback parity.

2. **Direct table write outside EC-01:** If another workflow or script writes to `execution_contexts` outside EC-01's idempotency key pattern, EC-01's determinism is preserved (each key is still unique). No collision risk.

3. **Multiple EC_Input calls in same execution window:** n8n does not spawn sub-workflows twice in one parent execution unless chained; EWT fires once per sub-call node.

4. **Caller retries:** If caller timeout → auto-retry with same input, EC-01 returns same output (idempotent). Caller does not observe the replay detail; just gets the ExecutionContext again.

---

## Reference

- **Node-level details:** WF-EC-01_NODE_MAP.md
- **Connection topology:** WF-EC-01_CONNECTION_MAP.md
- **Live execution proof:** CLOSURE_REPORT_WF-EC-01.md §4 (V1-V7 execution IDs + output verification)
- **Build details:** BUILD_REPORT_WF-EC-01.md (EC_Input addition, chatTrigger disabling)
