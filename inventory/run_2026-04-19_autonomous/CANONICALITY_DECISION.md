# CANONICALITY_DECISION

Run ID: `run_2026-04-19_autonomous`
Authority: `inventory/WORKFLOW_STANDARD_TEMPLATE_UCENICUL.md` §4 (lookup order) + §8 (classification).
Rule applied: pick exactly one canonical source per role per workflow. No silent truth merging.

## 1. WF-TR-01 Thread Resolver

| Role | Canonical source | Reason |
|---|---|---|
| Implementation | `workflow/WF-TR-01_Thread_Resolver.json` | Matches canonical filename pattern; only full JSON in workflow/. |
| Patch overlay | `workflow/patches/WF-TR-01_PATCHED_switch_fix.json` | Overlay. Base preserved. |
| Contract | `docs/contracts/ThreadResolutionContracts.md` | Only canonical contract candidate in this folder; content-equivalent to `docs/WF-TR-01_CONTRACTS.md`. Nested location accepted per §3 handoff-bundle rule by analogy. |
| Runtime proof | none on disk | STANDARD tier; no LIVE_EXECUTIONS file. Explicit gap in verdict. |
| Status | TBD | No STATE file present. STATE to be created conservatively (status=`populated_prelive`, posture=`unknown`). |

No dominance dispute.

## 2. WF-EC-01 Execution Context

| Role | Canonical source | Reason |
|---|---|---|
| Implementation | `workflow/WF-EC-01_Execution_Context.json` | Only JSON in workflow/. |
| Contract | `docs/WF-EC-01_CLOSURE_CONTRACT.md` (proxy) | Strongest on-disk contract candidate; content defines callable interface. Mark as canonical-by-proxy pending a strictly-named `WF-EC-01_CONTRACTS.md`. |
| Closure | `reports/CLOSURE_REPORT_WF-EC-01.md` | Sole closure report. |
| Fix log | `reports/FIX_LOG_WF-EC-01.md` | Sole fix log. |
| Status | TBD (seed from CLOSURE + POST_IMPORT_AUDIT) | No STATE on disk; create conservatively. |
| Topology view | `docs/WF-EC-01_NODE_MAP.md` + `docs/WF-EC-01_CONNECTION_MAP.md` | Supporting. Do not authoritatively read over JSON. |

## 3. WF-OR-01 Orchestrator

| Role | Canonical source | Reason |
|---|---|---|
| Implementation | `workflow/WF-OR-01_Orchestrator_Input_Handoff.json` | Larger (14 741 B) of the two full JSONs; the `_Orchestrator_Input_Handoff` suffix indicates the handoff-flow implementation specifically; aligns with the workflow's actual role (input handoff from TR → EC → OR). |
| Duplicate-full blueprint | `workflow/WF-OR-01_blueprint.json` | Classified as **stale / duplicate-canonical**. Per standard §5.3, this is a "bug" — a full-JSON blueprint must be replaced by a slim metadata summary OR moved to history. Decision: keep as `supporting` in this pass and record an explicit gap; do NOT delete or overwrite (no dominance proof beyond byte-count, and delete is gated). A future pass should either (a) regenerate a slim blueprint from the canonical JSON or (b) move this to `workflow/patches/<date>_pre_slim_blueprint.json` as historical provenance. |
| Contracts | missing | Record as explicit gap. Not fabricated. |
| Test matrix | missing | Record as explicit gap. |
| Status | scaffold | No STATE / no CLOSURE on disk. |

## 4. WF-PL-01 Plan Generation

| Role | Canonical source | Reason |
|---|---|---|
| Implementation | `workflow/WF-PL-01_Plan_Generation.json` | `reports/STATE__WF-PL-01.json` → `live_v1_1_patch.json_on_disk = "workflows/WF-PL-01_Plan_Generation.json"`; this is explicit live-verified dominance evidence. |
| Duplicate-full blueprint | `workflow/WF-PL-01_blueprint.json` | Classified **stale / duplicate-canonical**. Same rule as WF-OR-01 §3. |
| Closure | `reports/CLOSURE_REPORT__WF-PL-01.md` | Single closure report; matches STATE score 10/10. |
| Live runtime proof | `reports/STATE__WF-PL-01.json` — embedded `live_runtime_proof` block with execution_ids 711–714 (V1, V4, V5, V6 all PASS) | STATE doubles as live proof pack. No separate `LIVE_EXECUTIONS__WF-PL-01.md`; recorded as explicit gap (the proof exists, but its canonical location per standard §4.E would be a `LIVE_EXECUTIONS__` file). |
| Status | `closed` (from STATE) | Direct STATE evidence. The canonical `state/STATE__WF-PL-01.json` to be created **as a copy** of the current STATE content (strong evidence) with provenance pointer. Legacy `reports/STATE__WF-PL-01.json` remains as historical. |
| Contracts | missing | Explicit gap. |

## 5. WF-DI-01 Dispatcher

| Role | Canonical source | Reason |
|---|---|---|
| Implementation | `workflow/WF-DI-01_Dispatcher.json` | Matches naming pattern; `reports/STATE__WF-DI-01.json` referenced (to be confirmed at read). |
| Duplicate-full blueprint | `workflow/WF-DI-01_blueprint.json` | Same rule as §3. |
| Closure | `reports/CLOSURE_REPORT__WF-DI-01.md` | Sole closure. |
| Status | infer from STATE | STATE exists in `reports/STATE__WF-DI-01.json`. Copy to canonical location. |
| Contracts | missing | Explicit gap. |

## 6. WF-ME-01 Module Execution

| Role | Canonical source | Reason |
|---|---|---|
| Implementation | `workflow/WF-ME-01_Module_Execution.json` | 30 066 B; only `_Module_Execution.json` matches full role name. |
| Slim/supporting blueprint | `workflow/WF-ME-01_blueprint.json` (10 134 B) | 1/3 the size of the full JSON — could be slim or partial. Record as `supporting`; a future wf-sync pass should reduce to canonical slim shape (§5.3). |
| Closure | `reports/CLOSURE_REPORT__WF-ME-01.md` | Sole closure. |
| Test matrix | `docs/WF-ME-01_TEST_MATRIX.md` | Present. |
| Status | TBD — create STATE from CLOSURE + CURRENT_STAGE evidence | |
| Contracts | missing | Explicit gap. |

## 7. WF-RA-01 Result Aggregator

| Role | Canonical source | Reason |
|---|---|---|
| Implementation | `workflow/WF-RA-01_Result_Aggregator_LIVE.json` | `_LIVE` suffix is non-standard but the only full JSON in workflow/. Per standard §3 the name should be `WF-RA-01_Result_Aggregator.json`; the `_LIVE` annotation can be preserved inside `state/STATE__WF-RA-01.json` as `live_verified=true`. Do NOT rename in this pass (rename is a larger operation outside minimal-remediation scope; delete is gated). Record as a naming-drift gap. |
| Drafts | `workflow/drafts/` | Supporting/historical. |
| Closure | `reports/CLOSURE_REPORT__WF-RA-01.md` | Sole closure. |
| Final stage posture | `reports/FINAL_STAGE_POSTURE__WF-RA-01.md` | Supporting narrative. |
| Test matrix | `docs/WF-RA-01_TEST_MATRIX.md` | Present. |
| Status | infer from CLOSURE + FINAL_STAGE_POSTURE | STATE to be created. |
| Contracts | missing | Explicit gap. |

## 8. WF-SU-01 State Persistence Updater

| Role | Canonical source | Reason |
|---|---|---|
| Implementation | `workflow/WF-SU-01_State_Persistence_Updater.json` | Largest JSON, canonical filename pattern. |
| Pindata fixtures | `workflow/SU_PINDATA_ENVELOPES.json` | Supporting; fixture/test data, not implementation. |
| Misplaced code node | `workflow/SU_Build_Downstream_Envelope_TOLERANT_JSCODE.js` | Foreign misfile. Canonical (already) also exists at `scripts/SU_BUILD_ENVELOPE_TOLERANT_JSCODE.js`. The two are likely the same content with filename-case drift; treat `scripts/SU_BUILD_ENVELOPE_TOLERANT_JSCODE.js` as canonical (scripts/ is the canonical location per standard §3). Record the workflow/-located copy as historical / duplicate; cleanup of origin is gated by delete. |
| Closure | `reports/CLOSURE_REPORT_WF-SU-01.md` | Sole closure (filename uses single-underscore variant `_WF-SU-01` vs standard `__WF-SU-01`). Record naming-drift gap; do NOT rewrite. |
| Verifier delivery | `reports/WF-SU-01_VERIFIER_DELIVERY.md` | Present. CRITICAL-grade evidence. |
| Live executions | `reports/SU_LIVE_EXECUTIONS.md` | Present. CRITICAL-grade evidence. |
| Test matrix | `docs/WF-SU-01_TEST_MATRIX.md` | Present. |
| Status | canonical `state/STATE__WF-SU-01.json` to be created from `reports/STATE_WF-SU-01.json` contents; legacy file preserved as historical pointer. | |
| Contracts | missing | Explicit gap. |

## 9. WF-MO-01 Message Out / Output Gateway

| Role | Canonical source | Reason |
|---|---|---|
| Implementation | `workflow/WF-MO-01_Message_Out.json` | Canonical; slim blueprint co-exists. |
| Slim blueprint | `workflow/WF-MO-01_blueprint.json` | **Compliant** slim metadata per standard §5.3. |
| Handoff bundle | `docs/ucenicul_claude_handoff_hardened/` | Allowed per §3; canonical within its role. |
| Apply-first instructions | `reports/CLAUDE_PROMPT__WF-MO-01.txt` + `reports/README_APPLY_FIRST.md` | Canonical within their role (pack-specific application instructions). |
| Test matrix | `docs/WF-MO-01_TEST_MATRIX.md` | Present. |
| Closure | **missing** | No CLOSURE_REPORT__WF-MO-01.md on disk. Explicit gap. |
| Status | TBD | STATE must be created with `posture: pre_live_ready` per README status card. |
| Contracts | missing | Explicit gap. |

## 10. WF-RC-01 Response Composer

| Role | Canonical source | Reason |
|---|---|---|
| Implementation | `workflow/WF-RC-01_Response_Composer.json` | Canonical. |
| Slim blueprint | `workflow/WF-RC-01_blueprint.json` | **Compliant** slim metadata per §5.3. |
| Test matrix | `docs/WF-RC-01_TEST_MATRIX.md` | Present. |
| Reports (AUDIT/BUILD/CLOSURE/CURRENT_STAGE/FIX_LOG/STATE) | **misfiled in docs/** | Canonical location is reports/ (for reports) and state/ (for STATE). Record misplacement. Do not delete; create pointers from the canonical-location READMEs. |
| Status | from `docs/STATE__WF-RC-01.json` (authoritative content; wrong location) | Copy content to `state/STATE__WF-RC-01.json`; legacy copy in docs/ becomes historical. |
| Contracts | missing | Explicit gap. |

## 11. Cross-workflow canonicality conflicts

None detected. Each WF has a uniquely identifiable canonical implementation, canonical closure (where one exists), and canonical (or proxy-canonical) contract.

## 12. Archived-only entry

`_ARCHIVED_Executor_Closer_stub/` — ARCHIVED_ONLY. Its README establishes that:
- the WF code `WF-EC-01` is uniquely owned by `WF-EC-01_Execution_Context/`, not this stub;
- the folder is mount-locked and cannot be deleted;
- no canonical content lives here.

No canonical content needs to be resolved for this folder in this run.
