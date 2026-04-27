# WF-RA-01_CONTRACTS

Derived-from-evidence contract surface for WF-RA-01 Result Aggregator.

Sources (all on-disk, no fabrication):
- `workflow/WF-RA-01_Result_Aggregator_LIVE.json` (live workflow id `5RcNLtxNjAHJsZPE`)
- `docs/WF-RA-01_NODE_MAP.md` (14 nodes)
- `docs/WF-RA-01_CONNECTION_MAP.md` (14 edges)
- `docs/10_STAGE_WF-RA-01.md` (stage spec)
- `scripts/ra_logic.py` (canonical business logic, lines 1–206)
- `tests/test_families.py` (13 test families × 50 tests = 650 total)
- `reports/FINAL_STAGE_POSTURE__WF-RA-01.md` (closure posture 10/10)
- `reports/CLOSURE_REPORT__WF-RA-01.md`
- `docs/WF-RA-01_TEST_MATRIX.md` (live E2E evidence V1–V6)
- `sql/` (7 canonical SQL files)

---

## 1. Identity

- **Workflow code**: WF-RA-01
- **Role**: Result Aggregator — receives canonical `module_batch` envelopes containing one or more `module_result` objects; validates batch integrity and execution context alignment; computes canonical rollup status; returns one canonical `aggregated_result` or fail-closed error.
- **Version**: `wf-ra-01-source-pack-v1.0-live-closed`
- **Tier**: STANDARD
- **Upstream caller**: WF-DI-01 Dispatcher (via fan-in layer from WF-ME-01 Module Execution, or direct from ME_Input)
- **Downstream consumer**: WF-SU-01 State + DB + Memory Update (receives envelope at SU_Input)

---

## 2. Input contract (module batch envelope)

Required top-level fields on input payload (ref `ra_logic.validate_aggregation_envelope`, lines 34–134):

| Field | Type | Required value |
|---|---|---|
| `status_kind` | string | must equal `"success"` |
| `result_type` | string | must equal `"module_batch"` |
| `execution_context_id` | string | non-empty |
| `thread_id` | string | non-empty |
| `tenant_id` | string | non-empty |
| `aggregation_input` | object | see §2.a |
| `idempotency_key` | string | optional — defaults to `"aggregate:{execution_context_id}"` |

### 2.a `aggregation_input`

| Field | Type | Required state |
|---|---|---|
| `aggregation_allowed` | bool | must be `true` |
| `response_generation_allowed` | bool | must be `false` (fail-closed if true) |
| `module_execution_completed` | bool | must be `true` (fail-closed if false) |
| `domain_writes_performed` | bool | must be `false` (fail-closed if true) |
| `module_results` | array | see §2.b — non-empty list required |
| `expected_step_ids` | array | non-empty list required |

### 2.b `module_results` — each object MUST contain

| Field | Type | Required |
|---|---|---|
| `module_name` | string | yes |
| `step_id` | string | yes — duplicate step_ids cause `DUPLICATE_STEP_IDS` error |
| `result_type` | string | yes (typically `"execution"` or `"analysis"`) |
| `status` | string | yes — must be one of: `success`, `partial`, `failed`, `no_action` (line 16 `ra_logic.py`) |
| `summary` | string | yes |
| `actions_executed` | array | yes — may be empty |
| `artifacts` | array | yes — may be empty |
| `observations` | array | yes — may be empty |
| `proposals` | array | yes — may be empty |
| `confidence` | number | yes — 0.0–1.0 range |
| `needs_followup` | bool | yes |
| `followup_requests` | array | yes — may be empty or filled based on `needs_followup` |

### 2.c Guard flag validation (lines 74–81)

- `aggregation_allowed` MUST be `true` — fail-closed with code `INVALID_AGGREGATION_INPUT` if false.
- `response_generation_allowed` MUST be `false` — fail-closed if true (response composition belongs to WF-RC-01).
- `module_execution_completed` MUST be `true` — fail-closed if false.
- `domain_writes_performed` MUST be `false` — fail-closed if true (aggregation stage is read-only).

### 2.d Step coverage validation (lines 119–125)

All `expected_step_ids` MUST be present in `module_results` (identified by `step_id`). Missing steps trigger `MISSING_MODULE_RESULTS` error with `missing_fields` listing the absent step_ids.

---

## 3. Output contracts

### 3.a Success envelope (`aggregated_result`)

Returned by `RA_Return_Result`:

```
{
  "status_kind": "success",
  "result_type": "aggregated_result",
  "execution_context_id": ...,
  "thread_id": ...,
  "tenant_id": ...,
  "aggregated_result": {
    "status": "success" | "partial" | "failed" | "no_action",
    "summary": "...",
    "module_results_count": <int>,
    "module_names": [ ... ],
    "per_status_counts": {
      "success": <int>,
      "partial": <int>,
      "failed": <int>,
      "no_action": <int>
    },
    "actions_executed": [ ... ],
    "artifacts": [ ... ],
    "observations": [ ... ],
    "proposals": [ ... ],
    "confidence": <avg_confidence>,
    "needs_followup": <bool>,
    "followup_requests": [ ... ],
    "expected_step_ids": [ ... ],
    "returned_step_ids": [ ... ]
  },
  "state_update_allowed": true,
  "response_generation_allowed": false,
  "domain_writes_performed": false,
  "allowed_next_stage": "WF-SU-01"
}
```

Ref `ra_logic.aggregate_module_results()`, lines 152–205.

### 3.b Error envelope (`aggregation_error`)

Returned by `RA_Return_Error` or `RA_Return_Context_Error`:

```
{
  "status_kind": "error",
  "result_type": "aggregation_error",
  "error": {
    "code": <one of CANONICAL_ERROR_CODES>,
    "message": "...",
    "missing_fields": [ ... ],
    "details": { ... }
  }
}
```

Ref `ra_logic.canonical_error()`, lines 19–31.

`CANONICAL_ERROR_CODES` (ref `ra_logic.py`:7–13):
- `INVALID_AGGREGATION_INPUT` — guard flags violated, wrong result_type, wrong status_kind, or aggregation not allowed
- `MISSING_MODULE_RESULTS` — module_results list empty or not present, or expected steps missing
- `MISSING_REQUIRED_FIELDS` — top-level fields missing or module_result object(s) incomplete
- `DUPLICATE_STEP_IDS` — two or more module_results share the same step_id
- `CONTEXT_MISMATCH` — execution context lookup returns 0 rows, or tenant/thread mismatch in loaded context

Unknown codes are coerced to `INVALID_AGGREGATION_INPUT` per `canonical_error()` line 21.

---

## 4. Rollup semantics (lines 137–149)

Aggregation reduces N module results into 1 canonical rollup status per `rollup_status()`:

| Condition | Rollup status |
|---|---|
| All results have `status=success` | `success` |
| All results have `status=failed` | `failed` |
| All results have `status=no_action` | `no_action` |
| Any `failed` mixed with any other non-failed | `partial` |
| Any `partial` mixed with no `failed` | `partial` |
| Other combinations | `partial` |

Average confidence is computed as sum of all confidences divided by module_results count, rounded to 4 decimals (line 176).

---

## 5. Routing invariants

1. `state_update_allowed` MUST be `true` on success output (WF-SU-01 owns state mutation).
2. `response_generation_allowed` MUST be `false` on all outputs (response composition is WF-RC-01's responsibility).
3. `domain_writes_performed` MUST remain `false` on all outputs. WF-RA-01 never performs domain writes.
4. `allowed_next_stage` MUST be `"WF-SU-01"` on success (hard-coded, line 204).
5. Cross-tenant isolation (`RA_Verify_Context_Match`): loaded execution context row's `tenant_id` MUST match input envelope's `tenant_id`. Any mismatch → `CONTEXT_MISMATCH` error, routed to `RA_Return_Context_Error`.
6. Invalid batch at validation stage → `RA_Route_Valid` fallback to `RA_Return_Error`.
7. Context mismatch at verification stage → `RA_Route_Context_Ready` fallback to `RA_Return_Context_Error`.

---

## 6. DB interactions (ref `sql/`)

Read paths only (WF-RA-01 is read-only per closure spec):
- `02_load_execution_context.sql` — keyed lookup by `execution_context_id` and `tenant_id`
- `04_load_plan_context.sql` — optional plan metadata read (for optional cross-check)

Fixtures (for test harness):
- `10_fixtures_create.sql`, `11_fixtures_cleanup.sql`

Probes (for V6 DB drift verification):
- `20_read_path_probe.sql`

No write operations. Read-only posture held across all stages per closure evidence.

---

## 7. Known non-contract invariants (from closure)

- 650/650 off-node test harness green (13 families × 50 tests = 100% pass rate per `tests/test_families.py`).
- V1 shell integrity, V2 invalid aggregation input, V3 happy path (single + parallel), V4 malformed batch, V5 cross-tenant mismatch, V6 DB drift — all PASS per `docs/WF-RA-01_TEST_MATRIX.md` and FINAL_STAGE_POSTURE.
- Live E2E closure: executions 736 (V3 happy), 737 (V5 context mismatch), 738 (V4 malformed) all completed end-to-end through n8n shell with canonical outputs.
- Post-closure DB drift: 0 across 5 domain tables (execution_contexts, tasks, reminders, messages, rag_memories).

---

## 8. Versioning

- Contract surface locked at `wf-ra-01-source-pack-v1.0-live-closed`.
- Change control: any new error code or output field MUST update this file AND the test matrix AND the stage spec.
- Breaking change examples: adding a new CANONICAL_ERROR_CODE, changing rollup semantics, or altering `aggregated_result` shape requires coordinated version bump on both WF-ME-01 (upstream producer) and WF-SU-01 (downstream consumer).
