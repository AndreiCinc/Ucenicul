# MEMORY_V2_CLOSEOUT.md

One pointer per closed v2 frontier.

As of **2026-04-25** (post-FORMAL-MEMORY-V2-MISSION-CLOSE / V2-036, doc-only), **`memory_module v2` is FORMALLY CLOSED STABLE**. All 15 frontiers CLOSED SUCCESS: **F1 + Patch A + F2 + F2b + F3 (first-batch) + F4 + F5 + F3.1 (Stage C) + V2-014 + V2-OBS-RA-AGGREGATION-DOMAIN-WRITE-GATE + F6A + F6A-FOLLOWUP-SUPERSEDE-EMBED + V2-OBS-STORE-PREP-INPUT-PASSTHROUGH + ACCEPT-VIA-CORROBORATION-PROBE + V2-OBS-STORE-PREP-EVIDENCE-VALIDATED-PASSTHROUGH + ACCEPT-VIA-EVIDENCE-VALIDATED-PROBE**. Doc-only closeouts: DOC-SYSTEM-COMPACTION-ROLLOUT-CHANNEL-ALIGNMENT (V2-035, 2026-04-25) + FORMAL-MEMORY-V2-MISSION-CLOSE (V2-036, 2026-04-25). **Memory 100% Pack (post-formal-close polish)** Mission A: **V2-OBS-RECALL-SUMMARY-STRING-FIX CLOSED SUCCESS 2026-04-25 (V2-037)** — single-node `patch-node` on `ME_Memory_Recall_Result.parameters.jsCode`; versionId `c2273980-…` → `9d1da628-f9fd-44dc-8f62-fda571a7bc23`; 48/48 non-target nodes byte-identical; 66/66 direct checks GREEN; recall still pure-read. Anchor: `docs/architecture/memory/v2/v2_obs_recall_summary_string_fix/{DESIGN_FREEZE,APPLY_EVIDENCE_20260425,LIVE_RESULTS}.md`. Mission B: **IVFFLAT-RETRAIN-POLICY CLOSED SUCCESS 2026-04-25 (V2-038)** — doc-only policy at `docs/architecture/memory/v2/ops/ivfflat_retrain_policy.md`; no DB / workflow / index mutation; corpus snapshot `n=265 / populated=163 / null=102` (tiny regime, no thresholds crossed); `F6A-X-02` / `F6A-X-03` interdictions preserved; future rebuild requires separate scoped mission. Mission C: **FINAL-MEMORY-CERTIFICATION-SMOKE CLOSED SUCCESS 2026-04-25 (V2-039)** — `MEMORY_100_FOR_CURRENT_STAGE = TRUE`. 34 runtime E2E + 50 SQL invariants = 84/84 GREEN direct checks; all 5 canonical actions certified; no workflow mutation during certification; live versionId unchanged at `9d1da628-f9fd-44dc-8f62-fda571a7bc23` throughout Mission C. Anchor: `docs/architecture/memory/v2/final_memory_certification_smoke/{FINAL_MEMORY_CERTIFICATION_SMOKE_PLAN,FINAL_MEMORY_CERTIFICATION_SMOKE_RESULTS,FINAL_MEMORY_CERTIFICATION_SQL_RESULTS,FINAL_MEMORY_CERTIFICATION_RECONCILIATION}.md`. Memory module ready for integration into wider Ucenicul product flow. Non-blocking project-level backlog carried forward (not memory v2 deferred work): `V2-OBS-RECALL-SUMMARY-STRING` (cosmetic), `ivfflat` retrain policy (scaling), sub-B MCP settings filter (tooling), sub-A sandbox egress (audit-only), multi-workflow connector assertion (if-needed). Active frontier: **NONE**. Current live `WF-ME-01` is at `versionId = c2273980-fb36-420d-bab9-b9fc3edcb2d9` (lineage `da6d2573 → c4a3b0d1 (Patch A) → 7455992c (F2) → f7f3e982 (F2b) → fc43f6bc (F4) → b8e2f194 (F5) → 279a8628 (V2-014) → 96962424 (V2-OBS) → c07fe923 (F6A) → 13e8e767 (F6A-FOLLOWUP) → 0bf42f1b (V2-OBS-STORE-PREP-INPUT-PASSTHROUGH initial) → 67cb8545 (V2-OBS-STORE-PREP-INPUT-PASSTHROUGH hot-fix) → c2273980 (V2-OBS-STORE-PREP-EVIDENCE-VALIDATED-PASSTHROUGH / V2-033)`), `nodeCount=49`, `connectionCount=67`, `active=true`. Both store and supersede lanes emit `embedding vector(1536)`. Store_Prep passes caller `tier`/`user_confirmed`/`corroboration_count`/`evidence_validated` (4 of 4 promotion-signal fields) through to DB. Row-persisted accept routes (`corroboration ≥ 2` and `evidence_validated IS TRUE`) are both proven live. `67cb8545-…` is a historical checkpoint post-V2-031/V2-032 only — not current live.

Still open as non-blocking deferred follow-ups: V2-OBS-RECALL-SUMMARY-STRING, `ivfflat` retrain policy, sub-A (sandbox egress) / sub-B (MCP settings filter) infra.

The "Live workflow state post-F5" line in the F5 section below is a **frozen F5-closure checkpoint** (versionId `b8e2f194-…`) — it is historically true at that moment and must not be read as the current live state; see the F3.1 / V2-014 / V2-OBS sections below for the subsequent advances.

## F1 — full-workflow smoke runtime (CLOSED 2026-04-21)

- Plan: `docs/architecture/memory/v2/smoke_plan_f1.md`
- Per-run evidence: `docs/architecture/memory/v2/runtime/exec_s1_store.json`, `exec_s2_search.json`, `exec_s3_recall.json`, `exec_s4_promote.json`, `exec_s5_supersede.json`
- Frozen report: `docs/architecture/memory/v2/runtime/smoke_report_f1.md`
- Gate rows: `MEMORY_V2_PHASE_GATES.md §F1` — F1.0 → F1.7 all `done (2026-04-21)`.
- Result: 5/5 canonical actions green at DB layer. Three workflow-layer bugs opened: BUG-V2-01, BUG-V2-02, BUG-V2-03 (see `MEMORY_V2_BUG_LEDGER.md`).
- Rollout channel used: MCP read-only only (`execute_workflow` + `get_execution`); no workflow mutation performed. The live `WF-ME-01` at versionId `da6d2573-ed85-4f1f-8c54-693364f9a432` is unchanged.

## Patch A — search_result envelope fixes (CLOSED 2026-04-21)

- Plan: `docs/architecture/memory/v2/patches/patch_A_search_result_fixes.md`
- Apply evidence: `docs/architecture/memory/v2/patches/apply_evidence_patchA_20260421.md`
- Artifacts: `v2/patches/artifacts/` (builder + params JSON)
- Rollout channel: `n8n-patch.mjs patch-node` (canonical CLI from prior session when sandbox egress was available). versionId lineage `da6d2573 → c4a3b0d1-177e-457e-b710-f22bf78eb240`.
- Scope: `ME_Memory_Search_Result.parameters.jsCode` only — filter rows by `typeof r.id === 'string'` (BUG-V2-01), compute `used_embedding` from `rows.some(r => r.lexical_fallback === false)` (BUG-V2-02).
- Smoke: s2a (exec 1394), s2b (exec 1403, `zzz_no_match_zzz`), s2c (exec 1412) all green.
- Decision ledger: `V2-007` (pre-F2 isolation), `V2-008` (patch-node channel).
- DIVERGENCE: `D-M-010`.

## F2 — semantic search leg + F2b hybrid-SQL addendum (CLOSED 2026-04-21)

- Design: `docs/architecture/memory/v2/f2/design_f2_embedding_producer.md`
- Patch plan: `docs/architecture/memory/v2/f2/patch_plan_f2.md`
- Artifacts: `v2/f2/artifacts/build_patch_f2.mjs` (F2), `build_patch_f2b.mjs` (F2b addendum)
- Apply evidence: `docs/architecture/memory/v2/f2/apply_evidence_f2_20260421.md`
- Rollout channel: `n8n-patch.mjs replace` (structural change: 2 new nodes `ME_Memory_Search_Embed` + `ME_Memory_Search_Embed_Merge`, 3 new edges, 1 removed edge). versionId lineage `c4a3b0d1 → 7455992c-... (F2) → f7f3e982-1ec8-46c9-a5d9-6d905419b313 (F2b)`.
- Scope: search leg `Prep → Embed → Embed_Merge → DB → Result`. Store-path continues to write `embedding=NULL` (F2-future).
- Smoke: exec 1431 (t1), 1441 (regression probe, recovered), 1450 (t4) all green.
- Decision ledger: `V2-009` (replace channel), `V2-010` (F2/F2b split), `V2-011` (used_embedding semantics), `V2-012` (isTrueEmbeddingFallback scope).
- DIVERGENCE: `D-M-011` (F2 producer), `D-M-012` (F2b hybrid lexical-gate removal).

## F3 — 243 non-anchor manifest cases, first-batch variant-dim coverage (CLOSED 2026-04-21)

- Seed: `docs/architecture/memory/tests/fixtures/family_cases_seed.json`
- Family batch summaries:
  - `docs/architecture/memory/tests/results/family_batch_search_f2b_20260421.md` (6 cases)
  - `docs/architecture/memory/tests/results/family_batch_recall_20260421.md` (6 cases)
  - `docs/architecture/memory/tests/results/family_batch_supersede_20260421.md` (4 cases)
  - `docs/architecture/memory/tests/results/family_batch_promote_20260421.md` (1 accept-via-evidence_validated case)
- Result: 17/17 oracles pass. Zero residual failures.
- Deferred to F3.1 walker: full combinatorial expansion to 150 cases (50 search + 50 recall + 25 promote + 25 supersede) + accept-via-corroboration axis.
- Rollout channel: no workflow mutation required. MCP `execute_workflow` + `mcp__postgres__execute_sql` for verification.
- Decision ledger: `V2-015` (F4-t3 fixture via live store path — also applies to F3 seeds), `V2-016` (variant-dim vs combinatorial), `V2-017` (shared SUPERSEDE_TARGET_INVALID), `V2-018` (corroboration deferral).

## F4 — promote_memory denial vocabulary (CLOSED 2026-04-21)

- Design: `docs/architecture/memory/v2/f4/design_f4_denial_vocabulary.md`
- Artifacts: `v2/f4/artifacts/build_patch_f4.mjs`, `patchF4_params.json`
- Apply evidence: `docs/architecture/memory/v2/f4/apply_evidence_f4_20260421.md`
- Rollout channel: `n8n-patch.mjs patch-node` on `ME_Memory_Promote_Result.parameters.jsCode`. versionId lineage `f7f3e982 → fc43f6bc-6f25-4588-afda-edadb55735ff`.
- Scope: single-node jsCode swap. New `acceptance_signals` array emitted on accept (OR of caller inputs and row state), `denial_reason` verbatim from DB (no null-on-accept), new `artifacts` entries `{type:'denial_reason', ...}` always + `{type:'acceptance_signals', ...}` on accept.
- Smoke: 3 cases (execs 1524 deny-not_in_recent_tier, 1533 deny-acceptance_criteria_not_met, 1542 accept-via-user_confirmed). DB invariant held — only accept case mutated its target.
- Decision ledger: `V2-013` (patch-node channel), `V2-014` (acceptance_signals OR semantics), `V2-015` (fixture via live store path).
- DIVERGENCE: `D-M-013`.
- Resolves: `BUG-V2-03`.

## F5 — subjective-guard multi-language (CLOSED 2026-04-21)

- Operator decision: `docs/architecture/memory/MEMORY_V2_F5_OPERATOR_DECISION_20260421.md`
- Plan: `docs/architecture/memory/v2/f5/patch_plan_f5.md`
- Payloads: `v2/f5/artifacts/patchF5_store_prep_params.json` (sha `30450a28…`), `patchF5_supersede_prep_params.json` (sha `7432fc26…`)
- Pre/post snapshots: `v2/f5/artifacts/db_apply_20260421/wf_me_01_preapply_db_20260421.json`, `wf_me_01_postapply_db_20260421.json`
- Apply SQL: `v2/f5/artifacts/db_apply_20260421/f5_apply.sql`
- Diff-surface proof: `v2/f5/artifacts/db_apply_20260421/diff_surface_verification.txt`
- Smoke summary: `v2/f5/artifacts/runtime/smoke_summary_f5.md` (7/7 PASS; execs 1626/1635/1644/1646/1655/1664/1666)
- Apply evidence: `v2/f5/apply_evidence_f5_20260421.md`
- Closure report: `CLOSURE_REPORT_MEMORY_V2_F5.md`
- Decision ledger: `V2-023` (channel exception), `V2-024` (settings-strip correction)
- DIVERGENCE: `D-M-014` (Postgres direct UPDATE as F5-only channel)
- Gate rows: `MEMORY_V2_PHASE_GATES.md §F5` — F5.0 / F5.1 / F5.2 all `done (2026-04-21)`.
- Live workflow state **immediately post-F5 (frozen F5-closure checkpoint, 2026-04-21)**: `versionId=b8e2f194-0263-46d9-8306-1534cc7c31fe`, `nodeCount=45`, `connectionCount=63`, `active=true`, lineage `fc43f6bc → b8e2f194`. Subsequent closures (V2-014, V2-OBS) have advanced this; see the sections below and the intro for current live versionId.

## F3.1 — walker/sidecar (Stage C) (CLOSED SUCCESS 2026-04-22T14:30Z)

- Mission brief + state: `docs/architecture/memory/v2/f3_1/F31_MISSION_BRIEF.md`, `F31_STATE.json` (verdict `SUCCESS`, `closed_at: 2026-04-22T14:30:00Z`), `F31_FINAL_STATUS.md`, `F31_CURRENT_STAGE.md`.
- Harness: `docs/architecture/memory/v2/f3_1/harness/f31_runner.mjs`, `f31_matrix_gen.mjs`.
- Matrix: `docs/architecture/memory/v2/f3_1/matrix/f31_cases_150.json` (150 cases: 50 search + 50 recall + 25 promote + 25 supersede).
- Result: 149 PASS / 1 FAIL (`f31-promote-012`, classified `BAD_TEST_DEFINITION` — probes V2-014 row-persisted `user_confirmed` acceptance; re-PASSes after V2-014 ships). 0 RUNTIME_WORKFLOW_BUG. 11 fixes logged in `F31_FIX_LOG.md` (F31-FIX-001..F31-FIX-011). 4 deferred follow-ups handed off — all resolved except one cosmetic: V2-014 → closed 2026-04-22T15:30Z; V2-OBS-RA-AGGREGATION-DOMAIN-WRITE-GATE → closed 2026-04-22; **V2-OBS-STORE-PREP-INPUT-PASSTHROUGH → closed 2026-04-24 (V2-031)**; V2-OBS-RECALL-SUMMARY-STRING still open (cosmetic non-blocking).
- Gate rows: `MEMORY_V2_PHASE_GATES.md §F3.1` — `done (2026-04-22T14:30Z — Stage C CLOSED SUCCESS)`.
- Prior interim verdict `PARTIAL_SUCCESS_WITH_EVIDENCE` (2026-04-21, 3/150) is superseded.
- Live workflow state at F3.1 Stage C evaluation (frozen F3.1 evidence checkpoint): `versionId=b8e2f194-…` (pre-V2-014).

## V2-014 — promote accept-predicate SQL patch (CLOSED SUCCESS 2026-04-22T15:30Z)

- Mission brief + state: `docs/architecture/memory/v2/v2_014/V2_014_MISSION_BRIEF.md`, `V2_014_STATE.json`, `V2_014_FINAL_STATUS.md`.
- Design freeze: `V2_014_DESIGN_FREEZE.md` (single-field patch on `ME_Memory_Promote_DB.parameters.query`; accept CTE adds `OR (user_confirmed IS TRUE) OR (evidence_validated IS TRUE)`; pure superset of prior predicate).
- Apply evidence: `V2_014_APPLY_COMMAND.md` + `artifacts/runtime/operator_apply_stdout.txt`.
- Diff-surface proof: `artifacts/runtime/diff_surface_verification.txt` (single line change in `parameters.query`; all other fields byte-identical).
- Rollout channel: canonical operator-run CLI (`n8n-patch.mjs patch-node`, V2-025 protocol). versionId lineage `b8e2f194 → 279a8628-5df6-4b38-86b0-8cc51989629b`.
- Reruns: `f31-promote-012` primary proof PASS at exec 3881 (row tier `recent → long_term`, `last_reconfirmed_at` set, `denial_reason=accepted`, `acceptance_signals=['user_confirmed']`). Safety reruns: exec 3883 (deny preserved) + exec 3892 (caller-accept preserved).
- Decision ledger: `V2-014` (opened 2026-04-21 as ledger entry, SQL implementation closed SUCCESS 2026-04-22T15:30Z).
- Gate rows: `MEMORY_V2_PHASE_GATES.md §V2-014` — V2-014.0 → V2-014.8 all `done (2026-04-22)`.
- Live workflow state post-V2-014 (frozen V2-014-closure checkpoint, 2026-04-22T15:30Z): `versionId=279a8628-5df6-4b38-86b0-8cc51989629b`, `nodeCount=45`, `connectionCount=63`, `active=true`, lineage `b8e2f194 → 279a8628`. Subsequently advanced by V2-OBS; see next section.

## V2-OBS-RA-AGGREGATION-DOMAIN-WRITE-GATE — ME→RA envelope normalization (CLOSED SUCCESS 2026-04-22)

- Mission brief + state: `docs/architecture/memory/v2/v2_obs_ra_aggregation_domain_write_gate/V2_OBS_RA_AGGREGATION_DOMAIN_WRITE_GATE_MISSION_BRIEF.md`, `_STATE.json`, `_FINAL_STATUS.md`, `_CURRENT_STAGE.md`, `_DISPATCH_LOG.md`, `_BLOCKER_REGISTER.md`, `_FIX_LOG.md`.
- Design freeze: `V2_OBS_..._DESIGN_FREEZE.md` (single-field JS patch on `ME_Build_RA_Envelope.parameters.jsCode` success branch: `domain_writes_performed: !!src.domain_writes_performed` → `domain_writes_performed: false`; error branch already compliant per B11-RA v1.1 and left untouched; pure normalization, no structural change).
- Apply evidence: `V2_OBS_..._APPLY_COMMAND.md` + `artifacts/runtime/diff_surface_verification.txt`.
- Rollout channel: canonical operator-run CLI (`n8n-patch.mjs patch-node uq26nh1grIpnHju0 ME_Build_RA_Envelope`, V2-025 protocol). versionId lineage `279a8628 → 96962424-a9b1-4b7d-aa58-33ccc9c2b6a6`.
- Test coverage: Local harness 50/50 PASS against `ra_logic_js.mjs` oracle (`V2_OBS_..._LOCAL_RESULTS.md`). Live E2E 50/50 PASS across 10 families (E1..E10) with writeful DB side-effects — promote E1+E9r = 10 rows tier flipped to `long_term`; supersede E2r = 5 pairs (original → `superseded`, new active with `supersedes_memory_id` backlink); store E7 = 5 rows inserted with `category=v2obs_store`; idempotent replay E8 (`V2_OBS_..._E2E_RESULTS.md`).
- Decision ledger: `V2-027` (CLOSED SUCCESS 2026-04-22).
- Gate rows: `MEMORY_V2_PHASE_GATES.md §V2-OBS-RA-AGGREGATION-DOMAIN-WRITE-GATE` — V2-OBS.0 → V2-OBS.8 all `done (2026-04-22)`.
- **Live workflow state post-V2-OBS (frozen V2-OBS-closure checkpoint, 2026-04-22):** `versionId=96962424-a9b1-4b7d-aa58-33ccc9c2b6a6`, `nodeCount=45`, `connectionCount=63`, `active=true`, lineage `279a8628 → 96962424`. Subsequently advanced by F6A; see next section.

## F6A — store-path embedding producer (CLOSED SUCCESS 2026-04-23)

- Mission brief + state: `docs/architecture/memory/v2/f6a/F6A_MISSION_BRIEF.md`, `F6A_STATE.json`, `F6A_CURRENT_STAGE.md`, `F6A_DISPATCH_LOG.md`, `F6A_BLOCKER_REGISTER.md`.
- Design freeze: `F6A_DESIGN_FREEZE.md` (two new nodes `ME_Memory_Store_Embed` = OpenAI `text-embedding-3-small` HTTP + `ME_Memory_Store_Embed_Merge` = pure-function jsCode; `ME_Memory_Store_DB.parameters.options.queryReplacement` grows 13→14 slots with 14th = `embedding_text`; SQL projection adds `CASE WHEN $14::text IS NULL THEN NULL ELSE $14::vector(1536) END`; 4 connection edits rewire store leg to `Prep → Store_Embed → Store_Embed_Merge → Store_DB → Store_Result`; DS-INV-1..10 + BUILD-INV-1..10 + DB-INV-1..7 frozen).
- Testing strategy: `F6A_TESTING_STRATEGY.md` (41-case local matrix + 28-case live E2E matrix).
- Apply evidence: `F6A_APPLY_EVIDENCE_20260423.md` — pre/post snapshots, diff-surface verification, DS-INV-1..10 all GREEN.
- Rollout channel: canonical agent-run local `n8n-patch.mjs` (V2-028, agent-authored non-interactive). versionId lineage `96962424 → c07fe923-76eb-4901-b53b-14039536df55`. nodeCount `45 → 47`; connectionCount `63 → 65`; active=true.
- Merge jsCode sha256: `4f546fe2f711dea9da6723c9c03bcab7b4b60e6b849bd27bcf5c6b94bab022bc` (dumped in `harness/merge_live_jscode.txt`). Design-vs-staged-vs-live byte-match verified end-to-end.
- Local matrix: `F6A_LOCAL_RESULTS.md` — 41/41 PASS (L1 design-shape 5 + L2 happy-path 5 + L3+L3b merge purity 10 + L4 semantic top-1 5 + L5 lexical fallback 5 + L6 failure/degradation 5 + L7 non-target preservation 6).
- Live matrix: `F6A_LIVE_RESULTS.md` — 28/28 PASS (E1 store-happy 5 + E2 idempotency replay 5 + E3 semantic top-1 5 + E4 lexical fallback 5 + E5 failure 3 + E6 mixed flows 5); DB-INV-1..7 all GREEN (101 pre-apply rows with `embedding IS NULL` unchanged post-apply; 15 post-apply store-path rows all populated 1536-d; 1 supersede-path row NULL classified as out-of-scope).
- Reconciliation: `F6A_RECONCILIATION.md` — verdict **F6A RECONCILED**, 69/69 case oracles met (41 local + 28 live), 4 observations classified:
  - **OBS-E5** (error-code demotion `MISSING_REQUIRED_FIELDS`/`SUBJECTIVE_JUDGMENT_FORBIDDEN` → `DB_WRITE_FAILED` when prep `_error:true` because `ME_Memory_Store_DB.parameters.options.queryReplacement` emits all-NULLs and `continueOnFail` masks the prep error): **Accept** — pre-F6A behavior, not a regression (the replacement array was 13 pre-F6A, 14 post-F6A; demotion pattern is unchanged). Cleaner short-circuit belongs on backlog.
  - **OBS-E6.5** (rank inversion on short rare-token queries because `text-embedding-3-small` favors sentence-level semantic similarity over rare-token identity): **Accept** — F6A contract requires stored rows to *participate* in ranking (not be NULL-filtered); seed is in top-5, contract met. Retrieval-quality tuning (hybrid re-rank / BM25 / query expansion) is out of F6A scope.
  - **SCOPE-OBS-1** (supersede-lane `ME_Memory_Supersede_DB` still inserts rows without an `embedding` column projection; new superseder rows land with `embedding IS NULL`): matches design (SCOPE explicitly lists SUPERSEDE lane as out-of-scope) — **Log as known-gap** for a follow-up mission `F6A-FOLLOWUP-SUPERSEDE-EMBED`. Do NOT re-open F6A.
  - **DOC-DRIFT-1** (`F6A_DESIGN_FREEZE.md §Q5` claimed "Removed `usedEmbedding` local" but live jsCode retains it as a passthrough for Search-lane symmetry): **Corrected in place** 2026-04-23 — §Q5 bullet replaced with the accurate description and a pointer to the sha256-pinned live jsCode dump.
- Decision ledger: `V2-028` (2026-04-22: canonical apply model = agent-run local pack, supersedes V2-025's operator-run-CLI default — V2-025 remains preserved as a legacy audit entry per V2-026 escape-hatch conditions) + `V2-029` (2026-04-23: F6A closeout, 69/69 matrix + 4 classified observations).
- Gate rows: `MEMORY_V2_PHASE_GATES.md §F6A` — F6A.0 → F6A.9 all `done (2026-04-23)`.
- Resolves: "store-path embedding producer" deferred follow-up from F2-future. Surfaces: `F6A-FOLLOWUP-SUPERSEDE-EMBED` as its narrower successor.
- **Live workflow state post-F6A (frozen F6A-closure checkpoint, 2026-04-23):** `versionId=c07fe923-76eb-4901-b53b-14039536df55`, `nodeCount=47`, `connectionCount=65`, `active=true`, lineage `96962424 → c07fe923`. Subsequently advanced by F6A-FOLLOWUP; see next section.

## F6A-FOLLOWUP-SUPERSEDE-EMBED — supersede-path embedding producer (CLOSED SUCCESS 2026-04-24)

- Mission brief + state: `docs/architecture/memory/v2/f6a_followup_supersede_embed/F6A_FOLLOWUP_SUPERSEDE_EMBED_MISSION_BRIEF.md`, `F6A_FOLLOWUP_SUPERSEDE_EMBED_STATE.json`, `F6A_FOLLOWUP_SUPERSEDE_EMBED_CURRENT_STAGE.md`, `F6A_FOLLOWUP_SUPERSEDE_EMBED_BLOCKER_REGISTER.md`.
- Design freeze: `F6A_FOLLOWUP_SUPERSEDE_EMBED_DESIGN_FREEZE.md` (two new nodes `ME_Memory_Supersede_Embed` + `ME_Memory_Supersede_Embed_Merge`; `ME_Memory_Supersede_DB.parameters.options.queryReplacement` 15→16 slots with 16th = `embedding_text`; SQL replacement-row INSERT adds `CASE WHEN $16::text IS NULL THEN NULL ELSE $16::vector(1536) END`; 4 connection edits rewire supersede leg; DS-INV-1..14 + BUILD-INV-1..10 + DB-1..8 frozen).
- Testing strategy: `F6A_FOLLOWUP_SUPERSEDE_EMBED_TESTING_STRATEGY.md` (31-case local matrix + 6-case live E2E + 8 DB invariants = 45 non-preflight oracles).
- Apply evidence: `F6A_FOLLOWUP_SUPERSEDE_EMBED_APPLY_EVIDENCE_20260424.md` — pre/post snapshots, diff-surface verification against **live** post-dump, DS-INV-1..14 all GREEN, MU-1..9 re-run against live-extracted pure candidate all GREEN.
- Rollout channel: canonical V2-028 agent-run local `n8n-patch.mjs replace`. versionId lineage `c07fe923-76eb-4901-b53b-14039536df55 → 13e8e767-0b0e-401a-b3da-7db94e1f926a`. nodeCount `47 → 49`; connectionCount `65 → 67`; active=true.
- Merge jsCode sha256: `6272bec4e67422947d71a1b2283670c57bc6e99b177a55f7754b842332750f9b`. Design → staged → live byte-match end-to-end.
- Local matrix (31/31 PASS): 9 MU + 14 WD + 8 LI via `tests/local/run_merge_unit_tests.mjs`, `tests/local/run_workflow_diff_tests.mjs`, `tests/local/run_integration_tests.mjs`.
- Live matrix (6/6 PASS + DB 8/8 GREEN): E1 happy supersede with 1536-d embedding (row `a0eea3bb`), E2 idempotent replay (rows_for_key=1), E3 semantic retrieval participation (TOP-1 similarity 0.8089), E4 invalid target (no row), E5 F6A store-lane regression, E6 recall non-target. DB-1 no-backfill (102 NULL rows unchanged), DB-2/DB-3 new row has 1536-d embedding, DB-4 old row preserved, DB-5 no duplicate per key, DB-6 ivfflat index unchanged, DB-7 scope correct, DB-8 no direct writes.
- Reconciliation: `F6A_FOLLOWUP_SUPERSEDE_EMBED_RECONCILIATION.md` — verdict **F6A-FOLLOWUP-SUPERSEDE-EMBED RECONCILED**, 52/52 oracles met (7 PF + 9 MU + 14 WD + 8 LI + 6 E + 8 DB), 2 observations classified:
  - **OBS-RECALL-UX-PREEXISTING** (Recall_Prep emits `_error:true MISSING_REQUIRED_FIELDS` on memory_id-only call; Result still summarizes "1 rows"): pre-existing, already tracked as `V2-OBS-RECALL-SUMMARY-STRING`. Accept.
  - **OBS-ENVELOPE-INIT** (first E1 call used `module_execution_started=true`; rejected by validator): calibration error, not a defect. Resolved.
  - **SCOPE-OBS-1 from F6A**: CLOSED by this mission (supersede replacement rows now participate in semantic retrieval).
- Decision ledger: `V2-030` (CLOSED SUCCESS 2026-04-24).
- Gate rows: `MEMORY_V2_PHASE_GATES.md §F6A-FOLLOWUP-SUPERSEDE-EMBED` — F6AF.0 → F6AF.9 all `done (2026-04-24)`.
- Resolves: F6A follow-up `F6A-FOLLOWUP-SUPERSEDE-EMBED` (SCOPE-OBS-1 from F6A_RECONCILIATION.md §3).
- **Live workflow state post-F6A-FOLLOWUP (frozen F6A-FOLLOWUP-closure checkpoint, 2026-04-24):** `versionId=13e8e767-0b0e-401a-b3da-7db94e1f926a`, `nodeCount=49`, `connectionCount=67`, `active=true`, lineage `c07fe923 → 13e8e767`. Subsequently advanced by V2-OBS-STORE-PREP-INPUT-PASSTHROUGH; see next section.

## V2-OBS-STORE-PREP-INPUT-PASSTHROUGH — store-memory caller field passthrough (CLOSED SUCCESS 2026-04-24)

- Mission brief + state: `docs/architecture/memory/v2/v2_obs_store_prep_input_passthrough/{PACK_MANIFEST_READ_STATUS,DESIGN_FREEZE,LIVE_RESULTS,APPLY_EVIDENCE_20260424}.md`.
- Design freeze: `DESIGN_FREEZE.md` (2 modified nodes — Store_Prep jsCode + Store_DB SQL/queryReplacement; 0 new nodes; 0 connection edits; SQL slots 14 → 17 with `$14`=tier, `$15`=user_confirmed, `$16`=corroboration_count, `$17`=embedding CASE-guard).
- Apply channel: V2-028 canonical agent-run local `n8n-patch.mjs replace`, two iterations:
  - 1st apply: `13e8e767 → 0bf42f1b-97d1-4b98-a5ff-258427cb2a81` (initial; corroboration_count validation `>=0`).
  - Hot-fix during Phase 7: discovered DB CHECK `memory_items_corroboration_min_ck CHECK (corroboration_count >= 1)` rejects caller=0.
  - 2nd apply: `0bf42f1b → 67cb8545-f1a0-40ab-b8f4-5bf5edd89328` (corroboration_count validation tightened to `>=1`).
- Live verification: 50 SPE execute_workflow calls all status:success; SPE-31 (caller corro=0) initial DB_WRITE_FAILED + retry GREEN at exec 5262 with safe-bound to 1.
- Mission oracles: 50 local SPU + 50 live SPE + 50 SQL SPI = **150/150**.
- DB invariants: 102 pre-mission NULL-embedding rows unchanged; 45 mission-namespace rows all with embedding=1536-d; idempotency keys all collapsed to 1; ivfflat index byte-identical.
- F6A store-embed and F6A-FOLLOWUP supersede-embed both intact.
- Final post-snapshot sha256 `a149bb2e5dcb3b274d4f59e2d6974af636cba33746757ddd0c89bb18b7e264ad`; final Store_Prep jsCode sha256 `2bf0954c3c40912155889d05c9b4e3585ff908852caa450dd59d91c8b1576766`.
- Decision ledger: `V2-031` (CLOSED SUCCESS 2026-04-24).
- Gate rows: `MEMORY_V2_PHASE_GATES.md §V2-OBS-STORE-PREP-INPUT-PASSTHROUGH` SPPT.0..SPPT.9 all `done (2026-04-24)`.
- Resolves: V2-OBS-STORE-PREP-INPUT-PASSTHROUGH deferred follow-up tracked since F3.1 Stage C closure handoff.
- **Live workflow state post-V2-OBS-STORE-PREP-INPUT-PASSTHROUGH:** `versionId=67cb8545-f1a0-40ab-b8f4-5bf5edd89328`, `nodeCount=49`, `connectionCount=67`, `active=true`. Subsequently used as baseline by ACCEPT-VIA-CORROBORATION-PROBE (no further mutation).

## ACCEPT-VIA-CORROBORATION-PROBE — promote acceptance via corroboration ≥ 2 (CLOSED SUCCESS 2026-04-24)

- Mission brief + state: `docs/architecture/memory/v2/accept_via_corroboration_probe/{PROBE_FREEZE,LOCAL_RESULTS,LIVE_RESULTS}.md`.
- No workflow mutation; mission was a probe enabled by V2-031 corroboration_count passthrough.
- Live proof: CPE-01 / exec 5541: row `ae843883-…` (corroboration_count=2, user_confirmed=false, evidence_validated=false) promoted to long_term; `ME_Memory_Promote_Result` returns `acceptance_signals:['corroboration']`.
- Mission oracles: 50 local probe-planning CPU + 50 live E2E CPE + 50 SQL CPI = **150/150**.
- Live E2E breakdown: 15 accept-via-corroboration (all PASS) + 10 deny-below-threshold (all PASS, denial_reason=acceptance_criteria_not_met) + 5 deny-wrong-tier (all PASS, denial_reason=not_in_recent_tier) + 5 deny-invalid-target (all PASS, no row created) + 5 idempotent-replays (all PASS, no state side-effect) + 10 regression spots (5 store + 3 supersede + 1 search + 1 recall, all PASS).
- Resolves: **V2-018 deferral** — corroboration probe was deferred under V2-018 because workflow-native seeding of `corroboration_count >= 2` was not possible. V2-031 enabled it via `store_memory corroboration_count: 2`.
- Decision ledger: `V2-032` (CLOSED SUCCESS 2026-04-24).
- Gate rows: `MEMORY_V2_PHASE_GATES.md §ACCEPT-VIA-CORROBORATION-PROBE` ACVCP.0..ACVCP.6 all `done (2026-04-24)`.
- **Live workflow state post-ACCEPT-VIA-CORROBORATION-PROBE (historical checkpoint — superseded by V2-033):** `versionId=67cb8545-f1a0-40ab-b8f4-5bf5edd89328`, `nodeCount=49`, `connectionCount=67`, `active=true`. (Probe did not mutate; versionId matches end of V2-OBS-STORE-PREP-INPUT-PASSTHROUGH. Subsequently advanced by V2-033 to `c2273980-…`.)

## V2-OBS-STORE-PREP-EVIDENCE-VALIDATED-PASSTHROUGH — store-memory caller evidence_validated passthrough (CLOSED SUCCESS 2026-04-24)

- Mission brief + state: `docs/architecture/memory/v2/v2_obs_store_prep_evidence_validated_passthrough/{PACK_MANIFEST_READ_STATUS,DESIGN_FREEZE,LIVE_RESULTS_STEP1}.md`.
- Design freeze: `DESIGN_FREEZE.md` (2 modified nodes — `ME_Memory_Store_Prep.parameters.jsCode` + `ME_Memory_Store_DB.parameters.query` + `ME_Memory_Store_DB.parameters.options.queryReplacement`; **0 new nodes; 0 connection edits**; SQL slots 17 → 18 with new `$17::boolean` = evidence_validated; embedding shifts to `$18::vector(1536)` CASE-guard). V2-031 contract mirrored exactly for `evidence_validated` (strict boolean, safe-default `false` on omit or invalid type).
- Apply channel: V2-028 canonical agent-run local `n8n-patch.mjs replace`, single iteration `67cb8545 → c2273980-fb36-420d-bab9-b9fc3edcb2d9`.
- Mission oracles (direct checks, counted at natural cardinality): 50 unit + 14 diff-surface DS-INV + 50 live runtime EVR + 50 SQL invariants + 2 non-target regression (search, recall) = **166 GREEN / 166**. Not 200/200 — the DS-INV lane ships 14 invariants and the non-target regression lane ships 2, by design, not padded to 50.
- Live verification: 20 EVR-true rows persist `evidence_validated=true`; 10 EVR-false persist `false`; 5 EVR-omit safe-default `false`; 10 EVR-combo mirror caller; 3 idempotency replays hit ON CONFLICT DO NOTHING (original content preserved); 2 invalid-type (string "true", null) safe-default `false`. V2-031 fields (tier/user_confirmed/corroboration_count) preserved byte-identically.
- Pre-snapshot sha256 `bb63069396b347d2dea2f0bd83b25dd7bf37db39e81c9dd93759715a1e22cd43`; post-snapshot sha256 `b59d449e6e8af76bc6dab9668999d7d78406fe0c48e5e952435d9f7041658452`; Store_Prep jsCode sha256 `a6b3f774faa74da9048b103e77253b8bb7cee26717dd199bbceee52c83bf5d85`.
- Decision ledger: `V2-033` (CLOSED SUCCESS 2026-04-24).
- Gate rows: `MEMORY_V2_PHASE_GATES.md §V2-OBS-STORE-PREP-EVIDENCE-VALIDATED-PASSTHROUGH` EVPT.0..EVPT.9 all `done (2026-04-24)`.
- Resolves: the deferred `evidence_validated Store_Prep passthrough` follow-up previously listed as non-blocking after V2-031 closure. Enables Step 2 (V2-034 probe) which depends on workflow-native seeding of `evidence_validated=TRUE` rows.
- **Live workflow state post-V2-OBS-STORE-PREP-EVIDENCE-VALIDATED-PASSTHROUGH:** `versionId=c2273980-fb36-420d-bab9-b9fc3edcb2d9`, `nodeCount=49`, `connectionCount=67`, `active=true`. Subsequently used as baseline by ACCEPT-VIA-EVIDENCE-VALIDATED-PROBE (no further mutation).

## ACCEPT-VIA-EVIDENCE-VALIDATED-PROBE — promote acceptance via row.evidence_validated IS TRUE (CLOSED SUCCESS 2026-04-24)

- Mission brief + state: `docs/architecture/memory/v2/v2_obs_accept_via_evidence_validated_probe/{DESIGN_FREEZE_STEP2,LIVE_RESULTS_STEP2}.md`.
- **No workflow mutation**; mission was a probe enabled by V2-033 evidence_validated passthrough. The 5th accept disjunct in `ME_Memory_Promote_DB.parameters.query` — `OR (evidence_validated IS TRUE)` — has been frozen since V2-014 and was byte-identity-verified vs pre-Step-1 snapshot under PP-INV-2.
- Live proof: EVP-R-01 / exec `6453`: row `7bd7a188-f03d-4e30-ac68-7b9697c82d67` (evidence_validated=true, corroboration_count=1, user_confirmed=false, tier=recent) promoted to long_term with caller flags both false; `ME_Memory_Promote_Result` returns `acceptance_signals:['evidence_validated']`.
- Critical regression oracle: combo-45 (exec `6642`, row.ev=false, uc=true, cc=4, recent) → `acceptance_signals:['corroboration','user_confirmed']` — NO `evidence_validated` emitted when row state is false; Promote_Result correctly filters by `db.evidence_validated === true || row.evidence_validated === true`.
- Mission oracles (direct checks, counted at natural cardinality): 50 local probe + 14 PP-INV (incl. byte-identity hash check of Promote_Prep / _DB / _Result vs pre-Step-1 snapshot — all IDENTICAL) + 50 live runtime EVP + 50 SQL invariants = **164 GREEN / 164**.
- Live runtime breakdown: 20 accept_via_row_evidence (EVR-true-01..20 all promoted with `acceptance_signals:['evidence_validated']`) + 15 deny_without_signal (ev_probe_deny-21..35 all denied `acceptance_criteria_not_met`, tier unchanged) + 7 deny_wrong_tier (already-long_term rows all denied `not_in_recent_tier`, row state preserved) + 8 regression_signal_precedence (combo-42/45/46/49 + fresh combos — correct signal subset emitted per row state).
- Resolves: the deferred `accept-via-evidence_validated probe` follow-up enabled by V2-033. Jointly with V2-032, closes the 2-of-2 row-persisted accept routes (corroboration / evidence_validated).
- Decision ledger: `V2-034` (CLOSED SUCCESS 2026-04-24).
- Gate rows: `MEMORY_V2_PHASE_GATES.md §ACCEPT-VIA-EVIDENCE-VALIDATED-PROBE` AEVP.0..AEVP.6 all `done (2026-04-24)`.
- **Live workflow state post-ACCEPT-VIA-EVIDENCE-VALIDATED-PROBE (CURRENT LIVE STATE as of 2026-04-24):** `versionId=c2273980-fb36-420d-bab9-b9fc3edcb2d9`, `nodeCount=49`, `connectionCount=67`, `active=true`. (Probe did not mutate; versionId matches end of V2-033.)

## Combined V2-033 + V2-034 tally

**330 direct checks GREEN** (V2-033: 166 = 50+14+50+50+2 ; V2-034: 164 = 50+14+50+50). Do not cite as `200/200` or `400+`. Implicit row-state / idempotency / non-target-namespace confirmations exist additionally but are documented per-row in the LIVE_RESULTS tables and are not folded into this count.
