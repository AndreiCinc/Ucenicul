# Execution Plan — V2-OBS-RA-AGGREGATION-DOMAIN-WRITE-GATE

Derived from `03_V2_OBS_RA_AGGREGATION_DOMAIN_WRITE_GATE_EXECUTION_RUNBOOK.md`. Plan is bound to the chosen fix in `V2_OBS_RA_AGGREGATION_DOMAIN_WRITE_GATE_DESIGN_FREEZE.md` (Candidate A — single-field normalization in `ME_Build_RA_Envelope.parameters.jsCode` success branch).

## Phase 0 — Truth anchoring (DONE)
- Active frontier before this mission: NONE (confirmed from `CURRENT_TRUTH_POST_F5.md`, `MEMORY_V2_STATE.md`, `SESSION_HANDOFF_NEXT.md`, `MEMORY_V2_DECISION_LEDGER.md`, `V2_014_FINAL_STATUS.md`).
- Live WF-ME-01 versionId: `279a8628-5df6-4b38-86b0-8cc51989629b` (verify_workflow).
- V2-014 and F3.1 Stage C both CLOSED SUCCESS; F6 not opened; Path 5 retired; operator-run CLI canonical.

## Phase 1 — Problem reconstruction (DONE)
- Evidence collected. Root cause documented in design freeze.
- Node of interest: `ME_Build_RA_Envelope.parameters.jsCode` (current v1.1 B11-RA).
- Downstream surface observed: `WF-RA-01` entry validator `ra_logic.validate_aggregation_envelope` line 80.

## Phase 2 — Design freeze (DONE)
- See `V2_OBS_RA_AGGREGATION_DOMAIN_WRITE_GATE_DESIGN_FREEZE.md`.
- Chosen fix: Candidate A. Frozen.

## Phase 3 — Test design (active step)
- 50 local tests defined in `V2_OBS_RA_AGGREGATION_DOMAIN_WRITE_GATE_LOCAL_TEST_MATRIX.md` across 10 families (L1..L10 × 5 each).
- 50 E2E tests defined in `V2_OBS_RA_AGGREGATION_DOMAIN_WRITE_GATE_E2E_TEST_MATRIX.md` across 10 families (E1..E10 × 5 each).
- Mandatory proof tests for closure:
  - L1 / L2 / L3 / L4 — must pass for the happy-path proof.
  - L5 / L6 / L7 — must pass for the fail-closed preservation proof.
  - E1 / E2 — must pass for the live writeful happy-path proof.
  - E3 / E4 / E5 / E6 — must pass for control preservation proof.

## Phase 4 — Patch artifact build
1. Build deterministic patch builder `artifacts/build_patch_v2_obs_ra_aggregation_domain_write_gate.mjs` that:
   - embeds the exact target `jsCode` text (v1.2).
   - runs `REQUIRED`/`FORBIDDEN` token guards.
   - emits `artifacts/patchV2_OBS_RA_AGGREGATION_DOMAIN_WRITE_GATE_params.json` as `{ "jsCode": "<text>" }`.
   - prints a unified-diff hint (old → new).
2. Derive baseline `jsCode` text from the pre-apply snapshot of `ME_Build_RA_Envelope` (captured via `mcp__n8n__get_workflow` and saved under `artifacts/pre/get_workflow_pre.json`).
3. Run the builder. Record sha256 of the params file.
4. Derive the apply command in `V2_OBS_RA_AGGREGATION_DOMAIN_WRITE_GATE_APPLY_COMMAND.md`.

## Phase 5 — Apply
1. Apply via canonical operator-run CLI protocol.
2. Channel: `node .claude/pipelines/ucenicul-pipeline/notes/tools/n8n-patch/n8n-patch.mjs patch-node uq26nh1grIpnHju0 ME_Build_RA_Envelope --params docs/architecture/memory/v2/v2_obs_ra_aggregation_domain_write_gate/artifacts/patchV2_OBS_RA_AGGREGATION_DOMAIN_WRITE_GATE_params.json` — followed by `verify_workflow` and diff-surface audit.
3. Precedent for in-session execution: V2-014 used the same channel via Bash; this mission follows the same discipline.
4. Capture stdout → `artifacts/runtime/operator_apply_stdout.txt`.
5. Capture post-state snapshot → `artifacts/post/get_workflow_post.json`.
6. Capture diff surface → `artifacts/runtime/diff_surface_verification.txt`.

## Phase 6 — Local test execution
1. Run 50 local tests (10 families × 5). Execute via a local harness (`artifacts/local_runner.mjs`) that constructs the envelope JS-code behavior in isolation, emits oracle verdicts and persists raw results under `artifacts/runtime/local_*.json`.
2. Reconcile family-level totals into `V2_OBS_RA_AGGREGATION_DOMAIN_WRITE_GATE_LOCAL_RESULTS.md`.

## Phase 7 — E2E test execution
1. Run 50 E2E tests (10 families × 5) through `execute_workflow` against live WF-ME-01 versionId `279a8628` (post-patch).
2. Prioritize order: E1 (promote happy) → E2 (supersede happy) → E3/E4 (deny/invalid controls) → E5/E6 (read-only / module_error) → E7/E8 (mixed/replay) → E9/E10 (integration / regression).
3. Persist raw execution JSON and oracle verdicts under `artifacts/runtime/exec_*.json`.
4. Reconcile results into `V2_OBS_RA_AGGREGATION_DOMAIN_WRITE_GATE_E2E_RESULTS.md`.

## Phase 8 — Reconciliation
1. Aggregate local totals (target 50/50, at least 48/50 PASS with any failure bucketed per `05_V2_OBS_RA_AGGREGATION_DOMAIN_WRITE_GATE_BLOCKER_AND_DISPATCH_PROTOCOL.md`).
2. Aggregate E2E totals (target 50/50).
3. If primary writeful proofs (E1/E2 + equivalent store) all PASS and controls remain green, declare verdict `SUCCESS`.
4. Otherwise `BLOCKED_WITH_EVIDENCE` with exact failure evidence.

## Phase 9 — Closeout + writeback
1. Write `V2_OBS_RA_AGGREGATION_DOMAIN_WRITE_GATE_FINAL_STATUS.md`.
2. Write `V2_OBS_RA_AGGREGATION_DOMAIN_WRITE_GATE_STATE.json`.
3. Write `V2_OBS_RA_AGGREGATION_DOMAIN_WRITE_GATE_CURRENT_STAGE.md`.
4. Update fix log, blocker register, dispatch log (empty if clean).
5. If mission closes SUCCESS: update pointer chain — `CURRENT_TRUTH_POST_F5.md`, `MEMORY_V2_STATE.md`, `SESSION_HANDOFF_NEXT.md`, `MEMORY_V2_DECISION_LEDGER.md` (new entry `V2-027` if needed).
6. Leave repo in an audit-ready state with next-step guidance.
