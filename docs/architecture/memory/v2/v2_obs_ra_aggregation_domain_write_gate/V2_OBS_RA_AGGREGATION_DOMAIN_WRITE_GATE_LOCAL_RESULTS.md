# Local Test Results — V2-OBS-RA-AGGREGATION-DOMAIN-WRITE-GATE

Harness: `artifacts/local_runner.mjs` (Node `vm` context, post-patch jsCode loaded from `artifacts/post/ME_Build_RA_Envelope_post.jsCode.txt`).
Oracle: `artifacts/ra_logic_js.mjs` (line-for-line JS port of `ra_logic.validate_aggregation_envelope` + `rollup_status`).
Raw per-case JSON: `artifacts/runtime/local_*.json`.
Aggregate: `artifacts/runtime/local_summary.json` + `.txt`.

## Totals

- Total: 50
- Pass: 50
- Fail: 0

| Family | Pass/Total |
|---|---|
| L1 input shape preservation | 5/5 |
| L2 aggregation guard semantics | 5/5 |
| L3 promote happy-path batch | 5/5 |
| L4 supersede happy-path batch | 5/5 |
| L5 deny-path preservation | 5/5 |
| L6 read-only path preservation | 5/5 |
| L7 module_error branch preservation | 5/5 |
| L8 downstream envelope invariants | 5/5 |
| L9 replay / idempotent consistency | 5/5 |
| L10 mixed-status / partial rollup | 5/5 |

## Proof of fix (L3/L4 primary)

All 10 writeful happy-path cases (L3.1–L3.5 promote, L4.1–L4.5 supersede) emit an envelope with `aggregation_input.domain_writes_performed === false` and are accepted by `ra_logic.validate_aggregation_envelope`. Pre-fix these would have been rejected with `INVALID_AGGREGATION_INPUT: "Aggregation stage must start from a no-write batch envelope."`.

## Proof of fail-closed preservation (L2)

L2.2–L2.5 mutate individual guard flags on an otherwise-good envelope and confirm `ra_logic` still rejects:

- L2.2 `aggregation_allowed=false` → rejected (INVALID_AGGREGATION_INPUT).
- L2.3 `response_generation_allowed=true` → rejected.
- L2.4 `module_execution_completed=false` → rejected.
- L2.5 step_id mismatched against expected_step_ids → rejected (MISSING_MODULE_RESULTS).

## Proof of non-target path preservation (L5–L7)

- L5 (denial): module-level denial still produces a canonical module_batch envelope with `domain_writes_performed=false`; accepted.
- L6 (read-only): search/recall paths still produce envelopes with `domain_writes_performed=false`; accepted.
- L7 (module_error): the error branch of ME_Build_RA_Envelope (untouched by the fix) still emits its canonical failed module_batch envelope with `domain_writes_performed=false`; accepted by RA as a failed batch.

## Proof of envelope invariants (L8)

`module_results[0]` payload fields (`actions_executed`, `artifacts`, `observations`, `proposals`, `confidence`, `needs_followup`, `followup_requests`) pass byte-for-byte from input `src.module_result` to the emitted envelope.

## Proof of determinism (L9)

Re-running the node against identical input on two consecutive invocations produces identical envelopes (JSON.stringify equality).

## Proof of rollup preservation (L10)

Simulated mixed batches (success + readonly / success + no_action / success + failed / success + partial / success + readonly + failed) still satisfy `ra_logic.validate_aggregation_envelope` and produce the expected `rollup_status` per `ra_logic.rollup_status` semantics.

## Pass criteria met

- ≥ 48/50 PASS: MET (50/50).
- L1/L2/L3/L4 (happy-path proof) all PASS: MET.
- L5/L6/L7 (fail-closed preservation) all PASS: MET.

Verdict: **SUCCESS (local)**.
