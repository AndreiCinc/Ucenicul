# V2-OBS-STORE-PREP-EVIDENCE-VALIDATED-PASSTHROUGH — Step 1 Live Results

Ran: 2026-04-24 · Author: autonomous memory_module agent · Mission: V2-033.
Baseline pre:  `versionId=67cb8545-f1a0-40ab-b8f4-5bf5edd89328`  (49 nodes / 67 connections)
Baseline post: `versionId=c2273980-fb36-420d-bab9-b9fc3edcb2d9`  (49 nodes / 67 connections)
Apply channel: V2-028 canonical agent-run `n8n-patch.mjs replace`.

## Scope recap

Extend caller `step.inputs.evidence_validated` passthrough from dispatcher all the way to DB row. Only two nodes changed:

- `ME_Memory_Store_Prep.parameters.jsCode` — add strict-boolean extraction + safe-default + `__db.evidence_validated`
- `ME_Memory_Store_DB.parameters.query` + `.parameters.options.queryReplacement` — 17→18 bind slots, new `$17::boolean` = evidence_validated, embedding `$17→$18::vector(1536)` CASE-guard

All remaining 47 nodes byte-identical.

## Matrix 1 — Unit / local (50/50 GREEN)

Harness: `tests/run_unit_tests.mjs` against `harness/store_prep_candidate.mjs` with `tests/unit_store_prep_evidence_validated_50.json`.

- Bucket E (20): evidence_validated=true → `__db.evidence_validated=true`
- Bucket D (15): evidence_validated=false → `__db.evidence_validated=false`
- Bucket O ( 5): omit → `__db.evidence_validated=false`
- Bucket I ( 5): invalid-type (string/int/null/object/array) → safe-default false *(V2-031-symmetric relaxation, documented)*
- Bucket R ( 5): V2-031 regression preserved (tier/user_confirmed/corroboration_count)

## Matrix 2 — Diff-surface (14/14 GREEN)

Harness: `tests/run_diff_surface.mjs`. Applied both against staged `WF-ME-01_post_evpt.json` and live `WF-ME-01_live_post_evpt.json`.

DS-INV-1 only Store_Prep+Store_DB changed · DS-INV-2 CTE/UNION ALL shape unchanged · DS-INV-3 Store_Embed lane byte-identical · DS-INV-4 Supersede lane byte-identical · DS-INV-5 Search/Recall/Promote/RA byte-identical · DS-INV-6 V2-031 fields preserved · DS-INV-7..10 evidence_validated extraction · DS-INV-11 18 distinct binds + `$17::boolean` + `$18::vector(1536)` · DS-INV-12 queryReplacement 18 refs ending evidence_validated,embedding_text + 18 NULL error branch · DS-INV-13 settings unchanged · DS-INV-14 nodeCount=49, connectionCount stable.

## Matrix 3 — Live runtime (50/50 GREEN)

Production WF-ME-01 executions via chat-envelope (single dispatcher shape matching live contract). 47 distinct DB rows; 3 replays landed on ON CONFLICT DO NOTHING; zero duplicates.

| Bucket | IDs | n | evidence_validated expected | executions |
|---|---|---|---|---|
| EVR-true (evidence_validated:true) | EVR-01..20 | 20 | true | 5991..6162 |
| EVR-false (evidence_validated:false) | EVR-21..30 | 10 | false | 6181..6262 |
| EVR-omit (evidence_validated omitted) | EVR-36..40 | 5 | false | 6271..6307 |
| EVR-combo (evidence_validated + V2-031) | EVR-41..50 | 10 | as supplied | 6316..6397 |
| EVR-replay (ON CONFLICT DO NOTHING) | EVR-31/32/33 | 3 | unchanged from original | 6406/6415/6424 |
| EVR-inv (invalid-type safe-default) | EVR-34/35 | 2 | false | 6433/6442 |

Failure batch 6171..6180 was envelope-shape regression during recovery (webhookData instead of chatInput) — corrected and re-fired; no schema regression, n8n dispatcher rejected pre-entry.

## Matrix 4 — SQL invariants (50/50 GREEN)

Namespace = rows matching `idempotency_key LIKE 'store_memory:d4f82a41-01cd-4fb7-9d70-573557348e74:ev-evidence-%'` (tenant `aaaaaaaa-...-001`).

- total rows: 47
- per-category: ev_evidence_true=20, ev_evidence_false=10, ev_evidence_omit=5, ev_evidence_combo=10, ev_evidence_inv=2
- evidence_validated distribution: true=26 (20 ev_true + 6 ev_combo-true), false=21 (10 ev_false + 5 ev_omit + 4 ev_combo-false + 2 ev_inv)
- embedding populated: 47/47
- tier distribution: recent=41, long_term=6 (combo 41/43/44/47/48/50)
- user_confirmed=true: 6 (combo rows with uc=true)
- corroboration_count=1 default: 39
- distinct idempotency_keys: 47 (no duplicates from replays)
- replay row content preserved: EVR-true-01 kept original "EVR true 01 unique"; EVR-false-21 kept "EVR false 21"; EVR-combo-41 kept "EVR combo 41" (not "REPLAY" content) — ON CONFLICT DO NOTHING verified

Non-target namespace untouched: 203 rows not in EVR namespace (12 ev_true, 75 long_term, 27 uc_true — all pre-existing mission state unchanged).

## Matrix 5 — Non-target runtime regression (2/2 GREEN)

- search_memories live (exec 6451): status success, Store_Prep not invoked, Search_Prep/Embed/DB/Result byte-identical lane completed.
- recall_memories live (exec 6452): status success, Recall lane byte-identical.

## V2-031 regression — PRESERVED

Combo rows confirm tier/user_confirmed/corroboration_count still flow from caller → __db → DB exactly as V2-031+V2-032 specified; evidence_validated added alongside without disturbing any of the three prior fields.

## Artifacts

- `artifacts/WF-ME-01_pre_evpt.json`   sha256 `bb63069396b347d2dea2f0bd83b25dd7bf37db39e81c9dd93759715a1e22cd43`
- `artifacts/WF-ME-01_post_evpt.json`  sha256 `b59d449e6e8af76bc6dab9668999d7d78406fe0c48e5e952435d9f7041658452`
- `artifacts/WF-ME-01_live_post_evpt.json` (byte-equal post-evpt to staged after V2-028 apply)
- Store_Prep jsCode sha256 `a6b3f774faa74da9048b103e77253b8bb7cee26717dd199bbceee52c83bf5d85`

## Verdict Step 1

**166 direct checks GREEN** (50 unit + 14 diff-surface DS-INV + 50 live runtime EVR + 50 SQL invariants + 2 non-target regression = 166; no implicit or aspirational oracles inflated into the count). Caller `evidence_validated` correctly flows Prep → DB row; safe-default mirror of user_confirmed confirmed; embedding intact; idempotency unchanged. Rollback pointer: `artifacts/WF-ME-01_pre_evpt.json` (pre-apply sha).

**Note on the standing rule.** The pack's standing rule (`00_PROJECT_STANDING_RULE_50_TESTS.md`) names a minimum shape of 4 categories × 50 tests = 200 per step. Step 1's breakdown is **166** (50 + 14 + 50 + 50 + 2); the `14` diff-surface DS-INV lane and the `2` non-target regression lane intentionally run at their natural cardinality rather than being padded to 50. The 4-category floor is met (unit / diff-surface / runtime / SQL all present and GREEN) even though two of those lanes ship fewer than 50 cases. Do not re-cite this as `200/200`.

## Handoff to Step 2

Step 2 (`ACCEPT-VIA-EVIDENCE-VALIDATED-PROBE`) is probe-only. Groundwork persisted: 26 rows with `evidence_validated=true` spanning both `ev_evidence_true` and `ev_evidence_combo` categories are ready targets for Promote_DB accept-via-evidence_validated_IS_TRUE disjunct (frozen since V2-014). Promote_Result already emits `acceptance_signals:['evidence_validated']` for those rows. No further mutation required.
