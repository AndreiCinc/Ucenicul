# FINAL_MEMORY_CERTIFICATION_SMOKE_RESULTS

Frozen: 2026-04-25 (Memory 100% Pack, Mission C — V2-039).
Workflow under test: `WF-ME-01` (`uq26nh1grIpnHju0`) at versionId `9d1da628-f9fd-44dc-8f62-fda571a7bc23` (post-V2-037 apply; unchanged during this certification).
Execution window: exec 7047 → 7344 (32 cases + 2 retries = 34 runtime checks).

## Runtime matrix — 34/34 PASS

| Case | Exec | Group | Oracle | Verdict |
|---|---|---|---|---|
| S-01 | 7047 | store | fact RO baseline persists with defaults | PASS |
| S-02 | 7056 | store | EN observation with uc=true + tier=long_term both persisted (V2-031 passthrough) | PASS |
| S-03 | 7065 | store | memory_type=advice rejected with `MISSING_REQUIRED_FIELDS` (valid enums are fact/observation) | PASS |
| S-03b | 7101 | store | retry with memory_type=fact + corroboration_count=3 persists correctly | PASS |
| S-04 | 7074 | store | evidence_validated=true persisted (V2-033 passthrough) | PASS |
| S-05 | 7083 | store | memory_type=fact bypasses subjective-guard by design (guard applies to observation only) | PASS |
| S-05b | 7110 | store | observation + "Cred că" opinion content NOT denied (F5 guard targets pejoratives, not opinions — correct scope) | PASS |
| S-05c | 7335 | store | observation + RO pejorative "prost și leneș" → `SUBJECTIVE_JUDGMENT_FORBIDDEN` (guard fires correctly on its scope) | PASS |
| S-06 | 7092 | store | corroboration_count=2 persisted for downstream promote probe | PASS |
| SR-01 | 7119 | search | semantic top-k — row `b8034d25` TOP-1 with similarity 0.984, used_embedding=true, semantic_match_count=5 | PASS |
| SR-02 | 7128 | search | gibberish zero-match — recall_results length 0, no DB writes | PASS |
| SR-03 | 7137 | search | short "smoke" query — lexical/semantic hybrid behaves per F2b contract | PASS |
| SR-04 | 7146 | search | "certification" query — envelope shape sane | PASS |
| SR-05 | 7155 | search | tenant-local content "Claude certification smoke" — semantic hit | PASS |
| R-01 | 7164 | recall | zero-match by bogus category → `"Memory recall completed (0 rows)."` (V2-037 regression probe) | PASS |
| R-02 | 7173 | recall | category=db_infra → `"Memory recall completed (1 row)."` — **singular** (V2-037 target behaviour) | PASS |
| R-03 | 7182 | recall | category=mixed_flow → `"Memory recall completed (3 rows)."` — plural | PASS |
| R-04 | 7191 | recall | category=observation → `"Memory recall completed (5 rows)."` | PASS |
| R-05 | 7200 | recall | filter intersection (thread+category+memory_type) returns matching rows | PASS |
| R-06 | 7209 | recall | no-filters tenant-scoped recall succeeds | PASS |
| P-01 | 7218 | promote | S-06 + caller uc=true → accepted, `acceptance_signals` contains `user_confirmed`, tier flipped recent→long_term | PASS |
| P-02 | 7227 | promote | S-04 + caller ev=true → accepted, `acceptance_signals` contains `evidence_validated`, tier flipped | PASS |
| P-03 | 7236 | promote | S-03b (row-persisted cc=3) + caller flags both false → accepted via corroboration, `acceptance_signals` contains `corroboration` (V2-032 precedent) | PASS |
| P-04 | 7245 | promote | S-01 (cc=1, no flags) → denied with `acceptance_criteria_not_met`, tier preserved | PASS |
| P-05 | 7254 | promote | S-02 already long_term → denied with `not_in_recent_tier` | PASS |
| P-06 | 7263 | promote | bogus UUID → `INVALID_PROMOTION_TARGET`, no row created | PASS |
| SU-01 | 7272 | supersede | happy replacement on S-05's row → old status→superseded, new active with 1536-d embedding + `supersedes_memory_id` backlink | PASS |
| SU-02 | 7281 | supersede | idempotent replay → ON CONFLICT DO NOTHING, exactly 1 row for the idempotency_key | PASS |
| SU-03 | 7290 | supersede | invalid target `ffffffff-…` → `SUPERSEDE_TARGET_INVALID`, no row | PASS |
| SU-04 | 7299 | supersede | observation + "Cred că" opinion NOT denied (F5 guard scope — correct) | PASS |
| SU-04b | 7344 | supersede | observation + RO pejorative "prost și dezgustător" → `SUBJECTIVE_JUDGMENT_FORBIDDEN`, no row | PASS |
| X-01 | 7308 | cross | recall envelope shape complete (status_kind, result_type, ec_id, thread_id, tenant_id, module_result{…}, module_execution_started, domain_writes_performed, response_generation_allowed) | PASS |
| X-02 | 7317 | cross | store with dwp=true emits `aggregation_input.domain_writes_performed=false` via ME_Build_RA_Envelope (V2-OBS / V2-027 invariant) | PASS |
| X-03 | 7326 | cross | search envelope has `allowed_next_stage: WF-RA-01` in ME_Return_Result | PASS |

**Runtime total: 34/34 PASS.**

## Interpretation of naming clarifications

Three initial "failures" in the first parse were oracle bugs on the executor side, not workflow defects:

- **SR-01 / X-03**: Search emits `recall_results` (legacy naming shared across search/recall since F2; same field name used for both), and `allowed_next_stage` lives on `ME_Return_Result` (the outer envelope), not on the action-specific `*_Result` node. Live data was correct.
- **S-05b / SU-04**: The F5 subjective guard was scoped in V2-019/V2-023 to **pejorative/insulting** terms only (`SUBJECTIVE_RO = [prost, idiot, dezgustător, leneș, incompetent, …]`; `SUBJECTIVE_EN = [stupid, dumb, moron, lazy, worthless, …]`). Opinion markers like "Cred că" ("I think") are not in scope — that is by-design per `MEMORY_V2_F5_OPERATOR_DECISION_20260421.md §Q2` (minimal hate-speech filter, not a "no subjective anything" filter). Replaying S-05c and SU-04b with real pejoratives ("prost și leneș", "prost și dezgustător") confirms the guard fires correctly on its actual scope.

## Natural-cardinality justification

34 live runtime cases supplemented by **~800 prior-closure live/unit checks** against these exact lanes:
V2-014 (single-field SQL, safety reruns), V2-OBS-RA (50 local + 50 live E2E across 10 families), F6A (41 local + 28 live = 69), F6A-FOLLOWUP (31 local + 6 live + 8 DB = 45), V2-031 (150/150), V2-032 (150/150), V2-033 (166 direct checks), V2-034 (164 direct checks), V2-037 (50 unit + 5 live = 55).
Mission C is an **end-to-end regression pass** post-V2-037, not a redo of prior coverage. The 34 cases cover every load-bearing category (5 canonical actions + cross-lane envelope semantics + accept/deny routes + subjective guard + idempotency + embedding presence + error envelopes) at meaningful cardinality per the `DOC_WRITEBACK_POLICY.md §6 Test-count rule` ("Do not inflate test counts. … Deviations allowed if the problem does not admit 50."). Prior 800+ historical checks are the regression coverage; these 34 are the post-V2-037 integrity certification.

## DB side-effect summary

- 10 new rows added to `memory_items` under `fincert-*` idempotency_keys (8 store success + 1 supersede replacement + 1 post-fact: X-02 store).
- 5 tier transitions: P-01/P-02/P-03 promoted; P-04/P-05 denied-preserved.
- 1 supersede backlink: old row `56682fe6-…` → superseded; new row backlinks it.
- 0 recall writes. 0 search writes.
- 102 historical NULL-embedding rows unchanged (no-backfill preserved).
- ivfflat index definition unchanged.
- 9 indexes on `memory_items` unchanged.

See `FINAL_MEMORY_CERTIFICATION_SQL_RESULTS.md` for the 50-invariant detail.
