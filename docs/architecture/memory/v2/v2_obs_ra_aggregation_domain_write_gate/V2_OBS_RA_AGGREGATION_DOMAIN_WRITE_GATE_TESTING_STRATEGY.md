# Testing Strategy — V2-OBS-RA-AGGREGATION-DOMAIN-WRITE-GATE

Derived from `04_V2_OBS_RA_AGGREGATION_DOMAIN_WRITE_GATE_TESTING_STRATEGY.md`. Bound to the chosen fix in `V2_OBS_RA_AGGREGATION_DOMAIN_WRITE_GATE_DESIGN_FREEZE.md`.

## Objective
Prove that the aggregation-lane domain-write gate is fixed (writeful ME→RA happy-path no longer rejected) without weakening fail-closed behavior or regressing non-writeful flows.

## Totals
- Local tests: 50 (10 families × 5)
- E2E tests: 50 (10 families × 5)
- Total: 100

## Oracle machinery

Two oracle layers:

1. **Local oracle** — an off-node harness (`artifacts/local_runner.mjs`) that loads the exact `jsCode` text of `ME_Build_RA_Envelope` (post-patch) into a Node `vm` context, synthesizes the `$json`/`$()` helpers that the node expects, and runs the code against synthetic `src` inputs. For each local test case, the oracle asserts the emitted envelope matches expected `aggregation_input` / top-level fields (shape, key set, key values). The oracle also runs the `ra_logic.validate_aggregation_envelope` Python reference equivalent implemented in JavaScript (`artifacts/ra_logic_js.mjs` — line-for-line port of the relevant guard clauses) against the emitted envelope to confirm the RA gate verdict.
2. **E2E oracle** — each E2E case triggers the live WF-ME-01 via `mcp__n8n__execute_workflow`, captures the execution via `mcp__n8n__get_execution`, probes the execution data for module_result + aggregation outcome, and persists a verdict JSON under `artifacts/runtime/`. Happy-path verdict asserts: execution finished `success`, aggregated_result envelope emitted, RA gate NOT fired. Control verdict asserts: pre-existing behavior preserved.

## Mapping of local tests to fix guarantees

| Family | Count | Fix guarantee under test |
|---|---|---|
| L1 input shape preservation | 5 | envelope retains status_kind/result_type/ids/aggregation_input keys |
| L2 aggregation guard semantics | 5 | RA gate accepts envelope when domain_writes_performed now normalized; other guards unchanged |
| L3 promote happy-path batch behavior | 5 | writeful promote → envelope with domain_writes_performed=false |
| L4 supersede happy-path batch behavior | 5 | writeful supersede → envelope with domain_writes_performed=false |
| L5 deny-path preservation | 5 | module-level denial (acceptance_criteria_not_met, SUPERSEDE_TARGET_INVALID) — envelope contains the failure module_result with status=success (module-level envelope) wrapped; gate behavior unchanged |
| L6 read-only path preservation | 5 | search/recall produce envelopes with domain_writes_performed=false pre and post fix — no regression |
| L7 module_error / failed-result path preservation | 5 | module_error path still hardcodes domain_writes_performed=false — unchanged |
| L8 downstream envelope invariants | 5 | emitted envelope preserves module_results[0] payload fields byte-for-byte |
| L9 replay / idempotent consistency | 5 | identical src → identical envelope (determinism) |
| L10 mixed-status / partial rollup behavior | 5 | envelope carrying writeful success alongside readonly or failed siblings still passes RA gate |

## Mapping of E2E tests to fix guarantees

| Family | Count | Fix guarantee under test |
|---|---|---|
| E1 promote happy-path current-truth reruns | 5 | live execute_workflow → n8n status=success + aggregated_result envelope |
| E2 supersede happy-path current-truth reruns | 5 | live execute_workflow → n8n status=success + aggregated_result envelope |
| E3 promote deny controls | 5 | live execute_workflow → module_result.status=success-but-denied; n8n status consistent with pre-fix baseline |
| E4 supersede invalid controls | 5 | live execute_workflow → module_result.status=success-but-SUPERSEDE_TARGET_INVALID; n8n status consistent |
| E5 read-only ME→RA flows | 5 | search/recall live → n8n status=success; RA gate never fires (already the case pre-fix) |
| E6 module_error flows | 5 | missing_fields / malformed input → module_error branch of ME_Build_RA_Envelope exercised; RA aggregates as failed batch (not INVALID_AGGREGATION_INPUT) |
| E7 mixed / partial aggregation scenarios | 5 | no regression on mixed batches (simulated via execute_workflow idempotency windows or multi-step harness) |
| E8 rerun / replay / idempotency scenarios | 5 | re-execute same idempotent input → consistent n8n status + aggregated_result |
| E9 upstream/downstream integration checks | 5 | envelope carries echoed execution_context_id/thread_id/tenant_id; RA output envelope preserved |
| E10 post-fix regression pack | 5 | V2-014 primary proof (f31-promote-012), F5 smoke 7-case, F3.1 supersede sample, F4 denial sample, F2 embed sample |

## Pass criteria
- All 50 local tests defined and executed; ≥48/50 PASS; any failure bucketed per blocker/dispatch protocol.
- All 50 E2E tests defined and executed; ≥48/50 PASS; all primary writeful happy-paths (E1, E2, any store_memory in E-family) must PASS.
- All control tests (E3..E6) must behave as pre-fix baseline.
- All regression tests (E10) must PASS.

## Out-of-scope for this mission (not weakened by the fix, simply not re-tested here)
- WF-RA-01's full 650-test off-node suite remains frozen as precedent. Not re-run under this mission.
- WF-SU-01 / WF-RC-01 / WF-MO-01 integration (not currently on critical path for the memory module).
- Semantic retrieval coverage (requires store-path embedding producer, which is out of scope).
