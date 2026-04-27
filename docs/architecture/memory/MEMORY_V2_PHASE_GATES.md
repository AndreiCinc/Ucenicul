# MEMORY_V2_PHASE_GATES.md

Opened: 2026-04-21.

Phase gates track discrete deliverables per frontier. No advancement without updating `MEMORY_V2_STATE.md` + clearing open bugs + confirming no authority conflict.

## F1 — full-workflow smoke runtime

| Gate | Description | Status |
|---|---|---|
| F1.0 | Smoke plan written (inputs per action, expected oracle, post-conditions, idempotency scope) | done (2026-04-21) |
| F1.1 | Trigger shape of `WF-ME-01` confirmed (trigger node + input envelope) from live workflow | done (2026-04-21) |
| F1.2 | 5 smoke inputs written (one per canonical action: store / search / recall / promote / supersede) | done (2026-04-21) |
| F1.3 | 5 executions run via `mcp__f2e8be41-…__execute_workflow` with real (or test-tenant) payloads | done (2026-04-21) |
| F1.4 | Execution outcomes captured via `get_execution` and stored as runtime evidence JSON + summary MD | done (2026-04-21) |
| F1.5 | DB-side delta verified per action (new row / updated row / unchanged, as oracle demands) | done (2026-04-21) |
| F1.6 | Walker-vs-workflow equivalence check (any divergence logged in bug ledger) | done (2026-04-21) — divergence isolated to result-envelope layer; 3 bugs logged |
| F1.7 | Smoke report frozen + state updated + F1 closed | done (2026-04-21) |

## F2 — semantic search leg

| Gate | Description | Status |
|---|---|---|
| F2.0 | Design doc: where the embedding producer lives (prep-layer code node vs external HTTP) | done (2026-04-21) — `docs/architecture/memory/v2/f2/design_f2_embedding_producer.md` |
| F2.1 | DIVERGENCE entry (additive node → patch plan delta) | done (2026-04-21) — D-M-011 |
| F2.2 | Patch plan delta + build_patch_v2.mjs | done (2026-04-21) — `v2/f2/patch_plan_f2.md`, `v2/f2/artifacts/build_patch_f2.mjs` (+ addendum `build_patch_f2b.mjs`) |
| F2.3 | Live rollout via `n8n-patch.mjs replace` | done (2026-04-21) — two replaces: F2 (`c4a3b0d1→7455992c`) + F2b hybrid-SQL addendum (`7455992c→f7f3e982`) |
| F2.4 | Semantic-path smoke proven end-to-end | done (2026-04-21) — caveat: semantic retrieval unverifiable until store-path embeds; producer+hybrid path proven via exec 1431/1441/1450. See `v2/f2/apply_evidence_f2_20260421.md` |

## F3 — 243 non-anchor manifest cases

| Gate | Description | Status |
|---|---|---|
| F3.0 | Deterministic input-generator design per `(action, family, index)` | done first-batch (2026-04-21) — seed template frozen in `tests/fixtures/family_cases_seed.json`; all 4 families exercised with hand-built variant-dim cases (search 6, recall 6, supersede 4, promote-eb 1) |
| F3.1 | Walker extension (or sidecar runner) | **done (2026-04-22T14:30Z — Stage C CLOSED `SUCCESS`)** — all 150 cases executed against live WF-ME-01 (versionId `b8e2f194`, frozen for Stage C evidence); 149 PASS, 1 FAIL classified `BAD_TEST_DEFINITION` for deferred V2-014 (promote case 012, resolved 2026-04-22T15:30Z by V2-014); 0 RUNTIME_WORKFLOW_BUG. 11 fixes logged (F31-FIX-001..F31-FIX-011 in `F31_FIX_LOG.md`); 4 deferred follow-ups handed off (V2-014 → CLOSED 2026-04-22T15:30Z; V2-OBS-RA-AGGREGATION-DOMAIN-WRITE-GATE → CLOSED 2026-04-22; V2-OBS-STORE-PREP-INPUT-PASSTHROUGH + V2-OBS-RECALL-SUMMARY-STRING remain open non-blocking). Prior interim `PARTIAL_SUCCESS_WITH_EVIDENCE` (2026-04-21, 3/150) is superseded. Anchor: `F31_STATE.json` (`verdict: SUCCESS`, `closed_at: 2026-04-22T14:30:00Z`) + `F31_FINAL_STATUS.md`. |
| F3.2 | Batch run + family roll-up | done first-batch (2026-04-21) — 4 family batches frozen in `tests/results/family_batch_{search_f2b,recall,supersede,promote}_20260421.md`. Total 17/17 oracles pass (search 6 + recall 6 + supersede 4 + promote-eb 1) |
| F3.3 | Results frozen; residual failures logged | done first-batch (2026-04-21) — zero residual failures across the 4 family batches; deferred work (full 150-case expansion, accept-via-corroboration, multi-signal accept) deliberately scoped out and recorded in each `Known-next-steps` section |

## F4 — promote_memory denial vocabulary

| Gate | Description | Status |
|---|---|---|
| F4.0 | Denial-reason taxonomy enumerated | done (2026-04-21) — `docs/architecture/memory/v2/f4/design_f4_denial_vocabulary.md` |
| F4.1 | Patch delta: `ME_Memory_Promote_Result` emits `module_result.artifacts.denial_reason` | done (2026-04-21) — `build_patch_f4.mjs`, `patchF4_params.json` |
| F4.2 | Rollout + smoke | done (2026-04-21) — `n8n-patch.mjs patch-node` → versionId `fc43f6bc-6f25-4588-afda-edadb55735ff`; smoke 3/3 green (execs 1524/1533/1542); DB invariant held. See `v2/f4/apply_evidence_f4_20260421.md` |

## F5 — subjective-guard multi-language

| Gate | Description | Status |
|---|---|---|
| F5.0 | Language-detection approach decided (prep-layer lang detector vs tenant-scoped locale vs external HTTP classifier) | **done (2026-04-21)** — Option A chosen by operator in `MEMORY_V2_F5_OPERATOR_DECISION_20260421.md` (tenant-scoped static locale list, {ro, en}, ro fallback on missing/unknown, sub-ms self-contained guard). Superseded the `AWAITING_OPERATOR_DECISION` state on `v2/f5/design_f5_proposal.md`. |
| F5.1 | Per-language token lists sourced + patch payloads built | **done (2026-04-21)** — `v2/f5/patch_plan_f5.md`, `v2/f5/artifacts/build_patch_f5.mjs` (with byte-canary on v1 RO regexes), `v2/f5/artifacts/patchF5_store_prep_params.json`, `v2/f5/artifacts/patchF5_supersede_prep_params.json`. All local sanity-tests pass (13/13 regex-logic cases). sha256 pinned in `WORK_LOG_MEMORY_V2_F5.md`. |
| F5.2 | Patch + rollout + smoke | **done (2026-04-21)** — landed via new channel (Postgres direct UPDATE on `workflow_entity` through `mcp__postgres__execute_sql`) after the canonical CLI + MCP PUT + MCP `patch_workflow_nodes` paths all proven blocked. DIVERGENCE `D-M-014`, decision ledger `V2-023`. versionId lineage `fc43f6bc → b8e2f194-0263-46d9-8306-1534cc7c31fe`. Smoke 7/7 PASS (execs 1626/1635/1644/1646/1655/1664/1666). DB invariant held (2 rows for F5-3 observation + F5-6 fact; no rows for 1/2/4/5/7). F5-3 row untouched by F5-7 (`updated_at==created_at`). Byte-diff: two Prep nodes' jsCode byte-identical to F5 payloads; 43 non-Prep nodes zero structural drift; `connections` byte-identical; settings net-strip of `timeSavedMode` only (`availableInMCP` preserved post-fixup to keep MCP executor functional). See `v2/f5/apply_evidence_f5_20260421.md`, `CLOSURE_REPORT_MEMORY_V2_F5.md`. |

## V2-014 — promote accept-predicate SQL patch

| Gate | Description | Status |
|---|---|---|
| V2-014.0 | Mission brief + execution plan + testing strategy frozen | done (2026-04-22) — `v2/v2_014/V2_014_MISSION_BRIEF.md` + `V2_014_EXECUTION_PLAN.md` + `V2_014_TESTING_STRATEGY.md` |
| V2-014.1 | Design freeze: single-field patch on `ME_Memory_Promote_DB.parameters.query`; accept CTE adds `OR (user_confirmed IS TRUE) OR (evidence_validated IS TRUE)`; pure superset of old predicate | done (2026-04-22) — `V2_014_DESIGN_FREEZE.md` (12-row invariants table + rollback-equivalence argument) |
| V2-014.2 | Deterministic builder + params payload (byte-identical re-run verified) | done (2026-04-22) — `artifacts/build_patch_v2_014.mjs` (sha256 `67ab3c4a…`) + `artifacts/patchV2_014_params.json` (sha256 `cf0c7ace…`) |
| V2-014.3 | Pre-apply verification (`verify_workflow` allPass; node snapshot) | done (2026-04-22) — `artifacts/runtime/get_workflow_pre.json` |
| V2-014.4 | Apply via canonical operator-run CLI (`n8n-patch.mjs patch-node`) | done (2026-04-22T15:30Z) — `artifacts/runtime/operator_apply_stdout.txt`; versionId `b8e2f194 → 279a8628-5df6-4b38-86b0-8cc51989629b` |
| V2-014.5 | Post-apply verification + diff-surface confirmation (single line in `parameters.query`, all other fields byte-identical) | done (2026-04-22) — `artifacts/runtime/get_workflow_post.json` + `diff_surface_verification.txt` |
| V2-014.6 | Primary proof rerun `f31-promote-012` PASS | done (2026-04-22) — exec 3881; row tier `recent → long_term`, `last_reconfirmed_at` set, `denial_reason=accepted`, `acceptance_signals=['user_confirmed']` |
| V2-014.7 | Safety reruns — no false broadening, no regression | done (2026-04-22) — exec 3883 (deny preserved) + exec 3892 (caller-accept still works) |
| V2-014.8 | Closeout + writeback | done (2026-04-22) — `V2_014_FINAL_STATUS.md` (verdict SUCCESS; 13/13 hard done criteria met; 0 blockers; V2-OBS-RA-AGGREGATION deferred follow-up still open at the time; subsequently CLOSED 2026-04-22 — see V2-OBS rows below) |

## V2-OBS-RA-AGGREGATION-DOMAIN-WRITE-GATE — ME→RA envelope domain-writes-performed normalization

| Gate | Description | Status |
|---|---|---|
| V2-OBS.0 | Problem reconstruction: ME→RA envelope propagated `domain_writes_performed: !!src.domain_writes_performed` instead of hardcoded `false`; violates RA `validate_aggregation_envelope` guard (ra_logic.py L80; aggregation stage must start from a no-write batch envelope) | done (2026-04-22) |
| V2-OBS.1 | Design freeze: single-field JS patch on `ME_Build_RA_Envelope.parameters.jsCode` success branch — `domain_writes_performed: false` unconditional; error branch left untouched (already compliant per B11-RA v1.1); pure normalization, no structural change, write-fence honored | done (2026-04-22) |
| V2-OBS.2 | Deterministic builder + params payload (byte-identical re-run verified) | done (2026-04-22) — artifacts under `docs/architecture/memory/v2/v2_obs_ra_aggregation_domain_write_gate/` |
| V2-OBS.3 | Pre-apply verification (`verify_workflow` allPass; node snapshot) | done (2026-04-22) |
| V2-OBS.4 | Apply via canonical operator-run CLI (`n8n-patch.mjs patch-node uq26nh1grIpnHju0 ME_Build_RA_Envelope`) | done (2026-04-22) — versionId `279a8628-5df6-4b38-86b0-8cc51989629b → 96962424-a9b1-4b7d-aa58-33ccc9c2b6a6` |
| V2-OBS.5 | Post-apply verification + diff-surface confirmation (single success-branch field change; error branch byte-identical; all non-target nodes byte-identical) | done (2026-04-22) |
| V2-OBS.6 | Local harness 50/50 PASS against `ra_logic_js.mjs` oracle | done (2026-04-22) — `V2_OBS_..._LOCAL_RESULTS.md` |
| V2-OBS.7 | Live E2E 50/50 PASS across 10 families (E1..E10) with writeful DB side-effects (promote E1+E9r = 10 rows tier=long_term; supersede E2r = 5 pairs; store E7 = 5 rows; idempotent replay E8) | done (2026-04-22) — `V2_OBS_..._E2E_RESULTS.md` |
| V2-OBS.8 | Closeout + writeback + ledger entry V2-027 | done (2026-04-22) — `V2_OBS_..._FINAL_STATUS.md` (verdict SUCCESS; 50/50 local + 50/50 E2E; versionId advanced to `96962424`); ledger V2-027 appended |

## F6A — store-path embedding producer

| Gate | Description | Status |
|---|---|---|
| F6A.0 | Mission brief + execution plan + testing strategy frozen | done (2026-04-23) — `v2/f6a/F6A_MISSION_BRIEF.md` + `F6A_EXECUTION_PLAN.md` + `F6A_TESTING_STRATEGY.md` |
| F6A.1 | Design freeze: two new nodes (`ME_Memory_Store_Embed` OpenAI HTTP `text-embedding-3-small`, `ME_Memory_Store_Embed_Merge` pure-function jsCode); `ME_Memory_Store_DB.parameters.options.queryReplacement` grows 13→14 slots; SQL adds `CASE WHEN $14::text IS NULL THEN NULL ELSE $14::vector(1536) END`; 4 connection edits rewire store leg; DS-INV-1..10 established | done (2026-04-23) — `F6A_DESIGN_FREEZE.md` (DS-INV-1..10 + BUILD-INV-1..10 + DB-INV-1..7) |
| F6A.2 | Fresh baseline dump + deterministic builder + payloads (byte-identical re-run verified) | done (2026-04-23) — artifacts under `v2/f6a/artifacts/` + `harness/` (merge jsCode sha256 `4f546fe2f711dea9da6723c9c03bcab7b4b60e6b849bd27bcf5c6b94bab022bc`) |
| F6A.3 | Pre-apply verification (`verify_workflow` allPass; node snapshot; baseline versionId `96962424` confirmed) | done (2026-04-23) — `F6A_APPLY_EVIDENCE_20260423.md §Pre-state` |
| F6A.4 | Apply via canonical agent-run local `n8n-patch.mjs` (V2-028 canonical; non-interactive, agent-authored payloads) | done (2026-04-23) — versionId `96962424-a9b1-4b7d-aa58-33ccc9c2b6a6 → c07fe923-76eb-4901-b53b-14039536df55`; nodeCount `45 → 47`, connectionCount `63 → 65`, active=true |
| F6A.5 | Post-apply verification + diff-surface confirmation (DS-INV-1..10 all GREEN; untouched-node and untouched-connection hashes byte-identical to pre-snapshot) | done (2026-04-23) — `F6A_APPLY_EVIDENCE_20260423.md §Post-state §Diff-surface` |
| F6A.6 | Local matrix 41 cases (L1 design-shape 5 + L2 happy-path 5 + L3+L3b merge purity 10 + L4 semantic top-1 5 + L5 lexical fallback 5 + L6 failure/degradation 5 + L7 non-target preservation 6) | done (2026-04-23) — `F6A_LOCAL_RESULTS.md` 41/41 PASS |
| F6A.7 | Live E2E matrix 28 cases (E1 store-happy 5 + E2 idempotency replay 5 + E3 semantic top-1 5 + E4 lexical fallback 5 + E5 failure 3 + E6 mixed flows 5) | done (2026-04-23) — `F6A_LIVE_RESULTS.md` 28/28 PASS; DB-INV-1..7 all GREEN |
| F6A.8 | Reconciliation: local vs live parity matrix; DS-INV runtime confirmations; classify all anomalies | done (2026-04-23) — `F6A_RECONCILIATION.md` verdict F6A RECONCILED, 69/69 case oracles met, 4 classified observations (OBS-E5 accept, OBS-E6.5 accept, SCOPE-OBS-1 follow-up-tracked, DOC-DRIFT-1 corrected in place) |
| F6A.9 | Closeout + writeback + ledger entry V2-029 | done (2026-04-23) — this file + `MEMORY_V2_STATE.md` + `MEMORY_V2_CLOSEOUT.md` + `SESSION_HANDOFF_NEXT.md` + `CURRENT_TRUTH_POST_F5.md` + `MEMORY_V2_DECISION_LEDGER.md` V2-029 + auto-memory anchor update |

## F6A-FOLLOWUP-SUPERSEDE-EMBED — supersede-path embedding producer

| Gate | Description | Status |
|---|---|---|
| F6AF.0 | Preflight: Tier A truth docs read; `n8n-patch` pack probed; live baseline `c07fe923`/47/65/active verified; DB SELECT sanity | done (2026-04-24) |
| F6AF.1 | Scope freeze: mission brief / state JSON / current stage / blocker register; 5 deliberate exclusions enumerated | done (2026-04-24) — `v2/f6a_followup_supersede_embed/F6A_FOLLOWUP_SUPERSEDE_EMBED_MISSION_BRIEF.md` + `_STATE.json` + `_CURRENT_STAGE.md` + `_BLOCKER_REGISTER.md` |
| F6AF.2 | Cartography + design freeze + testing strategy (live Supersede_Prep / Supersede_DB / Store pattern extracted; DS-INV-1..14, BUILD-INV-1..10, DB-1..8 enumerated) | done (2026-04-24) — `harness/cartography.md` + `F6A_FOLLOWUP_SUPERSEDE_EMBED_DESIGN_FREEZE.md` + `_TESTING_STRATEGY.md` |
| F6AF.3 | Deterministic builder + pre/post payload + diff summary; BUILD-INV-1..10 all PASS; re-run byte-identical at sha256 `7f2816af…589773b4` | done (2026-04-24) — `artifacts/build_patch_f6a_followup_supersede_embed.mjs` + `WF-ME-01_pre_f6a_followup.json` + `WF-ME-01_post_f6a_followup.json` + `diff_summary.md` |
| F6AF.4 | Local matrix: 9 MU + 14 WD + 8 LI = 31/31 PASS (candidate runs also against live-extracted jsCode post-apply) | done (2026-04-24) — `F6A_FOLLOWUP_SUPERSEDE_EMBED_LOCAL_RESULTS.md` |
| F6AF.5 | Pre-apply verify: versionId unchanged since Phase 0 | done (2026-04-24) — `F6A_FOLLOWUP_SUPERSEDE_EMBED_APPLY_COMMAND.md` + `_APPLY_EVIDENCE_20260424.md §Pre-state` |
| F6AF.6 | Canonical apply via V2-028 agent-run `n8n-patch.mjs replace` + post-verify: versionId `c07fe923 → 13e8e767`, nodeCount `47 → 49`, connectionCount `65 → 67`, active=true; DS-INV-1..14 all GREEN against live post-dump; MU-1..MU-9 GREEN against live-derived pure candidate | done (2026-04-24) — `F6A_FOLLOWUP_SUPERSEDE_EMBED_APPLY_EVIDENCE_20260424.md §Post-state §Diff-surface` |
| F6AF.7 | Live E2E 6/6 PASS (E1 happy supersede with 1536-d embedding; E2 idempotent replay rows_for_key=1; E3 semantic retrieval TOP-1 similarity 0.809; E4 invalid target no row; E5 F6A store-lane regression; E6 recall non-target); DB-1..DB-8 all GREEN | done (2026-04-24) — `F6A_FOLLOWUP_SUPERSEDE_EMBED_LIVE_RESULTS.md` |
| F6AF.8 | Reconciliation: design vs staged vs live vs runtime parity; 52/52 oracles met; 2 observations classified (OBS-RECALL-UX-PREEXISTING already tracked; OBS-ENVELOPE-INIT calibration); retires SCOPE-OBS-1 from F6A | done (2026-04-24) — `F6A_FOLLOWUP_SUPERSEDE_EMBED_RECONCILIATION.md` |
| F6AF.9 | Closeout writeback: this file + `MEMORY_V2_STATE.md` + `MEMORY_V2_CLOSEOUT.md` + `SESSION_HANDOFF_NEXT.md` + `CURRENT_TRUTH_POST_F5.md` + `MEMORY_V2_DECISION_LEDGER.md` V2-030 + auto-memory anchor update | done (2026-04-24) |

## V2-OBS-STORE-PREP-INPUT-PASSTHROUGH — store-memory caller field passthrough

| Gate | Description | Status |
|---|---|---|
| SPPT.0 | Preflight: Tier A truth, n8n-patch pack, .env present, baseline 13e8e767/49/67/active, DB schema check (incl. CHECK constraints discovery) | done (2026-04-24) |
| SPPT.1 | Live cartography Store_Prep + Store_DB; identified missing passthrough for tier/user_confirmed/corroboration_count; DB defaults discovered | done (2026-04-24) |
| SPPT.2 | Design freeze + 50 SPU oracle mapping + 14-DS-INV + 10-BUILD-INV | done (2026-04-24) |
| SPPT.3 | Deterministic builder + pre/post payload + diff_summary; BUILD-INV all PASS | done (2026-04-24) |
| SPPT.4 | 50 local/unit tests (SPU-01..SPU-50) PASS via pure candidate harness | done (2026-04-24) |
| SPPT.5 | Pre-apply verify; apply via V2-028 canonical agent-run n8n-patch.mjs replace; post-verify | done (2026-04-24) — initial apply `13e8e767 → 0bf42f1b` |
| SPPT.6 | 50 live E2E (SPE-01..50) — initially 49/50 with SPE-31 DB_WRITE_FAILED on caller corroboration_count=0 | done (2026-04-24, with hot-fix) |
| SPPT.6b | Hot-fix: corroboration_count validation `>=0 → >=1` to match DB CHECK; rebuild + re-apply via V2-028; SPE-31 retry GREEN | done (2026-04-24) — second apply `0bf42f1b → 67cb8545` |
| SPPT.7 | 50 SQL invariants (SPI-01..SPI-50, 6 grouped oracles) PASS | done (2026-04-24) |
| SPPT.8 | Reconciliation + observation classification (OBS-CORRO-DB-CHECK resolved during mission) | done (2026-04-24) — `LIVE_RESULTS.md §Anomalies and classification` |
| SPPT.9 | Closeout writeback + ledger V2-031 | done (2026-04-24) |

## ACCEPT-VIA-CORROBORATION-PROBE — promote acceptance via corroboration ≥ 2

| Gate | Description | Status |
|---|---|---|
| ACVCP.0 | Confirm Step 1 closed and Store_Prep passthrough working | done (2026-04-24) |
| ACVCP.1 | Probe freeze + cartography of Promote_DB accept predicate + Promote_Result acceptance_signals semantics | done (2026-04-24) — `PROBE_FREEZE.md` |
| ACVCP.2 | 50 local probe-planning oracles (CPU-01..CPU-50) derived from cartography | done (2026-04-24) — `LOCAL_RESULTS.md` |
| ACVCP.3 | 50 live E2E (CPE-01..CPE-50): 15 accept Family A + 10 deny Family B + 5 deny Family C1 wrong-tier + 5 deny Family C2 invalid-target + 5 idempotent replays Family D + 10 regression spots Family E (5 store + 3 supersede + 1 search + 1 recall) | done (2026-04-24) |
| ACVCP.4 | 50 SQL CPI grouped invariants PASS | done (2026-04-24) |
| ACVCP.5 | Live proof: CPE-01 exec 5541 returns `acceptance_signals:['corroboration']`; row tier flips recent → long_term | done (2026-04-24) |
| ACVCP.6 | Reconciliation + closeout; resolves V2-018 deferral (corroboration probe was deferred under V2-018 pending corroboration_count passthrough — Step 1 enabled it) | done (2026-04-24) — ledger V2-032 |

## V2-OBS-STORE-PREP-EVIDENCE-VALIDATED-PASSTHROUGH — store-memory caller evidence_validated passthrough

| Gate | Description | Status |
|---|---|---|
| EVPT.0 | Pack bootstrap (unzip, manifest, read all 19 pack files) + Tier A current-truth verification | done (2026-04-24) |
| EVPT.1 | Live cartography of Store_Prep (post-V2-031), Store_DB (17-slot baseline), Promote_DB, Promote_Result | done (2026-04-24) |
| EVPT.2 | Design freeze (DS-INV-1..14) + mission dir scaffolding + deterministic builder for post snapshot (0 new nodes, 0 connection edits, 2 modified node parameter fields, SQL slots 17 → 18) | done (2026-04-24) — `DESIGN_FREEZE.md` |
| EVPT.3 | 50 unit oracles (EVU-01..50) against pure candidate `harness/store_prep_candidate.mjs` PASS; 14 diff-surface DS-INV all GREEN against staged post-dump | done (2026-04-24) |
| EVPT.4 | V2-028 canonical apply via agent-run `n8n-patch.mjs replace`; lineage `67cb8545 → c2273980-fb36-420d-bab9-b9fc3edcb2d9`; post-verify versionId + nodeCount + connectionCount via MCP | done (2026-04-24) |
| EVPT.5 | 50 live runtime oracles (EVR-01..50): 20 true + 10 false + 5 omit + 10 combo + 3 idempotency replays + 2 invalid-type safe-default; all behave per V2-031-symmetric contract | done (2026-04-24) |
| EVPT.6 | 50 SQL invariants PASS (per-category distribution, embedding populated, non-target namespace untouched, no duplicate idempotency_keys) | done (2026-04-24) |
| EVPT.7 | Non-target runtime regression: search + recall live executions PASS with byte-identical lanes | done (2026-04-24) |
| EVPT.8 | Reconciliation + LIVE_RESULTS_STEP1 doc with 166 direct checks GREEN tally | done (2026-04-24) |
| EVPT.9 | Closeout writeback + ledger V2-033 | done (2026-04-24) — ledger V2-033 |

## ACCEPT-VIA-EVIDENCE-VALIDATED-PROBE — promote acceptance via row.evidence_validated IS TRUE

| Gate | Description | Status |
|---|---|---|
| AEVP.0 | Confirm Step 1 (V2-033) closed and evidence_validated passthrough working | done (2026-04-24) |
| AEVP.1 | Probe freeze + cartography of Promote lane (Promote_Prep/DB/Result live-extracted; 5-way accept disjunct confirmed: cc≥$3 / $4 uc / $5 ev / row.uc / row.ev; Promote_Result filters signals by db.ev===true OR row.ev===true) | done (2026-04-24) — `DESIGN_FREEZE_STEP2.md` |
| AEVP.2 | 50 local probe oracles (EVP-L-01..50) against pure simulator `harness/promote_lane_candidate.mjs`: 20 accept_via_row_evidence + 15 deny_without_signal + 7 deny_wrong_tier + 8 regression_signal_precedence — all PASS | done (2026-04-24) |
| AEVP.3 | 14 PP-INV including byte-identity hash check of Promote_Prep/_DB/_Result against pre-Step-1 snapshot (all IDENTICAL — proves Step 1 apply did not touch Promote lane) | done (2026-04-24) |
| AEVP.4 | 50 live runtime oracles (EVP-R-01..50): 20 accept via row.ev + 15 deny no-signal + 7 deny wrong-tier + 8 regression multi-signal — all PASS | done (2026-04-24) |
| AEVP.5 | 50 SQL invariants PASS (20 EVR-true rows flipped recent→long_term; 15 deny rows still recent; 0 deny-leak; 203 non-target rows untouched) | done (2026-04-24) |
| AEVP.6 | Live proof: EVP-R-01 exec `6453` returns `acceptance_signals:['evidence_validated']` for row `7bd7a188-…`; regression oracle EVP-R-44 exec `6642` (combo-45 row.ev=false) returns `['corroboration','user_confirmed']` with NO evidence_validated | done (2026-04-24) |
| AEVP.7 | Reconciliation + LIVE_RESULTS_STEP2 doc with 164 direct checks GREEN tally; combined V2-033+V2-034 = 330 direct checks; closeout writeback + ledger V2-034 | done (2026-04-24) — ledger V2-034 |

## Advancement rule

Each gate row → `pending` → `in-progress` → `done (YYYY-MM-DD)` or `blocked — see BUG_LEDGER`. Never skip rows.
