# Design Freeze — V2-OBS-RA-AGGREGATION-DOMAIN-WRITE-GATE

Frozen: 2026-04-22. No changes to this document after freeze without a logged DIVERGENCE.

## Observed evidence

1. Live WF-ME-01 is at versionId `279a8628-5df6-4b38-86b0-8cc51989629b` (verified via `mcp__n8n__verify_workflow` this session; `nodeCount=45`, `connectionCount=63`, `active=true`, `updatedAt=2026-04-22T15:24:08.723Z`). `ME_Build_RA_Envelope` exists and is `n8n-nodes-base.code`.
2. `ME_Build_RA_Envelope.parameters.jsCode` (v1.1 / B11-RA) success branch emits:
   ```
   aggregation_input: {
     aggregation_allowed: true,
     response_generation_allowed: false,
     module_execution_completed: true,
     domain_writes_performed: !!src.domain_writes_performed,  // <— propagates true for writeful modules
     module_results: [mr],
     expected_step_ids: [mr.step_id]
   }
   ```
3. `WF-RA-01` (`5RcNLtxNjAHJsZPE`) entry validator `ra_logic.validate_aggregation_envelope` lines 74–81 enforces four guard flags; line 80 specifically rejects `domain_writes_performed=true` with `INVALID_AGGREGATION_INPUT` and message `"Aggregation stage must start from a no-write batch envelope."`.
4. F3.1 Stage C produced 14 writeful-success supersede executions (e.g. exec 3705 — `module_result_outer.domain_writes_performed: true`, n8n-level INVALID_AGGREGATION_INPUT fired post-module) captured under `docs/architecture/memory/v2/f3_1/artifacts/runtime/exec_f31-supersede-001..25.raw.json`. Same observation logged as `F31-FIX-010` (observation, not a fix).
5. V2-014 primary proof `f31-promote-012` exec 3881 confirmed the same gate fires on writeful promote happy-path: `module_result.status=success`, DB post-state `tier=long_term`, `ra_status=INVALID_AGGREGATION_INPUT` at `ME_Dispatch_To_RA_01_SUBCALL` (subexec 3882). Recorded in `docs/architecture/memory/v2/v2_014/V2_014_FINAL_STATUS.md §Out-of-scope observations` and in `exec_f31-promote-012_3881.raw.json`.
6. `ME_Build_RA_Envelope` already normalizes `domain_writes_performed: false` in the module_error branch (the B11-RA v1.1 precedent). Comment at node top: *"wrap module_error envelopes into a canonical failed module_batch so that RA-01 aggregates instead of rejecting with INVALID_AGGREGATION_INPUT"*.
7. `WF-RA-01` success-path output (`ra_logic.aggregate_module_results` line 203) hardcodes `domain_writes_performed: False` on its emission — i.e., whatever input value is received, the downstream envelope always says the aggregation stage performed no writes.
8. Downstream consumer `WF-SU-01` depends on RA's output, not RA's input. RA's output flag is already constant (false), so downstream does not rely on the upstream input carrying historical write information.
9. Canonical write audit for a module execution lives in `module_result.actions_executed` (aggregated by RA into `aggregated_result.actions_executed`). The `aggregation_input.domain_writes_performed` flag is therefore redundant as an audit artifact — it is a gate signal only.

## Root cause

The `aggregation_input.domain_writes_performed` gate at RA is a **read-only posture gate for the aggregation stage itself** (intent: aggregation must not write to domain tables). It has been implemented as a literal check on the upstream input flag. When the upstream is a writeful memory module (`promote_memory`, `supersede_memory`, `store_memory`), the upstream flag is `true`, and the gate rejects the envelope at RA entry even though:

- the business outcome at ME is already committed and correct (DB writes succeeded),
- RA's own output always hardcodes `domain_writes_performed: false`,
- downstream SU consumes RA's output, not RA's input, so no information is lost.

The mismatch is **semantic**: the flag in the envelope is interpreted by RA as "did the stage downstream of the flag perform writes?", whereas ME v1.1 emits it as "did my module perform writes upstream?". Both readings are plausible from the raw name. The B11-RA v1.1 fix (module_error branch hardcodes `domain_writes_performed: false`) already established that ME normalizes the flag before handoff for the aggregation entrypoint. The v1.1 normalization was applied only to the module_error branch; the success branch was left propagating the upstream value. This mission extends the same normalization to the success branch.

This is the same issue recorded in `F31_FIX_LOG.md §F31-FIX-010` and carried as follow-up `V2-OBS-RA-AGGREGATION-DOMAIN-WRITE-GATE` through F3.1 Stage C and V2-014 closures.

## Candidate fixes considered

### Candidate A — Upstream normalization in `ME_Build_RA_Envelope` success branch
Change one field in the success branch of `ME_Build_RA_Envelope.parameters.jsCode`:
- before: `domain_writes_performed: !!src.domain_writes_performed,`
- after: `domain_writes_performed: false,`

Blast radius: 1 node, 1 field. Contract impact: none (no contract spec changes). Regression risk: near-zero — deny/read-only/malformed/module_error paths unchanged. Fit with project direction: matches the B11-RA v1.1 pattern already live in the same node for the module_error branch; preserves the full ra_logic fail-closed surface for every non-target violation.

### Candidate B — Downstream acceptance in `ra_logic.validate_aggregation_envelope`
Drop or relax the `domain_writes_performed` gate at line 80 of `ra_logic.py` so that writeful envelopes are accepted.

Blast radius: WF-RA-01 contract + `ra_logic.py` + RA workflow JSON + WF-RA-01 test suite (650 tests) + contract docs (`WF-RA-01_CONTRACTS.md`, `WF-RA-01_DOWNSTREAM_HANDOFF.md`, `10_STAGE_WF-RA-01.md`) + `FINAL_STAGE_POSTURE` + audit trail. Contract impact: high — canonical error semantics modified. Regression risk: medium — WF-RA-01 tests family `guard_flag_enforcement` asserts specifically that this flag's violation fails-closed; relaxing the gate would require coordinated version bump per `WF-RA-01_DOWNSTREAM_HANDOFF §Version compatibility`. Fit: clashes with frozen closure posture `wf-ra-01-source-pack-v1.0-live-closed`.

### Candidate C — Two-surface fix
Add a new flag (e.g. `upstream_domain_writes_performed`) that preserves audit, and relax the gate to use it. Drop the old flag's gate check.

Blast radius: both surfaces + producer contract + consumer contract + any test harness referring to the field name. Contract impact: highest. Regression risk: medium. Fit: gratuitous — no downstream consumer has been shown to depend on the upstream write-history signal (SU consumes RA's output, not RA's input). The gate is purely a posture check, not an audit signal.

## Chosen fix

**Candidate A.**

## Why this is the smallest canonical fix

- A single node, a single field, in the same builder that already normalizes this flag on the module_error branch (v1.1 precedent).
- Zero changes to `WF-RA-01` workflow, `ra_logic.py`, RA contract docs, RA test suite, RA closure artefacts.
- Zero changes to `WF-SU-01`, `WF-DI-01`, `WF-PL-01`, or any other workflow.
- Zero changes to Architecture Spec, Migration Plan, Module Registry, Module Spec, Memory Model, n8n Workflow Mapping, brain_contract.json.
- Preserves every other RA guard: `aggregation_allowed`, `response_generation_allowed`, `module_execution_completed`, step coverage, duplicate step_ids, context match, tenant match, missing required fields, malformed result shape, invalid status values.
- Preserves every other ME envelope invariant: `status_kind=success`, `result_type=module_batch`, `execution_context_id`, `thread_id`, `tenant_id`, `module_results`, `expected_step_ids`.
- Preserves the B11-RA v1.1 normalization pattern already in the module_error branch.
- Audit of upstream writes remains intact via `module_results[*].actions_executed`, which is the canonical write audit trail (RA aggregates these into `aggregated_result.actions_executed`).
- Consistent with RA's own output convention, which hardcodes `domain_writes_performed: false` regardless of input (`ra_logic.aggregate_module_results` line 203).

## Blast radius

| Surface | Before | After | Risk |
|---|---|---|---|
| `ME_Build_RA_Envelope.parameters.jsCode` (success branch) | `domain_writes_performed: !!src.domain_writes_performed,` | `domain_writes_performed: false,` | low — one bool literal, same field, same position |
| Everything else in `ME_Build_RA_Envelope` | unchanged | unchanged | zero |
| Other ME nodes | unchanged | unchanged | zero |
| WF-RA-01 workflow / `ra_logic.py` / contracts / tests | unchanged | unchanged | zero |
| WF-SU-01 / other workflows | unchanged | unchanged | zero |
| Brain contract / architecture specs | unchanged | unchanged | zero |

## Regression risks

1. **Audit signal loss on `aggregation_input.domain_writes_performed`:** mitigated — the authoritative audit trail is `module_results[*].actions_executed`; the envelope flag has always been a gate signal, not an audit artifact (RA output hardcodes `false` regardless of input).
2. **False accept of a malformed writeful batch:** mitigated — all other guards remain in place (module_execution_completed, aggregation_allowed, step coverage, duplicate step_ids, shape validation, context match).
3. **Regression of module_error branch:** zero — module_error branch is untouched (already hardcoded `false` in v1.1).
4. **Regression of read-only paths (search/recall):** zero — read-only module results already emit `domain_writes_performed=false` (or absent); `!!undefined === false`, and `false` in the new code is the same value.
5. **Regression of deny paths (promote-denied, supersede-invalid):** zero — module-level denial emits a non-writeful success envelope; the n8n-level n8n status already matches module-level semantics; the fix does not change those paths' n8n-level status.
6. **Regression of V2-014 accept-predicate:** zero — V2-014 is in `ME_Memory_Promote_DB.parameters.query`; this mission is in `ME_Build_RA_Envelope.parameters.jsCode`; orthogonal.
7. **Regression of F5 subjective guard:** zero — F5 is in store/supersede Prep nodes; this mission is in the envelope builder; orthogonal.

## Validation plan

### Proof sets
- **Primary writeful happy-path**: reruns of the F3.1 Stage C supersede happy-path cases (001, 003, 004, 005, 006, 008, 021, 022, 023, 024, 025 — the 14 success-path cases of the 25). Each must now produce n8n execution status `success` (instead of `failed`) with the canonical aggregated_result envelope emitted by RA_Return_Result.
- **Primary writeful promote happy-path**: rerun of `f31-promote-012` (primary V2-014 proof case) — must now produce n8n `success` at workflow level and `aggregated_result` at the ME→RA boundary.
- **Writeful store happy-path**: one canonical `store_memory` run must succeed end-to-end including the RA aggregation step.

### Control sets (must stay unchanged)
- Promote deny paths (acceptance_criteria_not_met / INVALID_PROMOTION_TARGET) must continue to produce module-level denial with n8n-level outcomes matching the prior baseline. The fix must not turn denial paths into accepted paths.
- Supersede invalid target (SUPERSEDE_TARGET_INVALID, old missing, already superseded) must continue to fail at module level and produce the same n8n-level outcomes.
- Search / recall read-only paths must remain green at the module-level and at the RA aggregation level (already the case pre-fix).
- Module_error paths (missing_fields, malformed envelope) must continue to route through the module_error branch of `ME_Build_RA_Envelope` and emit `domain_writes_performed=false` exactly as today.
- WF-RA-01's other gates (duplicate step_ids, missing expected steps, invalid status, context mismatch, tenant mismatch) must continue to fail-closed.
- Mixed / partial / all-failed / no_action rollups must continue to produce correct `rollup_status`.
- Replay / idempotency must stay deterministic — same input envelope produces same aggregated_result envelope.

### Evidence captures required
- Pre-apply: `verify_workflow` allPass, node snapshot of `ME_Build_RA_Envelope`.
- Apply: operator-run CLI stdout captured to `artifacts/runtime/operator_apply_stdout.txt`.
- Post-apply: `verify_workflow` allPass with updated jsCode assertion, node snapshot post, diff-surface verification (single-field diff).
- Local tests: 50 test cases split into 10 families (L1..L10), each with raw oracle results.
- E2E tests: 50 test cases split into 10 families (E1..E10), each with raw execution IDs and verdict JSON under `artifacts/runtime/`.
