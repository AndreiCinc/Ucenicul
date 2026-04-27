# SESSION_HANDOFF_NEXT.md

> **Role (refreshed 2026-04-24 post-DOC-SYSTEM-COMPACTION):** this file is a **handoff pointer + operator context + audit trail**, not the primary source of current truth.
> - For current truth, read `docs/architecture/memory/v2/stabilization/CURRENT_TRUTH_POST_F5.md` first.
> - For writeback procedure, read `docs/architecture/memory/v2/stabilization/DOC_WRITEBACK_POLICY.md` (future closeouts do not duplicate the mission-local detail here).
> - Candidate lists in §G are support/context only, never a work queue. Active frontier must be stated as NONE unless a fresh operator directive opens one.
> - Future micro-mission closeouts should land only a **pointer + current versionId + one-line note** here, not a full wall-of-text summary.
>
> **Anti-drift pointer for fresh sessions (refreshed 2026-04-25 post-FINAL-MEMORY-CERTIFICATION-SMOKE / V2-039 — Memory 100% Pack Mission C CLOSED SUCCESS, `MEMORY_100_FOR_CURRENT_STAGE = TRUE`; 84/84 direct checks GREEN (34 runtime + 50 SQL); no workflow mutation during Mission C; live versionId unchanged at `9d1da628-f9fd-44dc-8f62-fda571a7bc23`; nodeCount=49 / connectionCount=67 / active=true; `memory_module v2` FORMALLY CLOSED STABLE under V2-036 and now certified ready for product integration; active frontier NONE; next frontier is project-level and requires fresh operator directive).**
> Read `docs/architecture/memory/v2/stabilization/CURRENT_TRUTH_POST_F5.md` and `docs/architecture/memory/v2/stabilization/AUTHORITY_AND_READ_ORDER.md` before interpreting this file. §B is a **historical** v1 record (any versionId inside §B is a v1-era record, not current truth). §D's "F5 resumption — historical path menu" is **retired** audit material (see V2-025). §G.2's candidate list is not a work queue — all missions are currently CLOSED; only follow-ups remain, none of which is authorised without a fresh operator directive. **2026-04-24 F6A-FOLLOWUP closeout (V2-030):** supersede-lane embedding producer shipped to live `WF-ME-01` via the V2-028 canonical agent-run channel; lineage `c07fe923 → 13e8e767`; nodeCount `47 → 49`; connectionCount `65 → 67`; 52/52 case oracles met (31 local + 6 live + 8 DB + 7 preflight); retires SCOPE-OBS-1 from F6A. Path 5 stays retired (V2-025) and survives only as the V2-026 escape hatch. `v2/stabilization/HISTORICAL_VS_CURRENT.md` labels every section of this file as CURRENT / SUPPORT / HISTORICAL. Any `b8e2f194-…`, `279a8628-…`, `96962424-…`, or `c07fe923-…` string inside this file refers to a prior frozen state (F5 close / V2-014 close / V2-OBS close / F6A close respectively) and must NOT be treated as the current live versionId.

## A. Current execution truth

- current phase (v1): **FULLY CLOSED — live rollout completed 2026-04-21**
- current phase (v2): **FORMALLY CLOSED STABLE 2026-04-25 (V2-036).** All 15 frontiers closed SUCCESS — F2/F2b/F4/F5 closed 2026-04-21; F3 first-batch closed 2026-04-21; F3.1 Stage C closed SUCCESS 2026-04-22T14:30Z; V2-014 closed 2026-04-22T15:30Z; V2-OBS-RA-AGGREGATION closed 2026-04-22; F6A closed 2026-04-23; F6A-FOLLOWUP-SUPERSEDE-EMBED closed 2026-04-24; V2-OBS-STORE-PREP-INPUT-PASSTHROUGH + ACCEPT-VIA-CORROBORATION-PROBE closed 2026-04-24 (V2-031/V2-032); V2-OBS-STORE-PREP-EVIDENCE-VALIDATED-PASSTHROUGH closed SUCCESS 2026-04-24 (V2-033); ACCEPT-VIA-EVIDENCE-VALIDATED-PROBE closed SUCCESS 2026-04-24 (V2-034); DOC-SYSTEM-COMPACTION-ROLLOUT-CHANNEL-ALIGNMENT closed 2026-04-25 (V2-035); FORMAL-MEMORY-V2-MISSION-CLOSE closed 2026-04-25 (V2-036). Live WF-ME-01 versionId `c2273980-fb36-420d-bab9-b9fc3edcb2d9`; nodeCount=49; connectionCount=67; active=true. Active frontier: **NONE**. No new mission authorized without fresh operator directive.
- last phase fully closed: **V2-OBS-STORE-PREP-EVIDENCE-VALIDATED-PASSTHROUGH + ACCEPT-VIA-EVIDENCE-VALIDATED-PROBE** (2026-04-24, 2-step pack).
  - **Step 1 — V2-OBS-STORE-PREP-EVIDENCE-VALIDATED-PASSTHROUGH** (V2-033, CLOSED SUCCESS): extends V2-031 by adding the 4th promotion-signal field `evidence_validated` to the Store_Prep → Store_DB seam (strict boolean, safe-default `false`, mirroring V2-031 `user_confirmed` contract). `ME_Memory_Store_Prep.parameters.jsCode` +1 extraction + `__db.evidence_validated` key; `ME_Memory_Store_DB.parameters.query` binds `$17 → $18` (new `$17::boolean` = evidence_validated; embedding shifts to `$18::vector(1536)` CASE-guard); `queryReplacement` grows 17 → 18 slots in both branches. **0 new nodes; 0 connection edits; non-target byte-identical.** Single V2-028 apply: `67cb8545 → c2273980`. **166 direct checks** (50 unit + 14 DS-INV + 50 live runtime EVR + 50 SQL + 2 non-target regression). Live verification: 20 true / 10 false / 5 omit / 10 combo / 3 idempotency / 2 invalid-type all behave per V2-031-symmetric contract. Final post-snapshot sha256 `b59d449e6e8af76bc6dab9668999d7d78406fe0c48e5e952435d9f7041658452`; Store_Prep jsCode sha256 `a6b3f774faa74da9048b103e77253b8bb7cee26717dd199bbceee52c83bf5d85`. Closure anchor: `docs/architecture/memory/v2/v2_obs_store_prep_evidence_validated_passthrough/{DESIGN_FREEZE,LIVE_RESULTS_STEP1}.md`.
  - **Step 2 — ACCEPT-VIA-EVIDENCE-VALIDATED-PROBE** (V2-034, CLOSED SUCCESS): **no workflow mutation**; probe-only enabled by Step 1 evidence_validated passthrough. **164 direct checks** (50 local + 14 PP-INV incl. hash byte-identity of Promote lane + 50 live runtime EVP + 50 SQL). **Live proof: exec 6453** returns `acceptance_signals:['evidence_validated']` from `ME_Memory_Promote_Result` for row `7bd7a188-…` (evidence_validated=true row-persisted, uc=false, cc=1, caller flags both false); row tier flips `recent → long_term`. Critical regression oracle: combo-45 (row.ev=false, uc=true, cc=4) → `acceptance_signals:['corroboration','user_confirmed']` — NO `evidence_validated` emitted when row state false. 20/20 EVR-true accept, 15/15 deny_without_signal, 7/7 deny_wrong_tier all confirm. Closure anchor: `docs/architecture/memory/v2/v2_obs_accept_via_evidence_validated_probe/{DESIGN_FREEZE_STEP2,LIVE_RESULTS_STEP2}.md`.
  - Prior V2-031 + V2-032 + F6A-FOLLOWUP + F6A + V2-OBS + V2-014 + F3.1 + F5 closures remain frozen.
- next executable frontier: **NONE**. All opened missions closed SUCCESS. Candidate follow-ups (require fresh operator directive to open): `V2-OBS-RECALL-SUMMARY-STRING`, `ivfflat` retrain policy, sub-A (sandbox egress widening) / sub-B (MCP `patch_workflow_nodes` settings-whitelist filter), formal v2 mission-close.
- authoritative closeout artefact (v1): `docs/architecture/memory/MODULE_CLOSEOUT.md`
- authoritative state artefacts (v2): `MEMORY_V2_STATE.md`, `MEMORY_V2_PHASE_GATES.md`, `MEMORY_V2_BUG_LEDGER.md`, `MEMORY_V2_DECISION_LEDGER.md`, `MEMORY_V2_F5_OPERATOR_DECISION_20260421.md`, `WORK_LOG_MEMORY_V2_F5.md`

## Canonical apply channel policy

**Current rule (V2-028, 2026-04-23):** **Autonomous agent-run local `n8n-patch` pack.** The agent in the Cowork sandbox runs the CLI directly:

```bash
node .claude/pipelines/ucenicul-pipeline/notes/tools/n8n-patch/n8n-patch.mjs \
  <replace|patch-node> uq26nh1grIpnHju0 …
```

Credential source: the pack's local `.env` (never read into chat/docs). MCP is reserved for read/verify/analysis/smoke/SELECT. `mcp__n8n__patch_workflow_nodes` stays non-canonical for `WF-ME-01` while sub-B (settings-whitelist filter) is unfixed. Protocol doc: `docs/architecture/memory/v2/ops/protocol_agent_run_local_patch.md`. The CLI still filters `settings` via n8n's OpenAPI whitelist (ref n8n-io/n8n#19587), writes `.audit.jsonl`, and maintains a coherent versionId lineage.

**Prior rule (V2-025, 2026-04-21) — superseded on apply-ownership 2026-04-23.** Operator-run CLI with the agent preparing artefacts and the human running the command from their laptop. Retained as audit-trail record at `docs/architecture/memory/v2/ops/protocol_operator_run_cli.md`. Do not invoke for new work.

**Last-resort DB-bypass (V2-026, unchanged).** Direct UPDATE on `public.workflow_entity` via `mcp__postgres__execute_sql` survives as a documented exception (not a default) under 8 conditions:

1. Confirm the local `n8n-patch` pack is provably unreachable (one probe).
2. Confirm `mcp__n8n__patch_workflow_nodes` still fails sub-B (settings-whitelist) or the node-scoped-assignTop defect (V2-022).
3. Preserve all `settings` keys except those n8n's PUT validator rejects. In particular: strip `timeSavedMode` if present; **`availableInMCP` MUST be preserved** (required by the MCP executor).
4. Byte-verify every non-target node pre/post.
5. Run full smoke matrix.
6. Rollback on any anomaly.
7. Write a new DIVERGENCE entry per rollout documenting why the DB-bypass was used.
8. This is not a general precedent — it's a documented exception, not a new default.

*Relationship between V2-025 / V2-026 / V2-028:* V2-025 retired Path 5 as a default and opened the operator-run CLI protocol. V2-026 preserved Path 5 as a narrow, condition-gated escape hatch. V2-028 supersedes the apply-ownership clause of V2-025 (operator → agent), preserves Path 5's retirement, preserves V2-026's escape-hatch conditions, and points the canonical protocol at `protocol_agent_run_local_patch.md`. Frozen artefacts for F5 / V2-014 / V2-OBS / F3.1 Stage C are untouched.

## B. Rollout outcome (v1, 2026-04-20)

> **Historical v1 record only.** This section describes the **v1** rollout (2026-04-20, `versionId=da6d2573-…`). For the current live state see §A and §H — as of 2026-04-24 post-V2-OBS-STORE-PREP-EVIDENCE-VALIDATED-PASSTHROUGH + ACCEPT-VIA-EVIDENCE-VALIDATED-PROBE (V2-033/V2-034) the current live state is `versionId=c2273980-fb36-420d-bab9-b9fc3edcb2d9` (49 nodes / 67 connections). All versionId strings below this line in §B are v1-era snapshots preserved as historical record; do not treat them as current.

Executed autonomously by continuator agent per user directive. Canonical channel only (no MCP mutations).

| Step | Result |
|---|---|
| 1. pre-apply snapshot | `patches/wf_me_01_live_snapshot_pre_rollout.json` (125 KB) |
| 2. `n8n-patch deactivate uq26nh1grIpnHju0` | ok |
| 3. `n8n-patch replace uq26nh1grIpnHju0 patches/wf_me_01_post_patch_20260420.json` | 200 — before_hash `0a5b620345b4` / after_hash `4524b8777c4a` |
| 4. `n8n-patch activate uq26nh1grIpnHju0` | ok |
| 5. `mcp__n8n__verify_workflow` (read-only) | 7/7 pass |
| 6. evidence update | `patches/apply_evidence_20260420.md §Post-apply record` filled + audit tail verbatim |
| 7. closeout update | `MODULE_CLOSEOUT.md §1, §4, §8` rewritten; `DIVERGENCE_REGISTER_MEMORY.md` D-M-009 closed |
| 8. state update | this file + `IMPLEMENTATION_STATE.md` + `PHASE_GATE_CHECKLIST.md` |

Post-v1-rollout snapshot (2026-04-20, superseded by v2 patches F2/F2b/F4/F5):
```
nodeCount=43  connectionCount=61  switch.rules=5  active=true
versionId=da6d2573-ed85-4f1f-8c54-693364f9a432  updatedAt=2026-04-20T21:30:40.729Z
```
All 5 canonical memory actions landed live at this point (`store_memory`, `search_memory`, `recall_memory`, `promote_memory`, `supersede_memory`). Each `*_DB` node is `n8n-nodes-base.postgres` / `executeQuery`. Historical checkpoints following v2 rollouts — F2/F2b/F4/F5 closed at `versionId=b8e2f194-…`, V2-014 closed at `versionId=279a8628-…`, V2-OBS closed at `versionId=96962424-…`, F6A closed at `versionId=c07fe923-…`, F6A-FOLLOWUP closed at `versionId=13e8e767-…`, V2-031 hot-fix closed at `versionId=67cb8545-…`; **current live versionId post-V2-OBS-STORE-PREP-EVIDENCE-VALIDATED-PASSTHROUGH (V2-033) is `c2273980-fb36-420d-bab9-b9fc3edcb2d9`** (49 nodes / 67 connections; V2-034 probe-only did not advance versionId) — see §A and §H.

## C. Saved artefacts — current

| Path | Status |
|---|---|
| `docs/architecture/memory/MODULE_CLOSEOUT.md` | updated 2026-04-21 (post-rollout) — authoritative close-out |
| `docs/architecture/memory/DIVERGENCE_REGISTER_MEMORY.md` | D-M-009 closed |
| `docs/architecture/memory/PHASE_GATE_CHECKLIST.md` | rollout row added |
| `docs/architecture/memory/IMPLEMENTATION_STATE.md` | live rollout entry added |
| `docs/architecture/memory/N8N_PATCH_PREFLIGHT.md` | preflight verdict `READY_FOR_CANONICAL_ROLLOUT` (archival) |
| `docs/architecture/memory/patches/apply_evidence_20260420.md` | §Post-apply record filled + audit tail |
| `docs/architecture/memory/patches/wf_me_01_live_snapshot_pre_rollout.json` | pre-rollout live snapshot |
| `.claude/pipelines/ucenicul-pipeline/notes/tools/n8n-patch/snapshots/uq26nh1grIpnHju0_{before,after}_2026-04-20T21-30-41-*.json` | CLI-written snapshots |
| all other 2026-04-20 artefacts | frozen unchanged |

## D. Open executable frontier

**None on v1.** v1 is fully closed.

v2 status as of 2026-04-21:
- **F2 (semantic search leg)** — closed via D-M-011/D-M-012; producer + hybrid SQL live (`versionId f7f3e982 → fc43f6bc` lineage).
- **F3 first-batch** — closed; 4 family-batches (search/recall/supersede/promote) frozen in `tests/results/family_batch_*_20260421.md`. **F3.1 walker/sidecar** mission CLOSED `SUCCESS` 2026-04-22T14:30Z (Stage C): 150-case matrix + harness committed under `docs/architecture/memory/v2/f3_1/`; all 150 cases executed against live WF-ME-01 (versionId `b8e2f194`); 149 PASS; 1 FAIL classified `BAD_TEST_DEFINITION` for deferred V2-014 (promote case 012); 0 RUNTIME_WORKFLOW_BUG; 11 fixes logged (F31-FIX-001..F31-FIX-011 in `F31_FIX_LOG.md`); 4 deferred follow-ups handed off. Prior `PARTIAL_SUCCESS_WITH_EVIDENCE` interim is superseded. Anchor: `F31_STATE.json` + `F31_FINAL_STATUS.md`.
- **F4 (promote denial vocabulary)** — closed via D-M-013; `versionId fc43f6bc-…`. F3 batch added accept-via-evidence_validated coverage.
- **F5 (subjective-guard multi-language)** — **CLOSED 2026-04-21** via D-M-014 (Postgres direct UPDATE; new channel). versionId `fc43f6bc → b8e2f194-0263-46d9-8306-1534cc7c31fe`. Both Prep nodes' jsCode byte-identical to F5 payloads; 43 non-Prep nodes zero structural drift; smoke 7/7 PASS (execs 1626/1635/1644/1646/1655/1664/1666); DB invariant held. See `CLOSURE_REPORT_MEMORY_V2_F5.md`, `v2/f5/apply_evidence_f5_20260421.md`.

### F5 resumption — historical path menu (no longer relevant)

*F5 is CLOSED. The three-path menu below is preserved for audit trail and future-operator reference only. The canonical CLI + MCP PUT paths are both still structurally blocked from this sandbox; F5 landed via Path 5 (Postgres direct UPDATE — see D-M-014 in `DIVERGENCE_REGISTER_MEMORY.md`).*

> **Retired — D-M-014 scoped to F5 only, see V2-025.** Per operator directive 2026-04-21 and decision ledger `V2-025`, **Path 5 is retired** as a rollout channel. ~~Future structural patches follow the **operator-run CLI protocol** frozen in `v2/ops/protocol_operator_run_cli.md`.~~ **[SUPERSEDED 2026-04-23 by V2-028: canonical channel is now `protocol_agent_run_local_patch.md`, not operator-run CLI. Path 5 retirement remains in force.]** Path 3 (scope-broadening MCP apply) is also off the table. Do not reopen Path 5 or Path 3 without a fresh operator-authorized DIVERGENCE.

**Path 1 — preferred: canonical CLI from egress-enabled env.** Zero code changes required. All payloads sha256-pinned; envelopes and oracles pre-written.

1. Confirm egress to `n8n-production-d688.up.railway.app` from execution env.
2. Verify sha256 of params JSONs:
   - `30450a28fa40dd8fdf0ad5f35b8f83fa294c02ce8c2fdcb884d6bdd5fd0224c0  docs/architecture/memory/v2/f5/artifacts/patchF5_store_prep_params.json`
   - `7432fc26ecf67d0682c88ca0c8c78090d93b833d1214f0200851e152753a044d  docs/architecture/memory/v2/f5/artifacts/patchF5_supersede_prep_params.json`
3. Apply via canonical CLI:
   ```bash
   node .claude/pipelines/ucenicul-pipeline/notes/tools/n8n-patch/n8n-patch.mjs \
     patch-node uq26nh1grIpnHju0 ME_Memory_Store_Prep \
     --params docs/architecture/memory/v2/f5/artifacts/patchF5_store_prep_params.json
   node .claude/pipelines/ucenicul-pipeline/notes/tools/n8n-patch/n8n-patch.mjs \
     patch-node uq26nh1grIpnHju0 ME_Memory_Supersede_Prep \
     --params docs/architecture/memory/v2/f5/artifacts/patchF5_supersede_prep_params.json
   ```
4. `mcp__n8n__verify_workflow` expecting `nodeCount=45`, `connectionCount=63`, both Prep-node jsCode bodies containing `SUBJECTIVE_RO`, `SUBJECTIVE_EN`, `LOCALE_LISTS`, `SUPPORTED_LOCALES`, and the locale-fallback literal `SUPPORTED_LOCALES.includes(normLocale) ? normLocale : 'ro'`. All six v1 RO regexes must still appear verbatim.
5. Run the seven smoke cases (F5-1 … F5-7) via `mcp__f2e8be41__execute_workflow`. Envelopes in `WORK_LOG_MEMORY_V2_F5.md` and in `BLOCKED_REPORT_MEMORY_V2_F5_20260421.md` §3.4. Capture exec ids; store raw JSON per run at `docs/architecture/memory/v2/f5/artifacts/runtime/exec_f5_<case>_<execId>.raw.json`.
6. DB invariant: `SELECT id, memory_type, category, tier, idempotency_key FROM memory_items WHERE idempotency_key LIKE 'store_memory:d4f82a41-01cd-4fb7-9d70-573557348e74:mem-smoke-v2f5-%' ORDER BY created_at;` must return exactly two rows (F5-3 as `observation`, F5-6 as `fact`). Cases 1/2/4/5/7 must produce no row.
7. On all-green: write `v2/f5/apply_evidence_f5_20260421.md` + `CLOSURE_REPORT_MEMORY_V2_F5.md`; flip F5.1/F5.2 gates to `done`; resolve `BLOCKER-V2-F5-01` (both sub-blockers — sub-A conditionally, sub-B still logged as an MCP tool bug for future); update `MEMORY_V2_STATE.md` `active frontier` to `(none; v2 closeout candidate)`; add a pointer in `MEMORY_V2_CLOSEOUT.md`.
8. On any smoke failure: stop, revert both Prep nodes to v1 jsCode via the captured `prep_me_memory_*_prep_pre_f5.js` baselines (rollback commands in `BLOCKED_REPORT_MEMORY_V2_F5_20260421.md` §3.7), log a new bug under `MEMORY_V2_BUG_LEDGER.md`, and hand control back.

**Path 2 — MCP tool side-fix, then retry MCP apply in-session.** Fix `mcp__n8n__patch_workflow_nodes` to apply the same `settings`-whitelist filter as `n8n-patch.mjs` (drop `availableInMCP`, `timeSavedMode`, and any property outside n8n's PUT OpenAPI schema before PUT). Then a fresh session can apply the same `patchSpec` that hit the 400 today. This fix is one-line (filter the `settings` object before including it in the PUT body).

**Path 3 — scope-broadening MCP apply (explicit operator authorization required).** Single MCP `patch_workflow_nodes` per node with combined `patchSpec.set.parameters = {jsCode: …}` AND `patchSpec.assignTop.settings = {executionOrder:"v1", binaryMode:"separate", callerPolicy:"workflowsFromSameOwner"}`. Result: jsCode lands AND `availableInMCP`/`timeSavedMode` silently stripped from live `settings`. Must be logged as deliberate scope broadening (new DIVERGENCE + pre/post settings snapshot). Do not take this path without the operator saying "authorize settings-strip" or equivalent explicit.

v2 follow-ups still open (deferred from `final_verification.md §Known limitations / v2 follow-ups` + F3.1 Stage C + F6A closure handoffs):
- ~~V2-014~~ **CLOSED 2026-04-22T15:30Z** — row-persisted `user_confirmed` OR caller acceptance; primary proof `f31-promote-012` re-PASSes; see `docs/architecture/memory/v2/v2_014/V2_014_FINAL_STATUS.md`;
- ~~V2-OBS-RA-AGGREGATION-DOMAIN-WRITE-GATE~~ **CLOSED 2026-04-22** — `ME_Build_RA_Envelope` success branch emits `domain_writes_performed: false` unconditionally; 50/50 local PASS + 50/50 E2E PASS; versionId `279a8628 → 96962424`; see `docs/architecture/memory/v2/v2_obs_ra_aggregation_domain_write_gate/V2_OBS_RA_AGGREGATION_DOMAIN_WRITE_GATE_FINAL_STATUS.md`;
- ~~store-path embedding producer~~ **CLOSED 2026-04-23 as F6A** — store leg now emits `embedding vector(1536)`; 41/41 local + 28/28 live = 69/69 oracles; versionId `96962424 → c07fe923`; see `docs/architecture/memory/v2/f6a/F6A_RECONCILIATION.md` + V2-029;
- ~~F6A-FOLLOWUP-SUPERSEDE-EMBED~~ **CLOSED 2026-04-24** — supersede leg now emits `embedding vector(1536)` for replacement rows; 31/31 local + 6/6 live + 8/8 DB = 52/52 oracles; versionId `c07fe923 → 13e8e767`; see `docs/architecture/memory/v2/f6a_followup_supersede_embed/F6A_FOLLOWUP_SUPERSEDE_EMBED_RECONCILIATION.md` + V2-030;
- ~~V2-OBS-STORE-PREP-INPUT-PASSTHROUGH~~ **CLOSED 2026-04-24** — Store_Prep + Store_DB pass caller `tier`/`user_confirmed`/`corroboration_count` through to DB; SQL slots 14 → 17; lineage `13e8e767 → 0bf42f1b → 67cb8545`; 50 SPU + 50 SPE + 50 SPI = 150/150 oracles; see `docs/architecture/memory/v2/v2_obs_store_prep_input_passthrough/{DESIGN_FREEZE,LIVE_RESULTS,APPLY_EVIDENCE_20260424}.md` + V2-031;
- ~~accept-via-corroboration acceptance-signal probe~~ **CLOSED 2026-04-24** — accept-via-corroboration proven live (`acceptance_signals:['corroboration']`); no workflow mutation; 50 CPU + 50 CPE + 50 CPI = 150/150 oracles; resolves V2-018 deferral; see `docs/architecture/memory/v2/accept_via_corroboration_probe/{PROBE_FREEZE,LOCAL_RESULTS,LIVE_RESULTS}.md` + V2-032.
- ~~V2-OBS-STORE-PREP-EVIDENCE-VALIDATED-PASSTHROUGH~~ **CLOSED 2026-04-24** — Store_Prep + Store_DB pass caller `evidence_validated` through to DB (V2-031-symmetric); SQL slots 17 → 18; lineage `67cb8545 → c2273980-fb36-420d-bab9-b9fc3edcb2d9`; 166 direct checks (50 unit + 14 DS-INV + 50 live + 50 SQL + 2 regression); see `docs/architecture/memory/v2/v2_obs_store_prep_evidence_validated_passthrough/{DESIGN_FREEZE,LIVE_RESULTS_STEP1}.md` + V2-033.
- ~~accept-via-evidence_validated acceptance-signal probe~~ **CLOSED 2026-04-24** — accept-via-evidence_validated proven live (`acceptance_signals:['evidence_validated']` exec 6453); no workflow mutation; 164 direct checks (50 local + 14 PP-INV + 50 live + 50 SQL); see `docs/architecture/memory/v2/v2_obs_accept_via_evidence_validated_probe/{DESIGN_FREEZE_STEP2,LIVE_RESULTS_STEP2}.md` + V2-034.

Open follow-ups (real, not closed):

- V2-OBS-RECALL-SUMMARY-STRING (cosmetic "1 rows" on zero-match);
- V2-OBS-MEMORY-PREP-INPUT-SHAPE (supersede `replacement:{}` nesting / promote `tier` vs `promotion_target` historical observations from V2-OBS E2E);
<!-- evidence_validated Store_Prep passthrough — CLOSED 2026-04-24 as V2-033; removed from candidate follow-ups -->
- `idempotency_key_prefix` module-input nicety;
- `ivfflat` lists retraining after ~10^5 rows (F6A-X-03; forbidden inside F6A scope, still an open operational concern for the corpus);
- sub-A (sandbox egress widening) — non-blocking post-V2-028;
- sub-B (MCP `patch_workflow_nodes` settings-whitelist filter) — one-line MCP server fix;
- multi-workflow connector assertion (if v2 splits search into a sub-workflow);
- full-workflow smoke run post-PUT added to `FINAL_TEST_AND_E2E_SUMMARY`;
- formal v2 mission-close.

Each v2 follow-up should be treated as a fresh mission with its own freeze cycle; do not modify v1 frozen artefacts without a new DIVERGENCE entry.

## E. Frozen boundaries

All v1 artefacts are frozen as of 2026-04-21:
- design / contracts / schema / migration / patch / walker / verification — unchanged since 2026-04-20 freezes.
- live `memory_items` table — additive, in use by production WF-ME-01.
- v1-frozen `WF-ME-01` snapshot (taken at v1 rollout, 2026-04-20) — `versionId=da6d2573-ed85-4f1f-8c54-693364f9a432`, 43 nodes, 5-rule switch. **Current live state is `versionId=c2273980-fb36-420d-bab9-b9fc3edcb2d9` (49 nodes / 67 connections, active=true)** after v2 F2/F2b/F4/F5 + V2-014 + V2-OBS-RA-AGGREGATION-DOMAIN-WRITE-GATE + F6A + F6A-FOLLOWUP-SUPERSEDE-EMBED + V2-OBS-STORE-PREP-INPUT-PASSTHROUGH + V2-OBS-STORE-PREP-EVIDENCE-VALIDATED-PASSTHROUGH — see §A. V2-034 (ACCEPT-VIA-EVIDENCE-VALIDATED-PROBE) was probe-only, no workflow mutation, so versionId remains `c2273980-…` post-V2-034.
- `n8n-patch` snapshots — before/after pair archived for rollback.

## F. Rollback path (only if production regression surfaces)

```bash
node .claude/pipelines/ucenicul-pipeline/notes/tools/n8n-patch/n8n-patch.mjs \
     replace uq26nh1grIpnHju0 \
     docs/architecture/memory/patches/wf_me_01_pre_patch_20260420.json \
     --reactivate
```

No DB rollback needed — `memory_items` is additive. Any rows written via the new live actions simply become unreferenced if the workflow is reverted; they remain in the table for future forward-rollouts.

## G. First instruction for next session

1. Read `docs/architecture/memory/v2/stabilization/CURRENT_TRUTH_POST_F5.md` first (single front door — upgraded 2026-04-24 to cover F5 + F6A + F6A-FOLLOWUP + V2-OBS-STORE-PREP-INPUT-PASSTHROUGH + ACCEPT-VIA-CORROBORATION-PROBE + V2-OBS-STORE-PREP-EVIDENCE-VALIDATED-PASSTHROUGH + ACCEPT-VIA-EVIDENCE-VALIDATED-PROBE), then `MODULE_CLOSEOUT.md` (v1 truth), `MEMORY_V2_STATE.md` (v2 truth), `CLOSURE_REPORT_MEMORY_V2_F5.md`, and closure anchors for V2-OBS-RA-AGGREGATION-DOMAIN-WRITE-GATE / F6A / F6A-FOLLOWUP / V2-OBS-STORE-PREP-INPUT-PASSTHROUGH / ACCEPT-VIA-CORROBORATION-PROBE / V2-OBS-STORE-PREP-EVIDENCE-VALIDATED-PASSTHROUGH / ACCEPT-VIA-EVIDENCE-VALIDATED-PROBE. Live `WF-ME-01` is at `versionId c2273980-fb36-420d-bab9-b9fc3edcb2d9` (full lineage `da6d2573 → c4a3b0d1 → 7455992c → f7f3e982 → fc43f6bc → b8e2f194 → 279a8628 → 96962424 → c07fe923 → 13e8e767 → 0bf42f1b → 67cb8545 → c2273980`).
2. v2 has **no open frontier**. Most-recent closures (per ledger): V2-OBS-STORE-PREP-INPUT-PASSTHROUGH **CLOSED SUCCESS 2026-04-24 (V2-031)** + ACCEPT-VIA-CORROBORATION-PROBE **CLOSED SUCCESS 2026-04-24 (V2-032)**, both 150/150 oracles. Earlier closures (chronological): F6A-FOLLOWUP-SUPERSEDE-EMBED 2026-04-24 (V2-030); F6A-STORE-PATH-EMBEDDING-PRODUCER 2026-04-23 (V2-029); V2-OBS-RA-AGGREGATION-DOMAIN-WRITE-GATE 2026-04-22 (V2-027); V2-014 2026-04-22T15:30Z; F3.1 Stage C 2026-04-22T14:30Z; F5 2026-04-21. Non-blocking candidate missions (not authorized without a fresh operator directive):
   - ~~**V2-014**~~ **CLOSED 2026-04-22T15:30Z** — row-persisted `user_confirmed` OR caller acceptance in promote acceptance. Anchor: `docs/architecture/memory/v2/v2_014/V2_014_FINAL_STATUS.md`.
   - ~~**V2-OBS-RA-AGGREGATION-DOMAIN-WRITE-GATE**~~ **CLOSED 2026-04-22** — `ME_Build_RA_Envelope` success branch emits `domain_writes_performed: false` unconditionally. Anchor: `docs/architecture/memory/v2/v2_obs_ra_aggregation_domain_write_gate/V2_OBS_RA_AGGREGATION_DOMAIN_WRITE_GATE_FINAL_STATUS.md`.
   - ~~**Store-path embedding producer**~~ **CLOSED 2026-04-23 as F6A** — store leg now emits `embedding vector(1536)` for new rows. Anchor: `docs/architecture/memory/v2/f6a/F6A_RECONCILIATION.md`.
   - ~~**F6A-FOLLOWUP-SUPERSEDE-EMBED**~~ **CLOSED 2026-04-24** — supersede-lane now inserts replacement rows with `embedding vector(1536)`; SCOPE-OBS-1 retired. Anchor: `docs/architecture/memory/v2/f6a_followup_supersede_embed/F6A_FOLLOWUP_SUPERSEDE_EMBED_RECONCILIATION.md`.
   - ~~**V2-OBS-STORE-PREP-INPUT-PASSTHROUGH**~~ **CLOSED 2026-04-24 (V2-031)** — Store_Prep + Store_DB now passthrough caller `tier`/`user_confirmed`/`corroboration_count`; SQL slots 14 → 17; lineage `13e8e767 → 0bf42f1b → 67cb8545` (initial + hot-fix `corroboration_count >=0 → >=1`); 150/150 oracles. Anchor: `docs/architecture/memory/v2/v2_obs_store_prep_input_passthrough/{DESIGN_FREEZE,APPLY_EVIDENCE_20260424,LIVE_RESULTS}.md`.
   - ~~**ACCEPT-VIA-CORROBORATION-PROBE**~~ **CLOSED 2026-04-24 (V2-032)** — accept-via-corroboration proven live (`acceptance_signals:['corroboration']`, exec 5541); no workflow mutation; 150/150 oracles; resolves V2-018 deferral. Anchor: `docs/architecture/memory/v2/accept_via_corroboration_probe/{PROBE_FREEZE,LOCAL_RESULTS,LIVE_RESULTS}.md`.
   - **V2-OBS-RECALL-SUMMARY-STRING** — cosmetic "1 rows" on zero-match. Non-blocking.
   - ~~**`evidence_validated` Store_Prep passthrough**~~ **CLOSED 2026-04-24 as V2-033** — symmetric to V2-031; 166 direct checks; lineage `67cb8545 → c2273980`. Anchor: `docs/architecture/memory/v2/v2_obs_store_prep_evidence_validated_passthrough/`.
   - **`ivfflat` retrain policy** — operational concern at scale.
   - **MCP tool bug** (`patch_workflow_nodes` settings-whitelist filter) — one-line fix; not on critical path.
   - **Sandbox egress widening** for `n8n-production-d688.up.railway.app` — infra ticket (no longer load-bearing post-V2-028).
   - **Multi-workflow connector assertion** — if v2 splits search into a sub-workflow.
   - **Formal v2 mission-close** — when remaining non-blocking follow-ups are explicitly waived or resolved.
3. Channel-selection policy reminder (unchanged 2026-04-23): **canonical rollout channel is the autonomous agent-run local `n8n-patch` pack** (`docs/architecture/memory/v2/ops/protocol_agent_run_local_patch.md`, per `V2-028` in `MEMORY_V2_DECISION_LEDGER.md`). Agent runs `n8n-patch.mjs <replace|patch-node> uq26nh1grIpnHju0 …` directly via `Bash` from the Cowork sandbox, using the pack's local `.env`; MCP is reserved for read/verify/analysis/smoke/SELECT. F6A Phase 6 apply used this channel end-to-end (V2-029). V2-025's operator-run CLI protocol is superseded on the apply-ownership clause and retained at `protocol_operator_run_cli.md` for audit only. **Path 5 (Postgres direct UPDATE on `workflow_entity`) is retired as a default — D-M-014 scoped to F5 only, see V2-025; preserved only as the V2-026 escape hatch under 8 conditions.** Do not reuse Path 5 for new structural changes outside those conditions. MCP `patch_workflow_nodes` remains blocked for WF-ME-01 until sub-B (settings-whitelist filter) is fixed. Sub-A (sandbox egress allowlist) is no longer load-bearing: the local `n8n-patch` pack's own `fetch` has demonstrated operational egress for V2-014 + V2-OBS + F6A closures.
4. If a production regression is reported: confirm no unexpected mutation since the latest closed apply (**current live `versionId=c2273980-…`** — post-V2-OBS-STORE-PREP-EVIDENCE-VALIDATED-PASSTHROUGH apply 2026-04-24 / V2-033; prior frozen checkpoints are F5 at `b8e2f194-…`, V2-014 at `279a8628-…`, V2-OBS at `96962424-…`, F6A at `c07fe923-…`, F6A-FOLLOWUP at `13e8e767-…`, V2-OBS-STORE-PREP-INPUT-PASSTHROUGH initial at `0bf42f1b-…`, V2-031 hot-fix at `67cb8545-…`), then rollback via F. V2-034 was probe-only (no versionId advance). Do not attempt surgical node-level patches through MCP `patch_workflow_nodes` — proven structurally incapable (V2-022).
5. Do not modify v1 frozen artefacts without a new DIVERGENCE entry; do not modify F2/F2b/F4/F5/V2-014/V2-OBS/F6A closed-out artefacts either; do not rebuild F5 or F6A payloads.

## H. Closing assertion

**`memory_module v1` FULLY CLOSED — live rollout completed.**
**`memory_module v2` FORMALLY CLOSED STABLE 2026-04-25 (V2-036).** F2 + F2b + F4 + F5 + V2-014 + V2-OBS-RA-AGGREGATION-DOMAIN-WRITE-GATE + F6A + F6A-FOLLOWUP-SUPERSEDE-EMBED + V2-OBS-STORE-PREP-INPUT-PASSTHROUGH + ACCEPT-VIA-CORROBORATION-PROBE + V2-OBS-STORE-PREP-EVIDENCE-VALIDATED-PASSTHROUGH + ACCEPT-VIA-EVIDENCE-VALIDATED-PROBE LIVE. F3 first-batch complete. F3.1 Stage C CLOSED SUCCESS. V2-OBS-STORE-PREP-INPUT-PASSTHROUGH CLOSED SUCCESS 2026-04-24 (V2-031); ACCEPT-VIA-CORROBORATION-PROBE CLOSED SUCCESS 2026-04-24 (V2-032); **V2-OBS-STORE-PREP-EVIDENCE-VALIDATED-PASSTHROUGH CLOSED SUCCESS 2026-04-24 (V2-033), 166 direct checks GREEN (50 unit + 14 DS-INV + 50 live runtime EVR + 50 SQL + 2 non-target regression); ACCEPT-VIA-EVIDENCE-VALIDATED-PROBE CLOSED SUCCESS 2026-04-24 (V2-034), probe-only, 164 direct checks GREEN (50 local + 14 PP-INV incl. Promote-lane byte-identity + 50 live runtime EVP + 50 SQL), live proof exec 6453 `acceptance_signals:['evidence_validated']` row `7bd7a188-…`, combined V2-033+V2-034 = 330 direct checks (not 200/200, not 400+); lineage `67cb8545 → c2273980` for V2-033, versionId unchanged for V2-034.** Canonical apply channel: autonomous agent-run local `n8n-patch` pack (V2-028, 2026-04-23). Workflow at `versionId=c2273980-fb36-420d-bab9-b9fc3edcb2d9`; 49 nodes / 67 connections; active=true. F6A-FOLLOWUP landed 2026-04-24 via V2-028 canonical agent-run `n8n-patch.mjs replace` (two new nodes `ME_Memory_Supersede_Embed` + `ME_Memory_Supersede_Embed_Merge` + 16th queryReplacement slot on `ME_Memory_Supersede_DB` + SQL CASE-guarded `$16::vector(1536)` on replacement-row INSERT + 4 connection edits; lineage `c07fe923 → 13e8e767`); 31/31 local PASS + 6/6 live E2E PASS + 8/8 DB invariants = 52/52 oracles; E1 replacement row `a0eea3bb` carries 1536-d embedding; E3 TOP-1 similarity 0.8089; retires SCOPE-OBS-1 from F6A; 2 observations classified (OBS-RECALL-UX-PREEXISTING already tracked; OBS-ENVELOPE-INIT calibration not a defect); see V2-030 in decision ledger and `docs/architecture/memory/v2/f6a_followup_supersede_embed/F6A_FOLLOWUP_SUPERSEDE_EMBED_RECONCILIATION.md`. F6A landed 2026-04-23 via V2-028 canonical agent-run `n8n-patch.mjs replace` (two new nodes `ME_Memory_Store_Embed` + `ME_Memory_Store_Embed_Merge` + 14th queryReplacement slot on `ME_Memory_Store_DB` + SQL CASE-guarded `$14::vector(1536)` + 4 connection edits; lineage `96962424 → c07fe923`); 41/41 local PASS + 28/28 live E2E PASS (69/69 oracles); DS-INV-1..10 all GREEN; DB-INV-1..7 all GREEN (101 pre-apply NULL-embedding rows unchanged — no backfill); 4 observations classified (OBS-E5 accept, OBS-E6.5 accept, SCOPE-OBS-1 → `F6A-FOLLOWUP-SUPERSEDE-EMBED`, DOC-DRIFT-1 corrected); see V2-029 in decision ledger and `docs/architecture/memory/v2/f6a/F6A_RECONCILIATION.md`. V2-OBS-RA-AGGREGATION-DOMAIN-WRITE-GATE landed 2026-04-22 via operator-run CLI (single-field JS patch on `ME_Build_RA_Envelope.parameters.jsCode` success branch — `domain_writes_performed: !!src.domain_writes_performed` → `domain_writes_performed: false`; lineage `279a8628 → 96962424`); 50/50 local PASS + 50/50 live E2E PASS across 10 families with writeful DB side-effects; see V2-027 in decision ledger and `docs/architecture/memory/v2/v2_obs_ra_aggregation_domain_write_gate/V2_OBS_RA_AGGREGATION_DOMAIN_WRITE_GATE_FINAL_STATUS.md`. V2-014 landed 2026-04-22 via operator-run CLI (single-field SQL patch on `ME_Memory_Promote_DB.parameters.query`; lineage `b8e2f194 → 279a8628`); primary proof f31-promote-012 PASS at exec 3881, safety reruns PASS at execs 3883 + 3892. F5 landed 2026-04-21 at `versionId=b8e2f194-…` via new channel (Postgres direct UPDATE / D-M-014 / V2-023 / V2-024) with byte-identical Prep-jsCode to F5 payloads, zero structural drift on 43 non-Prep nodes, smoke 7/7 PASS, DB invariant held. F3.1 walker/sidecar mission CLOSED `SUCCESS` 2026-04-22T14:30Z (Stage C): all 150 cases executed against live WF-ME-01, 149 PASS, 1 FAIL `BAD_TEST_DEFINITION` for deferred V2-014 (now resolved), 0 RUNTIME_WORKFLOW_BUG; 11 fixes logged (F31-FIX-001..F31-FIX-011); 4 deferred follow-ups handed off — V2-014 CLOSED 2026-04-22T15:30Z, V2-OBS-RA-AGGREGATION-DOMAIN-WRITE-GATE CLOSED 2026-04-22, **V2-OBS-STORE-PREP-INPUT-PASSTHROUGH CLOSED 2026-04-24 (V2-031)**, V2-OBS-RECALL-SUMMARY-STRING remains open as cosmetic non-blocking. Anchors: `docs/architecture/memory/v2/f3_1/F31_STATE.json`, `docs/architecture/memory/v2/v2_014/V2_014_FINAL_STATUS.md`, `docs/architecture/memory/v2/v2_obs_ra_aggregation_domain_write_gate/V2_OBS_RA_AGGREGATION_DOMAIN_WRITE_GATE_FINAL_STATUS.md`, `docs/architecture/memory/v2/f6a/F6A_RECONCILIATION.md`. No production regression. Active frontier: **NONE**. Raw umbrella `F6` NOT opened; F6B/F6C/F6D/F6E NOT opened. Follow-up `F6A-FOLLOWUP-SUPERSEDE-EMBED` was opened under operator directive on 2026-04-24 and **CLOSED SUCCESS** the same day (V2-030); SCOPE-OBS-1 from F6A is retired and there is no outstanding F6A-followup awaiting operator directive.**
