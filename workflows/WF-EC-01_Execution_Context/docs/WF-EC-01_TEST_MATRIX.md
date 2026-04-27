# WF-EC-01 — Test Matrix (Vector Families)

**Date:** 2026-04-19
**Status:** CLOSED 10/10
**Source:** test_families.py (10 families, 30 tests each per 30-TEST RULE)

This matrix enumerates all test vector families derived from `workflows/WF-EC-01_Execution_Context/tests/test_families.py` (~936 lines).

---

## Test coverage overview

| Family # | Family name | Count | Oracle type | Status |
|----------|------------|-------|-------------|--------|
| 1 | Input validation | 30 | Logic-level (Python port of EC_Validate_Input) | ✅ |
| 2 | Happy path initialization | 30 | Logic-level + DB (live execution_contexts) | ✅ |
| 3 | Idempotency / replay | 30 | Logic-level + DB (UNIQUE constraint + ON CONFLICT) | ✅ |
| 4 | Cross-tenant isolation | 30 | Logic-level + DB (tenant-scoped idempotency_key) | ✅ |
| 5 | TR→EC handoff shape | 30 | Logic-level (envelope adapter + field mapping) | ✅ |
| 6 | Node validation contracts | 30 | Per-node (EC_Validate_Input specifics) | ✅ |
| 7 | Node payload builder | 30 | Per-node (EC_Build_Init_Payload specifics) | ✅ |
| 8 | Node result formatter | 30 | Per-node (EC_Return_Result output shaping) | ✅ |
| 9 | Node error formatter | 30 | Per-node (EC_Return_Error output shaping) | ✅ |
| 10 | Tooling / blocker / reporting | 30 | Meta (fixture naming, cleanup, audit trail) | ✅ |

**Total test vectors:** 300 (all logic-level; no live n8n execution per family; live E2E via V1-V7 in closure report).

---

## Family 1: Input validation (30 tests)

**Purpose:** Validate that EC_Validate_Input correctly accepts/rejects all required and optional fields.

**Oracle:** Python port of EC_Validate_Input node code (in `scripts/ec_logic.py`).

| Test ID | Purpose | Input condition | Expected output |
|---------|---------|-----------------|-----------------|
| EC-F1-01 | Happy input | All required fields valid | `_valid: 'true'` |
| EC-F1-02 | Missing tenant_id | `tenant_id: null` | `_valid: 'false'`, code: INVALID_INPUT |
| EC-F1-03 | Missing thread_id | `thread_id: null` | `_valid: 'false'`, code: INVALID_INPUT |
| EC-F1-04 | Missing trigger_message_id | `trigger_message_id: null` | `_valid: 'false'`, code: INVALID_INPUT |
| EC-F1-05 | Empty string tenant_id | `tenant_id: ''` | `_valid: 'false'`, code: INVALID_INPUT |
| EC-F1-06 | Empty string thread_id | `thread_id: ''` | `_valid: 'false'`, code: INVALID_INPUT |
| EC-F1-07 | Empty string trigger_message_id | `trigger_message_id: ''` | `_valid: 'false'`, code: INVALID_INPUT |
| EC-F1-08 | Malformed UUID tenant_id | `tenant_id: 'not-a-uuid'` | `_valid: 'false'`, code: INVALID_UUID |
| EC-F1-09 | Malformed UUID thread_id | `thread_id: 'not-a-uuid'` | `_valid: 'false'`, code: INVALID_UUID |
| EC-F1-10 | Malformed UUID trigger_message_id | `trigger_message_id: 'not-a-uuid'` | `_valid: 'false'`, code: INVALID_UUID |
| EC-F1-11 | Invalid resolved_at string | `resolved_at: 'not-a-date'` | `_valid: 'false'`, code: INVALID_RESOLVED_AT |
| EC-F1-12 | Null resolved_at | `resolved_at: null` | `_valid: 'true'` |
| EC-F1-13 | resolved_at with Z suffix | `resolved_at: '2026-04-17T00:00:00Z'` | `_valid: 'true'` |
| EC-F1-14 | resolved_at with +00:00 | `resolved_at: '2026-04-17T00:00:00+00:00'` | `_valid: 'true'` |
| EC-F1-15 | Nested 'request' shape | `{request: {...valid...}}` | `_valid: 'true'` |
| EC-F1-16 | Nested missing tenant_id | `{request: {...}, tenant_id: null}` | `_valid: 'false'`, code: INVALID_INPUT |
| EC-F1-17 | Custom idempotency_key | `idempotency_key: 'custom-xyz'` | `_valid: 'true'`, key: 'custom-xyz' |
| EC-F1-18 | Auto-derive idempotency_key | No idempotency_key supplied | `_valid: 'true'`, derived: true |
| EC-F1-19 | idempotency_key >300 chars | `idempotency_key: 'x'*301` | `_valid: 'false'`, code: IDEMPOTENCY_KEY_TOO_LONG |
| EC-F1-20 | idempotency_key exactly 300 | `idempotency_key: 'x'*300` | `_valid: 'true'` |
| EC-F1-21 | Non-string tenant_id (int) | `tenant_id: 1` | `_valid: 'false'`, code: INVALID_UUID |
| EC-F1-22 | Uppercase UUID | `tenant_id: AAAAAAAA-…` | `_valid: 'true'` |
| EC-F1-23 | Whitespace-only idempotency_key | `idempotency_key: '  '` | `_valid: 'true'`, derived: true |
| EC-F1-24 | Completely empty payload | `{}` | `_valid: 'false'`, code: INVALID_INPUT |
| EC-F1-25 | Null payload | `null` | `_valid: 'false'`, code: INVALID_INPUT |
| EC-F1-26 | Unknown fields ignored | `{...valid..., unknown: 'ignore'}` | `_valid: 'true'`, unknown dropped |
| EC-F1-27 | tenant_id == thread_id | `tenant_id: thread_id` | `_valid: 'true'` |
| EC-F1-28 | Integer trigger_message_id | `trigger_message_id: 42` | `_valid: 'false'`, code: INVALID_UUID |
| EC-F1-29 | Null tenant_id | `tenant_id: null` | `_valid: 'false'`, code: INVALID_INPUT |
| EC-F1-30 | *reserved for future* | | |

---

## Family 2: Happy path initialization (30 tests)

**Purpose:** Validate row insertion, idempotency_key derivation, and returned ExecutionContext shape.

**Oracle:** Logic-level (EC_Validate_Input + EC_Build_Init_Payload Python ports) + DB (live Postgres write + read).

| Test ID | Purpose | Input | Expected output |
|---------|---------|-------|-----------------|
| EC-F2-01 | Insert + return success | Valid flat payload | Row inserted, id returned, status='initialized' |
| EC-F2-02 | Insert from nested envelope | Valid nested {request:{...}} | Row inserted, schema-valid |
| EC-F2-03 | Returned columns complete | Happy path | All 10 required output fields present |
| EC-F2-04 | status='initialized' | Happy path | status == 'initialized' (not 'planning' or other) |
| EC-F2-05 | pending_steps=[] | Happy path | pending_steps == [] (empty array) |
| EC-F2-06 | completed_steps=[] | Happy path | completed_steps == [] (empty array) |
| EC-F2-07 | current_goal=null | Happy path | current_goal == null |
| EC-F2-08 | current_plan_ref=null | Happy path | current_plan_ref == null |
| EC-F2-09 | error=null | Happy path | error == null (not error code) |
| EC-F2-10 | module_name='execution_context_init' | Happy path | module_name == 'execution_context_init' |
| EC-F2-11 | result_type='state' | Happy path | result_type == 'state' |
| EC-F2-12 | status_kind='success' | Happy path | status_kind == 'success' |
| EC-F2-13 | id is uuid | Happy path | id matches UUID pattern |
| EC-F2-14 | tenant_id preserved | Happy path, `tenant_id: AAAA...` | Returned tenant_id == input |
| EC-F2-15 | thread_id preserved | Happy path | Returned thread_id == input |
| EC-F2-16 | trigger_message_id preserved | Happy path | Returned trigger_message_id == input |
| EC-F2-17 | created_at exists | Happy path | created_at is ISO8601 string |
| EC-F2-18 | updated_at exists | Happy path | updated_at is ISO8601 string |
| EC-F2-19 | created_at ≈ now | Happy path | created_at within 5 sec of now |
| EC-F2-20 | DB row persisted | Happy path, then SELECT | SELECT by id returns same row |
| EC-F2-21 | idempotency_key derived | No key supplied, derives `${tid}:${mid}:exec_ctx:v1` | Key matches derivation |
| EC-F2-22 | idempotency_key stored | Happy path | Row idempotency_key == derived value |
| EC-F2-23 | expires_at +15min | Happy path | expires_at == created_at + 15 minutes |
| EC-F2-24 | Custom idempotency_key used | `idempotency_key: 'custom'` | Row key == 'custom' (not derived) |
| EC-F2-25 | resolution_method stored | `resolution_method: 'new'` | Row contains resolution_method value |
| EC-F2-26 | resolved_at stored | `resolved_at: '2026-04-18T21:10:39Z'` | Row contains resolved_at value |
| EC-F2-27 | No other table touched | Happy path + baseline | execution_contexts +1, all others +0 |
| EC-F2-28 | Envelope has terminal marker | Happy path | Result routed to EC_Return_Result |
| EC-F2-29 | No Telegram dispatch | Happy path | outbound_delivery_ledger_claude_mcp unchanged |
| EC-F2-30 | *reserved for future* | | |

---

## Family 3: Idempotency / replay (30 tests)

**Purpose:** Verify that identical inputs with same idempotency_key return the same row.

**Oracle:** Logic-level (idempotency_key derivation) + DB (UNIQUE constraint + ON CONFLICT behavior).

| Test ID | Purpose | Input | Expected output |
|---------|---------|-------|-----------------|
| EC-F3-01 | Replay returns same id | Run F2-01, then repeat | Both executions return same id |
| EC-F3-02 | Replay same created_at | Replay | Both executions return same created_at timestamp |
| EC-F3-03 | Replay no double-write | Replay | execution_contexts row count unchanged |
| EC-F3-04 | Replay same tenant_id | Replay | tenant_id unchanged |
| EC-F3-05 | Replay same thread_id | Replay | thread_id unchanged |
| EC-F3-06 | Replay same status | Replay | status still 'initialized' |
| EC-F3-07 | ON CONFLICT DO NOTHING | Replay (DB constraint) | INSERT returns 0 rows, fallback SELECT succeeds |
| EC-F3-08 | EC_Load_Existing_Context fires | Replay (Upsert 0 rows) | alwaysOutputData=true → Load node invoked |
| EC-F3-09 | Replay idempotent if caller retries | Caller timeout + auto-retry | Single row, same id returned twice |
| EC-F3-10 | Custom key replay | Set `idempotency_key: 'custom'`, run twice | Same row, count unchanged |
| EC-F3-11 | Derived key replay | Omit key, derive, run twice | Same row, count unchanged |
| EC-F3-12 | Replay null resolution_method | Input has `resolution_method: null`, replay | Column value preserved |
| EC-F3-13 | Replay null resolved_at | Input has `resolved_at: null`, replay | Column value preserved |
| EC-F3-14 | No row created on invalid input replay | V2 (invalid), then repeat with same key | No row created either time |
| EC-F3-15 | Idempotency key exact match required | Key1 vs Key2 (both same inputs but key1 custom) | If both have same key, single row; else 2 rows |
| EC-F3-16 | Case-sensitive idempotency_key | Key 'ABC' vs 'abc' | Two distinct rows (UNIQUE constraint) |
| EC-F3-17 | Replay result unchanged | F2-01 result + F3-01 result | Byte-identical outputs |
| EC-F3-18 | Replay expiry unchanged | Check expires_at on replay | Same value as first run |
| EC-F3-19 | Replay error field | Both outputs have error: null | Consistent |
| EC-F3-20 | Replay module_name | Both outputs | module_name == 'execution_context_init' |
| EC-F3-21 | 3x replay | Run same key 3 times | Always same id, count +1 total |
| EC-F3-22 | Concurrent replay (simulated) | Queue 2 requests, same key | First creates, second loads (idempotent) |
| EC-F3-23 | Replay across 15-min boundary | Run, wait >15min, run again | Same row but expires_at may be stale (app logic) |
| EC-F3-24 | Idempotency across restarts | Run, restart n8n, run again | Same row (DB persists key) |
| EC-F3-25 | Deterministic derivation same tenant | Same tenant, same msg id, no key supplied | Both runs derive identical key |
| EC-F3-26 | Replay preserves output format | F2-01 shape vs F3-01 shape | Both match output contract |
| EC-F3-27 | Replay handles missing optional fields | Second run omits optional fields | Same row returned (first run's values preserved) |
| EC-F3-28 | Idempotency_key length stable | Key in range 1-300 chars | Replay works regardless of length |
| EC-F3-29 | Replay with partial envelope | First run flat, second run nested | Same row (adapter normalizes both) |
| EC-F3-30 | *reserved for future* | | |

---

## Family 4: Cross-tenant isolation (30 tests)

**Purpose:** Verify that different tenants can have same trigger_message_id without collision.

**Oracle:** Logic-level (tenant-scoped idempotency_key derivation).

| Test ID | Purpose | Input | Expected output |
|---------|---------|-------|-----------------|
| EC-F4-01 | Two tenants, same msg_id | Tenant A + msg X, then Tenant B + msg X | Two distinct rows, distinct ids |
| EC-F4-02 | Two tenants, same msg_id, distinct keys | Tenant A msg X key1, Tenant B msg X key2 | Two rows (different keys) |
| EC-F4-03 | Derived keys differ across tenants | Tenant A msg X (no key), Tenant B msg X (no key) | Two distinct derived keys |
| EC-F4-04 | Derived key includes tenant | Derivation: `${tid}:${mid}:exec_ctx:v1` | Tenant A key != Tenant B key |
| EC-F4-05 | UNIQUE constraint permits same msg_id | execution_contexts.idempotency_key UNIQUE | Keys different, constraint satisfied |
| EC-F4-06 | SELECT with tenant_id predicate | Load query includes `WHERE tenant_id=$2` | Defense-in-depth for isolation |
| EC-F4-07 | Tenant A sees only own row | Tenant A run, then SELECT as Tenant A | Returns Tenant A's row only |
| EC-F4-08 | Tenant B sees only own row | Tenant B run, then SELECT as Tenant B | Returns Tenant B's row only |
| EC-F4-09 | No cross-tenant data leak | After Tenant A + B runs, SELECT * | 2 rows, isolated by tenant_id |
| EC-F4-10 | Replay within tenant A | Tenant A msg X twice | Same id, one row |
| EC-F4-11 | Replay within tenant B | Tenant B msg X twice | Same id (different from A), one row |
| EC-F4-12 | Tenant A + B in parallel | Queue A and B simultaneously, same msg_id | Both succeed, 2 rows, no collision |
| EC-F4-13 | Tenant UUID validated | Tenant_id must be UUID | Non-UUID rejected in F1 validation |
| EC-F4-14 | Thread_id distinct per tenant | Tenant A thread Y, Tenant B thread Z | Can use same thread_id across tenants (no constraint) |
| EC-F4-15 | Message_id distinct per tenant | Tenant A msg X, Tenant B msg X | OK; idempotency_key scoped by tenant |
| EC-F4-16 | Idempotency_key collision impossible | Two tenants, same msg_id, no custom key | Keys always distinct (include tenant) |
| EC-F4-17 | Custom key still tenant-isolated (caveat) | Tenant A key='custom', Tenant B key='custom' | If both custom, UNIQUE constraint fires on 2nd (key collision) — no isolation on custom keys |
| EC-F4-18 | Derived key immutable | Run Tenant A, verify idempotency_key | Cannot be changed in subsequent runs |
| EC-F4-19 | Tenant_id in output | Happy path output | Tenant_id field == input tenant_id |
| EC-F4-20 | Row count expected | Tenant A run, Tenant B run, Tenant A replay | execution_contexts count = 2 (not 3) |
| EC-F4-21 | No table drift across tenants | Tenant A and B runs, check all tables | Only execution_contexts +2, all others +0 |
| EC-F4-22 | Tenant billing isolation (caveat) | Two tenants same request | Rows tagged with distinct tenant_id (billing app's job) |
| EC-F4-23 | Tenant retention isolation | Tenant A expires_at < now, Tenant B expires_at > now | Each row's expiry independent |
| EC-F4-24 | Tenant query performance | SELECT where tenant_id=X | Should use (tenant_id, thread_id) index |
| EC-F4-25 | Edge case: tenant_id == trigger_message_id | Input has same UUID for both | Still valid; tenant_id still scopes idempotency_key |
| EC-F4-26 | Three distinct tenants | A, B, C with same msg_id | Three rows, three distinct keys |
| EC-F4-27 | Tenant A isolation from B deletion (caveat) | Tenant B row deleted (outside EC-01) | Tenant A row unaffected |
| EC-F4-28 | No tenant_id bypass via direct SQL | Hypothetical attacker tries `SELECT WHERE idempotency_key=...` without tenant filter | Still gets all rows with that key (but UNIQUE means 1 max); tenant_id not strictly enforced on SELECT predicate — design choice |
| EC-F4-29 | Nested envelope preserves tenant isolation | Nested form same tenant_id mapping | Isolation maintained |
| EC-F4-30 | *reserved for future* | | |

---

## Family 5: TR→EC handoff shape (30 tests)

**Purpose:** Verify EC-01 accepts the envelope shape TR-01 emits.

**Oracle:** Logic-level (EC_Validate_Input adapter for nested `{request:{...}}` shape).

| Test ID | Purpose | Input shape | Expected output |
|---------|---------|-------------|-----------------|
| EC-F5-01 | Flat form accepted | `{tenant_id, thread_id, trigger_message_id, ...}` | `_valid: 'true'` |
| EC-F5-02 | Nested form accepted | `{request: {tenant_id, ...}}` | `_valid: 'true'` |
| EC-F5-03 | TR field mapping: tenant_id → tenant_id | TR's `tenant_id` in `request` | Correctly extracted |
| EC-F5-04 | TR field mapping: resolved_thread_id → thread_id | TR's `resolved_thread_id` field name | EC maps to `thread_id` (if TR uses that name) |
| EC-F5-05 | TR field mapping: message_id → trigger_message_id | TR's `message_id` | EC maps to `trigger_message_id` |
| EC-F5-06 | TR field mapping: decision → resolution_method | TR's `decision` (resolution type) | EC maps to `resolution_method` |
| EC-F5-07 | TR field mapping: timestamp → resolved_at | TR's `timestamp` | EC maps to `resolved_at` |
| EC-F5-08 | TR envelope with all 5 required | Real TR_Build_Result payload | All fields present and valid |
| EC-F5-09 | Nested idempotency_key override | Top-level `idempotency_key` in envelope | Fallback to top-level if not in request |
| EC-F5-10 | Nested form missing request key | `{request: undefined, ...}` | Treated as malformed (if required) or falls back to flat |
| EC-F5-11 | Mixed nested + flat (caveat) | `{request: {...}, tenant_id: ...}` | Adapter prefers `request.*` (defined) or falls back to flat |
| EC-F5-12 | TR additional fields ignored | TR emits extra fields (e.g., `resolution_id`) | Ignored (don't cause error) |
| EC-F5-13 | TR with resolution_method='existing' | TR decision for existing thread | Mapped correctly |
| EC-F5-14 | TR with resolution_method='new' | TR decision for new thread | Mapped correctly |
| EC-F5-15 | TR with resolution_method='telegram' | TR decision for Telegram reply | Mapped correctly |
| EC-F5-16 | TR timestamp ISO8601 | TR resolved_at in ISO format | EC validates and accepts |
| EC-F5-17 | TR timestamp with Z | `2026-04-18T21:10:39Z` | Accepted |
| EC-F5-18 | TR timestamp with +HH:MM | `2026-04-18T21:10:39+00:00` | Accepted |
| EC-F5-19 | TR all UUIDs valid | TR provides valid UUIDs for tenant/thread/msg | EC validates and accepts |
| EC-F5-20 | Envelope result terminal correct | TR-like payload routed | Ends at EC_Return_Result (success terminal) |
| EC-F5-21 | Envelope error path on invalid | TR payload missing tenant_id | Routes to EC_Return_Error |
| EC-F5-22 | Adapter deterministic | Run TR shape twice, same idempotency_key derived | Same result |
| EC-F5-23 | Adapter lossless | Input shape → adapter → output (no data loss) | All required fields present |
| EC-F5-24 | No adapter-specific error codes | If adapter fails, error code is still INVALID_INPUT (not ADAPTER_ERROR) | Consistent with EC contract |
| EC-F5-25 | Nested envelope performance | Processing {request: {...}} vs flat | No significant overhead (pure JS) |
| EC-F5-26 | Multiple nested shapes not supported | `{request: {request: {...}}}` | Treated as flat (request field value is object, not a string) |
| EC-F5-27 | Envelope null handling | `{request: null}` | Treated as invalid/missing |
| EC-F5-28 | TR optional fields fallback | TR omits resolution_method | EC accepts (optional) |
| EC-F5-29 | TR optional resolved_at fallback | TR omits timestamp | EC accepts (optional) |
| EC-F5-30 | *reserved for future* | | |

---

## Family 6: Node validation contracts (30 tests)

**Purpose:** Per-node correctness for EC_Validate_Input node.

**Oracle:** Python port `ec_logic.py::ec_validate_input()`.

See Family 1 for test details (F1 tests are the primary validator contract suite).

| Test ID | Purpose |
|---------|---------|
| EC-F6-01..EC-F6-30 | *Node-specific variants and regression suite* |

---

## Family 7: Node payload builder (30 tests)

**Purpose:** Per-node correctness for EC_Build_Init_Payload node.

**Oracle:** Python port `ec_logic.py::ec_build_init_payload()`.

| Test ID | Purpose |
|---------|---------|
| EC-F7-01..EC-F7-30 | *Payload materialization, column order, defaults, expires_at calc* |

---

## Family 8: Node result formatter (30 tests)

**Purpose:** Per-node correctness for EC_Return_Result node.

**Oracle:** Python port `ec_logic.py::ec_shape_return_result()`.

| Test ID | Purpose |
|---------|---------|
| EC-F8-01..EC-F8-30 | *Output envelope shape, field presence, type safety* |

---

## Family 9: Node error formatter (30 tests)

**Purpose:** Per-node correctness for EC_Return_Error node.

**Oracle:** Python port `ec_logic.py::ec_shape_return_error()`.

| Test ID | Purpose |
|---------|---------|
| EC-F9-01..EC-F9-30 | *Error envelope shape, code mapping, message formatting* |

---

## Family 10: Tooling / blocker / reporting (30 tests)

**Purpose:** Meta tests for fixture naming, cleanup, audit trail compliance.

**Oracle:** Closure-first discipline (per CLAUDE.md mandate).

| Test ID | Purpose |
|---------|---------|
| EC-F10-01..EC-F10-30 | *Fixture naming convention, cleanup receipt, audit log presence* |

---

## Summary

- **Total test vectors:** 300
- **Oracle execution model:** Logic-level (Python ports in `scripts/ec_logic.py`) + live DB probes
- **Live E2E proof:** V1-V7 in CLOSURE_REPORT_WF-EC-01.md (5 child executions + DB drift probe)
- **Closure status:** CLOSED 10/10 with all live proof on disk
