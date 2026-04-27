# WF-OR-01 Test Matrix

**Scope:** Script-level deterministic test families (no live n8n execution, no live database required)  
**Total Test Count:** 650 tests across 13 families × 50 tests per family  
**Framework:** Python `unittest` (tests/test_families.py)  
**Evidence Source:** or_logic.py (primary contract truth)  

---

## Test Family Overview

### Family 1: input_validation (50 tests)
**Purpose:** Validate wrapped EC_Return_Result shape acceptance  
**Vectors:**
- Accepts valid wrapped shape with all required fields
- Coerces string values to normalized types
- Preserves `status_kind='success'`, `result_type='state'`
- Extracts TTL as integer

**Coverage:** All 50 cases exercise valid wrapped inputs with deterministic case indices

---

### Family 2: happy_path (50 tests)
**Purpose:** End-to-end validation → extract → verify → build → return success  
**Vectors:**
- Alternates wrapped (even i) and flat (odd i) input shapes
- Validates successfully on both shapes
- Extracts handoff input without errors
- Builds synthetic DB row and verifies match
- Constructs success handoff envelope with `planning_allowed=true`
- Confirms `allowed_next_stage='WF-PL-01'`

**Coverage:** 50 complete pipelines; 25 wrapped, 25 flat

---

### Family 3: invalid_input (50 tests)
**Purpose:** Reject malformed or incomplete input across 10 failure modes  
**Vectors (10 modes, 5 repeats each):**
1. Missing `status_kind` → INVALID_HANDOFF_INPUT
2. Missing `result_type` → INVALID_HANDOFF_INPUT
3. Missing `payload.tenant_id` → INVALID_HANDOFF_INPUT
4. Missing `payload.thread_id` → INVALID_HANDOFF_INPUT
5. Wrong `result_type` (="handoff") → INVALID_HANDOFF_INPUT
6. Wrong `status` (="completed") → NOT_READY_FOR_PLANNING
7. Negative `ttl_seconds` → NOT_READY_FOR_PLANNING
8. Forbidden key `plan` in payload → INVALID_HANDOFF_INPUT
9. Non-object input (string) → INVALID_HANDOFF_INPUT
10. Non-integer `ttl_seconds` → INVALID_HANDOFF_INPUT

**Coverage:** 5 repeats of each mode = 50 tests

---

### Family 4: replay_idempotency (50 tests)
**Purpose:** Verify deterministic idempotence across multiple identical calls  
**Vectors:**
- Calls `run_full_pipeline()` three times with identical input
- Wrapped cases (even i) and flat cases (odd i)
- No database row provided (non-strict mode)
- Asserts all three outputs are bitwise equal
- Confirms first output has `status_kind='success'`

**Coverage:** 50 cases; 25 wrapped, 25 flat

---

### Family 5: cross_tenant_isolation (50 tests)
**Purpose:** Reject execution-context verification mismatches across 5 field variants  
**Vectors (5 modes, 10 repeats each):**
1. DB row `tenant_id` mismatch → CONTEXT_MISMATCH
2. DB row `thread_id` mismatch → CONTEXT_MISMATCH
3. DB row `execution_id` mismatch → CONTEXT_MISMATCH
4. DB row `trigger_message_id` mismatch → CONTEXT_MISMATCH
5. DB row `status` mismatch → CONTEXT_MISMATCH

**Coverage:** 10 repeats of each mismatch type = 50 tests  
**Safety:** Validates cross-tenant leakage is rejected cleanly

---

### Family 6: ec_to_or_handoff (dual-shape adapter) (50 tests)
**Purpose:** Validate both wrapped and flat shape normalization and forbidden-key enforcement  
**Vectors:**
- Alternates wrapped (even i) and flat (odd i)
- Validates and normalizes successfully
- Confirms source_shape matches input variant
- Asserts no forbidden keys (`plan`, `plan_steps`, etc.) leak into handoff input
- **Flat-specific:** Verifies TTL defaults to 900, idempotency_key is synthesized with `exec_ctx:v1`, and warnings are present

**Coverage:** 50 complete normalizations; 25 wrapped, 25 flat

---

### Family 7: node_payload_builder (50 tests)
**Purpose:** Validate OR_Build_Handoff_Payload contract on normalized output  
**Vectors:**
- Cycles through wrapped/flat inputs (modulo 3)
- Validates, extracts, builds synthetic DB row, verifies
- Constructs handoff payload
- Asserts exact envelope structure:
  - `status_kind='success'`, `result_type='handoff'`, `module_name='orchestrator_input_handoff'`
  - `allowed_next_stage='WF-PL-01'`
  - `planning_allowed=true`
  - `execution_status='initialized'`
  - `orchestrator_input.planning_mode='plan_only'`
  - `orchestrator_input.module_execution_allowed=false`
  - `orchestrator_input.response_generation_allowed=false`
  - `orchestrator_input.domain_writes_allowed=false`
- No forbidden keys in payload

**Coverage:** 50 handoff envelopes; ~33 wrapped, ~17 flat

---

### Family 8: node_result_formatter (50 tests)
**Purpose:** Validate OR_Return_Error envelope shape across 3 error codes  
**Vectors (3 codes, ~17 repeats each):**
- Cycles through codes: `INVALID_HANDOFF_INPUT`, `NOT_READY_FOR_PLANNING`, `CONTEXT_MISMATCH`
- Builds error payload with test code, message, and deterministic field names
- Asserts:
  - `status_kind='failed'`, `result_type='error'`, `module_name='orchestrator_input_handoff'`
  - `error.code` matches input
  - `error.missing_fields` is set correctly (empty or populated)
  - No `payload` key in error envelope

**Coverage:** 50 error envelopes; ~17 each of 3 codes

---

### Family 9: sql_contract_validation (50 tests)
**Purpose:** Verify SQL files are read-only and follow parameterized-binding policy  
**Vectors (6 SQL files, ~8 repeats each):**
- Loads each SQL file from disk
- Asserts file is non-empty
- Rejects all forbidden write patterns (INSERT/UPDATE/DELETE on tasks, reminders, memory_items, rag_memories, messages, execution_contexts)
- **File-specific rules:**
  - `02_load_execution_context.sql`: must contain `$1` and `tenant_id`
  - `03_load_execution_context_by_idempotency.sql`: must contain `$1` and `idempotency_key`
  - `10_fixtures_create.sql`: must reference `execution_contexts_claude_mcp` table
  - `11_fixtures_cleanup.sql`: must reference `execution_contexts_claude_mcp` table
  - `20_read_path_probe.sql`: must contain `planning_allowed` field reference
  - `01_schema_inspect.sql`: must query `information_schema`

**Coverage:** 50 SQL contract validations; ~8 per file

---

### Family 10: reporting_and_tooling_contract (50 tests)
**Purpose:** Validate STATE.json and integration with closure/build/audit reports  
**Vectors:**
- Loads `STATE__WF-OR-01.json` from disk
- Asserts `current_stage='WF-OR-01'`
- Asserts `script_level_tests.tests_total >= 500` (650 on disk)
- Asserts `advance_allowed=false` (pre-live status)
- Asserts `phase` is one of:
  - `'source_pack_ready_waiting_for_live_proof'`
  - `'active_with_next_action'`
  - `'blocked_with_evidence'`
- Loads BUILD_REPORT, AUDIT_REPORT, CLOSURE_REPORT from disk
- Asserts BUILD and AUDIT contain 'WF-OR-01' references
- Asserts CLOSURE_REPORT does NOT claim "CLOSED at 10/10" (honest pre-closure posture)
- Asserts ROUTE_MAP shows WF-OR-01 ACTIVE and WF-PL-01 PLANNED_NEXT

**Coverage:** 50 state/reporting validations; all introspect same files

**Known Gap:** Closure/build/audit reports are on disk but **not present in evidence** (empty reports/ folder). Tests can only load BUILD_REPORT.md, AUDIT_REPORT.md, CLOSURE_REPORT.md if they exist; test will fail if missing.

---

### Family 11: extract_handoff_input (50 tests)
**Supplementary purpose:** Validate OR_Extract_Handoff_Input field normalization  
**Vectors:**
- Validates wrapped case
- Extracts handoff input
- Asserts all UUID fields preserved exactly
- Asserts `expected_status='initialized'`
- Asserts `ttl_seconds=900`
- Asserts `idempotency_key` starts with `'wf_or_01_case_'` (deterministic from case index)
- Asserts `source_module='execution_context_init'`

**Coverage:** 50 extraction operations (wrapped only)

---

### Family 12: error_payload_builder (50 tests)
**Supplementary purpose:** Validate OR_Return_Error envelope defaults and corner cases  
**Vectors:**
- Build error with `None` missing_fields → asserts defaults to `[]`
- Build error with supplied fields → asserts fields preserved exactly
- Both cases assert `status_kind='failed'`, `result_type='error'`, `module_name='orchestrator_input_handoff'`
- Asserts codes are set correctly: `INVALID_HANDOFF_INPUT`, `NOT_READY_FOR_PLANNING`

**Coverage:** 50 error-builder calls; ~25 with None, ~25 with fields

---

### Family 13: blueprint_structure (50 tests)
**Supplementary purpose:** Validate WF-OR-01 workflow blueprint JSON schema and node inventory  
**Vectors:**
- Loads `WF-OR-01_Orchestrator_Input_Handoff.json`
- Asserts `blueprint['name']='WF-OR-01'`
- Asserts all 10 required nodes are present by name:
  - `When clicking 'Execute workflow'`
  - `When chat message received`
  - `OR_Validate_EC_Result`
  - `OR_Route_Valid`
  - `OR_Extract_Handoff_Input`
  - `OR_Load_Execution_Context`
  - `OR_Verify_Context_Match`
  - `OR_Build_Handoff_Payload`
  - `OR_Return_Result`
  - `OR_Return_Error`
- Asserts node count >= 10
- Asserts `connections` key is present in blueprint
- Asserts connection JSON contains expected node names

**Coverage:** 50 blueprint introspections (all inspect same blueprint file)

---

## Test Execution Modes

### Script-Level Only
- All 650 tests run in Python `unittest` without touching live n8n engine
- No live database required (strict_db_check can be false for pre-DB tests)
- All contracts are exercised on pure Python implementations of or_logic module

### No Live Proof
- These tests provide **zero proof of live n8n execution**
- Blueprint structure tests verify JSON shape but not node behavior
- SQL tests verify file content but not execution on live Postgres
- Live proof is tracked separately by stage reports (currently **absent**)

---

## Coverage Summary

| Family | Tests | Key Assertion | Status |
|--------|-------|---------------|--------|
| input_validation | 50 | Wrapped shape accepted | ✓ |
| happy_path | 50 | End-to-end success | ✓ |
| invalid_input | 50 | Rejection on 10 failure modes | ✓ |
| replay_idempotency | 50 | Deterministic output | ✓ |
| cross_tenant_isolation | 50 | Mismatch rejection | ✓ |
| ec_to_or_handoff | 50 | Dual-shape normalization | ✓ |
| node_payload_builder | 50 | Success envelope structure | ✓ |
| node_result_formatter | 50 | Error envelope structure | ✓ |
| sql_contract_validation | 50 | Read-only, parameterized | ✓ |
| reporting_and_tooling_contract | 50 | STATE + reports present | ⚠ Gap: reports not on disk |
| extract_handoff_input | 50 | Field normalization | ✓ |
| error_payload_builder | 50 | Error defaults | ✓ |
| blueprint_structure | 50 | Node/connection schema | ✓ |
| **TOTAL** | **650** | — | **Mostly ✓** |

---

## Not Documented in On-Disk Evidence

- **No closure/audit/build reports:** `reports/` folder is empty. Families 10 attempt to load BUILD_REPORT.md, AUDIT_REPORT.md, CLOSURE_REPORT.md but these are not present on disk.
- **No live execution results:** `tests/results/` folder contains metadata but no actual execution logs from live n8n runs.
- **No performance benchmarks:** Script-level tests do not measure latency or memory consumption.
- **No error recovery tests:** Families do not cover retry logic, timeout handling, or partial failure recovery.
- **No stress tests:** No tests with large batch sizes or high concurrency.
- **No integration tests with actual WF-EC-01 output:** Tests use synthetic fixtures, not real EC stage output.

---

## Oracle types per family

| Family | Oracle type(s) | Authoritative observation |
|---|---|---|
| input_validation | Exact error code match | `error.code ∈ CANONICAL_ERROR_CODES` with enumerated `missing_fields` |
| happy_path | Exact output match + downstream handoff assertion | Success envelope shape; `allowed_next_stage == "WF-PL-01"`; planner-ready fields populated |
| invalid_input | Exact error code match | Per-failure-mode error code; fail-closed routing through `OR_Return_Error` |
| replay_idempotency | Exact output match | Identical envelope bytes on same `idempotency_key` across two runs |
| cross_tenant_isolation | Routing invariant | Mismatched tenant/thread → context error path; no leakage of foreign rows |
| ec_to_or_handoff | Schema match | Dual-shape normalization (wrapped vs flat); forbidden-key enforcement |
| node_payload_builder | Schema match | Success envelope structure per or_logic builder |
| node_result_formatter | Exact error code match | Error envelope across all canonical codes |
| sql_contract_validation | DB side-effect assertion (static) | Read-only; all Postgres nodes carry `queryReplacement`; zero write statements in sql/ |
| reporting_and_tooling_contract | Schema match (⚠ gap) | STATE.json shape; BUILD/AUDIT/CLOSURE not on disk — flagged |
| extract_handoff_input | Schema match | Field normalization of inputs |
| error_payload_builder | Exact output match | Error default fields populated |
| blueprint_structure | Schema match | Node count, connection count, trigger types match canonical JSON |

Note: WF-OR-01 is pre-live; no V1–V6 live proof vectors exist yet. All oracle types above are derived from `test_families.py` + `or_logic.py` static evidence. Live-pass oracle types will be recorded when the workflow is imported and executed against the V1–V6 vector harness.
