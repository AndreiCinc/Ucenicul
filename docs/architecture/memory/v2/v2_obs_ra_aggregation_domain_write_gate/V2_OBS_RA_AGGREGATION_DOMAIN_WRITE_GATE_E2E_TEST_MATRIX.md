# E2E Test Matrix — V2-OBS-RA-AGGREGATION-DOMAIN-WRITE-GATE

Bound to design freeze: Candidate A (`ME_Build_RA_Envelope.parameters.jsCode` success branch `domain_writes_performed: !!src.domain_writes_performed` → `domain_writes_performed: false`).

Live surface under test: `WF-ME-01 Module Execution` (`uq26nh1grIpnHju0`), post-patch versionId. All E2E cases triggered via `mcp__n8n__execute_workflow` against the live workflow, with verdicts persisted under `artifacts/runtime/exec_*.json`.

Totals: 10 families × 5 cases = 50 E2E tests.

---

## Family E1 — Promote happy-path current-truth reruns (5)

Fix guarantee under test: live execute_workflow → n8n status=success + `aggregated_result` envelope; RA gate does NOT fire INVALID_AGGREGATION_INPUT.

| ID | Module input | Expected n8n status | Expected RA verdict |
|---|---|---|---|
| E1.1 | `promote_memory` with valid candidate, thread_id=e1t1, tenant=e1tn (rerun of `f31-promote-012` seed) | success | gate_accepted; aggregated_result emitted |
| E1.2 | `promote_memory` with valid candidate, new thread, tenant=e1tn | success | gate_accepted |
| E1.3 | `promote_memory` with valid candidate, tenant=e1tn2 (tenant variation) | success | gate_accepted |
| E1.4 | `promote_memory` with valid candidate, secondary execution_context_id | success | gate_accepted |
| E1.5 | `promote_memory` with valid candidate, cold idempotency key | success | gate_accepted |

Evidence capture: `artifacts/runtime/exec_e1_<n>.raw.json` + `artifacts/runtime/verdict_e1_<n>.json`.

---

## Family E2 — Supersede happy-path current-truth reruns (5)

Fix guarantee under test: live execute_workflow → n8n status=success + `aggregated_result` envelope on writeful supersede.

| ID | Module input | Expected n8n status | Expected RA verdict |
|---|---|---|---|
| E2.1 | `supersede_memory` from F3.1 seed 001 (current-truth rerun) | success | gate_accepted |
| E2.2 | `supersede_memory` from F3.1 seed 003 | success | gate_accepted |
| E2.3 | `supersede_memory` from F3.1 seed 005 | success | gate_accepted |
| E2.4 | `supersede_memory` from F3.1 seed 021 | success | gate_accepted |
| E2.5 | `supersede_memory` from F3.1 seed 024 | success | gate_accepted |

Evidence capture: `artifacts/runtime/exec_e2_<n>.raw.json` + `artifacts/runtime/verdict_e2_<n>.json`.

---

## Family E3 — Promote deny controls (5)

Fix guarantee under test: deny paths unchanged by the fix. `module_result.status=success-but-denied` with sub_code in the canonical denial set; n8n status matches pre-fix baseline.

| ID | Module input | Expected module_result.status | Expected envelope domain_writes_performed |
|---|---|---|---|
| E3.1 | `promote_memory` — candidate not yet meeting acceptance criteria | success-but-denied (acceptance_criteria_not_met) | false (unchanged — module-level denial is non-writeful) |
| E3.2 | `promote_memory` — candidate under min confidence threshold | success-but-denied | false |
| E3.3 | `promote_memory` — invalid promotion target (already promoted) | success-but-denied (INVALID_PROMOTION_TARGET) | false |
| E3.4 | `promote_memory` — frozen candidate | success-but-denied | false |
| E3.5 | `promote_memory` — policy-blocked candidate | success-but-denied | false |

Evidence capture: `artifacts/runtime/exec_e3_<n>.raw.json` + `artifacts/runtime/verdict_e3_<n>.json`.

---

## Family E4 — Supersede invalid controls (5)

Fix guarantee under test: supersede invalid-target paths unchanged. `module_result.status=success-but-SUPERSEDE_TARGET_INVALID`; n8n status consistent.

| ID | Module input | Expected module_result.status | Expected envelope domain_writes_performed |
|---|---|---|---|
| E4.1 | `supersede_memory` — old id does not exist | success-but-SUPERSEDE_TARGET_INVALID | false |
| E4.2 | `supersede_memory` — old already superseded | success-but-SUPERSEDE_TARGET_INVALID | false |
| E4.3 | `supersede_memory` — target tenant mismatch | success-but-SUPERSEDE_TARGET_INVALID | false |
| E4.4 | `supersede_memory` — target archived | success-but-SUPERSEDE_TARGET_INVALID | false |
| E4.5 | `supersede_memory` — target tier mismatch | success-but-SUPERSEDE_TARGET_INVALID | false |

Evidence capture: `artifacts/runtime/exec_e4_<n>.raw.json` + `artifacts/runtime/verdict_e4_<n>.json`.

---

## Family E5 — Read-only ME→RA flows (5)

Fix guarantee under test: search/recall live → n8n status=success; RA gate never fires (already the case pre-fix, must stay green).

| ID | Module input | Expected n8n status | Expected RA verdict |
|---|---|---|---|
| E5.1 | `search_memory` with matching query | success | gate_accepted |
| E5.2 | `search_memory` with empty result set | success | gate_accepted |
| E5.3 | `recall_memory` targeting existing thread | success | gate_accepted |
| E5.4 | `recall_memory` targeting cold thread | success | gate_accepted |
| E5.5 | `recall_memory` with explicit tenant filter | success | gate_accepted |

Evidence capture: `artifacts/runtime/exec_e5_<n>.raw.json` + `artifacts/runtime/verdict_e5_<n>.json`.

---

## Family E6 — Module_error flows (5)

Fix guarantee under test: missing_fields / malformed input routes through the module_error branch of `ME_Build_RA_Envelope` (branch is untouched by fix). RA aggregates as failed batch (not INVALID_AGGREGATION_INPUT).

| ID | Module input | Expected ME branch | Expected RA verdict |
|---|---|---|---|
| E6.1 | `store_memory` with missing required field (content) | module_error | gate_accepted; rollup=failed |
| E6.2 | `promote_memory` with missing candidate_id | module_error | gate_accepted; rollup=failed |
| E6.3 | `supersede_memory` with malformed target ref | module_error | gate_accepted; rollup=failed |
| E6.4 | `search_memory` with schema-violating payload | module_error | gate_accepted; rollup=failed |
| E6.5 | `recall_memory` with invalid execution_context_id shape | module_error | gate_accepted; rollup=failed |

Evidence capture: `artifacts/runtime/exec_e6_<n>.raw.json` + `artifacts/runtime/verdict_e6_<n>.json`.

---

## Family E7 — Mixed / partial aggregation scenarios (5)

Fix guarantee under test: no regression on mixed batches (writeful + readonly + denied siblings rolled up together). Simulated via execute_workflow idempotency windows or multi-step harness.

| ID | Scenario | Expected rollup_status |
|---|---|---|
| E7.1 | promote success + recall success siblings | success |
| E7.2 | supersede success + search success siblings | success |
| E7.3 | promote success + promote denied siblings | partial |
| E7.4 | supersede success + supersede invalid siblings | partial |
| E7.5 | store success + module_error siblings | partial |

Evidence capture: `artifacts/runtime/exec_e7_<n>.raw.json` + `artifacts/runtime/verdict_e7_<n>.json`.

---

## Family E8 — Rerun / replay / idempotency scenarios (5)

Fix guarantee under test: re-executing the same idempotent input produces consistent n8n status and consistent `aggregated_result`.

| ID | Scenario | Expected consistency |
|---|---|---|
| E8.1 | Promote rerun #1 vs #2 with identical idempotency key | identical envelope, identical n8n status |
| E8.2 | Supersede rerun #1 vs #2 | identical envelope, identical n8n status |
| E8.3 | Search rerun #1 vs #2 | identical envelope, identical n8n status |
| E8.4 | Recall rerun #1 vs #2 | identical envelope, identical n8n status |
| E8.5 | Module_error rerun #1 vs #2 | identical envelope, identical n8n status |

Evidence capture: `artifacts/runtime/exec_e8_<n>.raw.json` + `artifacts/runtime/verdict_e8_<n>.json`.

---

## Family E9 — Upstream/downstream integration checks (5)

Fix guarantee under test: envelope carries echoed execution_context_id/thread_id/tenant_id through ME→RA; RA output envelope preserved and consumable by SU (sampled observation only — no SU re-run required).

| ID | Check | Expected |
|---|---|---|
| E9.1 | promote success → RA output echoes execution_context_id | matches upstream |
| E9.2 | supersede success → RA output echoes thread_id | matches upstream |
| E9.3 | search success → RA output echoes tenant_id | matches upstream |
| E9.4 | recall success → RA output preserves canonical fields | matches pre-fix baseline shape |
| E9.5 | module_error → RA output preserves rollup=failed envelope shape | matches pre-fix baseline |

Evidence capture: `artifacts/runtime/exec_e9_<n>.raw.json` + `artifacts/runtime/verdict_e9_<n>.json`.

---

## Family E10 — Post-fix regression pack (5)

Fix guarantee under test: prior closed proofs (V2-014, F5, F3.1 sample, F4 denial sample, F2 embed sample) continue to pass under the new jsCode.

| ID | Regression case | Source of truth |
|---|---|---|
| E10.1 | V2-014 primary proof — `f31-promote-012` rerun | `docs/architecture/memory/v2/v2_014/V2_014_FINAL_STATUS.md` |
| E10.2 | F5 smoke case — single representative of the 7-case set | `docs/architecture/memory/v2/stabilization/CURRENT_TRUTH_POST_F5.md` |
| E10.3 | F3.1 Stage C supersede sample — seed 001 | `docs/architecture/memory/v2/f3_1/F31_STAGE_C_FINAL_RESULTS.md` |
| E10.4 | F4 denial sample — one acceptance_criteria_not_met case | F4 closure artefacts |
| E10.5 | F2 embed sample — one read-only embedding path case | F2 closure artefacts |

Evidence capture: `artifacts/runtime/exec_e10_<n>.raw.json` + `artifacts/runtime/verdict_e10_<n>.json`.

---

## Verdict schema (per E2E case)

Each `verdict_e<n>_<m>.json` carries:

```json
{
  "case_id": "e1_1",
  "family": "E1",
  "execution_id": "<n8n execution id>",
  "n8n_status": "success|failed|error",
  "module_result_status": "success|success-but-denied|success-but-SUPERSEDE_TARGET_INVALID|module_error",
  "envelope_domain_writes_performed": false,
  "ra_gate_fired": false,
  "ra_gate_code": null,
  "rollup_status": "success|partial|failed",
  "expected_n8n_status": "success",
  "expected_ra_gate_fired": false,
  "verdict": "PASS|FAIL",
  "fail_reason": null
}
```

## Aggregation

Family totals → `V2_OBS_RA_AGGREGATION_DOMAIN_WRITE_GATE_E2E_RESULTS.md`.
