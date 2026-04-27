# WF-PL-01_TEST_MATRIX

## Required live proofs

- **V1** — shell integrity and happy path (valid OR handoff → valid plan)
- **V2** — invalid handoff input (shell-safe negative cases)
- **V3** — context mismatch fail-closed (missing execution context)
- **V4** — cross-tenant isolation fail-closed (wrong tenant)
- **V5** — insufficient planning context fail-closed (missing goal and actions)
- **V6** — DB drift verification (read-only contract)

---

## Test vector families

All families are enumerated in `workflows/tests/pl/test_families.py` lines 1–100+. Minimum required: 10 families × 50 tests = 500; supplied: **13 families × 50 tests = 650 total**.

### Family breakdown (from `test_families.py`)

| Family Name | Test Count | Purpose | Oracle Type |
|---|---|---|---|
| `input_validation` | 50 | Validate OR handoff envelope structure and required fields | Schema match + error code assertion |
| `happy_path` | 50 | Multi-action request from validated handoff to fully planned steps | Exact output match (step count, module_name, dispatcher_input flags) |
| `invalid_input` | 50 | Invalid handoff payloads (missing fields, wrong values) | Error code match + missing_fields array |
| `replay_idempotency` | 50 | Replay same `(execution_id, idempotency_key)` produces consistent plan_id | Exact plan_id match (no duplicates) |
| `cross_tenant_isolation` | 50 | Same execution_id under different tenant_id produces distinct plans | Schema match + distinct plan rows per tenant |
| `or_to_pl_handoff` | 50 | OR-01 output envelope passes through to plan generation | Routing invariant (allowed_next_stage=WF-DI-01) |
| `node_payload_builder` | 50 | `PL_Build_Planner_Input` state resolution with explicit `$('NodeName').first()` lookups | State match (verify._verified, planner_context fields) |
| `node_result_formatter` | 50 | `PL_Return_Result` and `PL_Return_Error` envelope structure | Schema match + exact field assertions |
| `sql_contract_validation` | 50 | DB read paths via `02_load_execution_context.sql`, `03_load_execution_context_by_idempotency.sql` | Row match + row count (expect 0 or 1) |
| `reporting_and_tooling_contract` | 50 | Closure report fields (live_runtime_proof, artifact_on_disk) | Artifact existence + path match |
| `extract_planning_input` | 50 | `PL_Extract_Planning_Input` node normalizes execution lookup keys | Field type match + non-empty assertion |
| `error_payload_builder` | 50 | `build_error_payload()` produces canonical error envelopes | Error code match + missing_fields array |
| `blueprint_structure` | 50 | Node count (13), connection count (13), trigger count (2), switch routing strings | Exact count match |

---

## Live closure posture

The supplied closure evidence marks **V1, V4, V5, V6** as passed on the `wf-pl-01-source-pack-v1.1-live-fix` shell (workflow id `RwToPLa1ErHl2tUi`, versionId `0493521e-0820-4b63-b7e1-041f44b49a31`):

| Vector | Exec ID | Outcome | Oracle Evidence |
|---|---|---|---|
| **V1** — happy path | 712 | **PASS** | `status_kind=success`, `result_type=plan`, `allowed_next_stage=WF-DI-01`, dispatcher_input guard flags all present and correct (dispatch_allowed=true, module_execution_started=false, response_generation_allowed=false, domain_writes_performed=false); plan contains 2 steps (create_task, create_reminder) |
| **V1** — first run (partial envelope) | 711 | **CORRECTLY_REJECTED** | `status_kind=failed`, `error.code=INVALID_HANDOFF_INPUT` (missing top-level status_kind/result_type in initial payload); contract-correct, not a defect |
| **V3** — invalid handoff | 708 (Cycle 2) | **PASS** | `error.code=INVALID_HANDOFF_INPUT`, `missing_fields=['payload.planning_allowed']` |
| **V4** — context mismatch (missing execution context) | 713 | **PASS** | `error.code=CONTEXT_MISMATCH`, `missing_fields=['execution_context']`; non-existent execution_id ddddeeee-0000-0000-0000-000000000999 correctly escalated (previously masked as INSUFFICIENT_PLANNING_CONTEXT in v1.0) |
| **V5** — cross-tenant (wrong tenant) | 714 | **PASS** | `error.code=CONTEXT_MISMATCH`, `missing_fields=['execution_context']`; wrong tenant aaaaaa01-0000-0000-0000-000000000099 with valid execution_id produced zero SQL rows, correctly escalated (previously masked as INSUFFICIENT_PLANNING_CONTEXT in v1.0) |
| **V6** — DB drift | — | **PASS** | `public.execution_contexts`: pre-run row count = 2, post-run row count = 2; zero drift (WF-PL-01 is read-only) |

---

## Off-node heavy suite

**650 / 650 PASS** in `workflows/tests/pl/test_families.py` (13 families × 50 tests).

Breakdown:
- Required minimum: 10 families × 50 = 500 ✓
- Supplied: 13 families × 50 = 650 ✓
- All pass status: PASS ✓

---

## Script-level vs live-level alignment

After v1.1 fix (Cycle 3 closure):
- Script-level: 650 / 650 PASS
- Live-level: V1 (exec 712), V4 (exec 713), V5 (exec 714), V6 (DB drift) all PASS
- **Alignment**: script behavior and live behavior now agree. The Cycle-2 divergence (script threaded state through function args; n8n graph used `$input.all()` which only retrieves immediate upstream node) has been eliminated by explicit `$('NodeName').first()` lookups in `PL_Build_Planner_Input.jsCode`.

---

## Error code discrimination (key carry-forward pattern)

From closure report and audit: the v1.1 fix introduced fail-close-first discipline to preserve original error codes.

```
if verify._verified === 'false':
  emit CONTEXT_MISMATCH (from verify result)
else if goal is missing AND user_message_text is missing:
  emit INSUFFICIENT_PLANNING_CONTEXT
else if requested_actions is empty AND primary_intent unmappable:
  emit INSUFFICIENT_PLANNING_CONTEXT
```

This ensures that **upstream context failures are never masked by downstream planner_context failures**.

---

## Known limitations / Not documented in on-disk evidence

- WF-OR-01 intermediate test vectors (V2, V3 may rely on OR-01 fixtures) — fixture paths not yet enumerated in STATE__WF-PL-01.json. Assumed to be in `workflows/sql/or/` (not read by this report).
- Live shell credential binding details (which Postgres account is bound to PL_Load_Execution_Context) — confirmed in audit as "Postgres account 2" but exact credential id not documented in contracts.
- Exact module_name values accepted beyond the five documented in `MODULE_REGISTRY` (task_module, reminder_module, memory_module, improvement_module, watcher_module_basic) — not documented as open/closed enum.
